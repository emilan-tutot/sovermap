// Speed of pages (cahier §8.9, DESIGN.md §13): Pixel 7 profile, « Fast 4G », processor × 4, cold cache, median of
// 5 runs. LCP, CLS, INP (taps on the elements given by --toucher, in that order; without them, INP is not measured),
// the JavaScript transferred before and after the load event; then the JavaScript of each page (one load, unthrottled).
//   npx tsx scripts/design/vitesse.ts <chemin>... [--toucher <sélecteur>]... [--attente 9000] [--passages 5]
import { chromium, devices } from "@playwright/test";
import { adresse, ecrireMesures, option, positionnels, valeursOption } from "./commun";

const PAGES = positionnels().length > 0 ? positionnels() : ["/"];
const TOUCHERS = valeursOption("toucher");
// The 3D loads after the first display: the taps come once it is there.
const ATTENTE = Number(option("attente") ?? 9000);
const PASSAGES = Number(option("passages") ?? 5);
// The « Fast 4G » preset of Chrome DevTools: 9 Mbit/s down, 1.5 Mbit/s up (both × 0.9), 60 ms × 2.75 of latency.
const FAST_4G = { offline: false, latency: 60 * 2.75, downloadThroughput: ((9 * 1000 * 1000) / 8) * 0.9, uploadThroughput: ((1.5 * 1000 * 1000) / 8) * 0.9 };
const mediane = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] ?? 0;

type Passage = { lcp: number; lcpElement: string; cls: number; inp: number; jsAvant: number; jsApres: number };
const navigateur = await chromium.launch({ channel: "msedge" });
const sortie: Record<string, { passages: Passage[]; median: { lcp: number; cls: number; inp: number | null; jsAvant: number; jsApres: number } }> = {};

for (const chemin of PAGES) {
  const passages: Passage[] = [];
  for (let i = 0; i < PASSAGES; i += 1) {
    const ctx = await navigateur.newContext({ ...devices["Pixel 7"] });
    await ctx.addInitScript(() => {
      const v = { lcp: 0, lcpElement: "", cls: 0, inp: 0 };
      (window as unknown as { __vitesse: typeof v }).__vitesse = v;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as (PerformanceEntry & { element?: Element; url?: string })[]) {
          v.lcp = e.startTime;
          v.lcpElement = e.element ? `${e.element.tagName.toLowerCase()}.${(e.element.className || "").toString().split(" ")[0]}` : (e.url ?? "");
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) v.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as (PerformanceEntry & { interactionId?: number; duration: number })[]) if (e.interactionId) v.inp = Math.max(v.inp, e.duration);
      }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", FAST_4G);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const scripts = new Map<string, { debut: number; octets: number }>();
    let chargement = Number.POSITIVE_INFINITY;
    cdp.on("Network.requestWillBeSent", (e) => {
      if (e.type === "Script") scripts.set(e.requestId, { debut: e.timestamp, octets: 0 });
    });
    cdp.on("Network.loadingFinished", (e) => {
      const s = scripts.get(e.requestId);
      if (s) s.octets = e.encodedDataLength;
    });
    await cdp.send("Page.enable");
    cdp.on("Page.loadEventFired", (e) => {
      chargement = e.timestamp;
    });
    await page.goto(adresse(chemin), { waitUntil: "load" });
    await page.waitForTimeout(ATTENTE);
    for (const selecteur of TOUCHERS) {
      const cible = page.locator(selecteur).first();
      await cible.scrollIntoViewIfNeeded();
      await cible.tap();
      await page.waitForTimeout(1000);
    }
    const v = await page.evaluate(() => (window as unknown as { __vitesse: Passage }).__vitesse);
    const liste = [...scripts.values()];
    passages.push({
      ...v,
      jsAvant: liste.filter((s) => s.debut <= chargement).reduce((n, s) => n + s.octets, 0),
      jsApres: liste.filter((s) => s.debut > chargement).reduce((n, s) => n + s.octets, 0),
    });
    console.log(`${chemin} passage ${i + 1} : LCP ${Math.round(v.lcp)} ms (${v.lcpElement}) ; CLS ${v.cls.toFixed(3)} ; INP ${TOUCHERS.length ? `${Math.round(v.inp)} ms` : "non mesuré"}`);
    await ctx.close();
  }
  const median = {
    lcp: Math.round(mediane(passages.map((p) => p.lcp))),
    cls: Number(mediane(passages.map((p) => p.cls)).toFixed(3)),
    inp: TOUCHERS.length ? Math.round(mediane(passages.map((p) => p.inp))) : null,
    jsAvant: mediane(passages.map((p) => p.jsAvant)),
    jsApres: mediane(passages.map((p) => p.jsApres)),
  };
  sortie[chemin] = { passages, median };
  console.log(`${chemin} MÉDIANE : LCP ${median.lcp} ms ; CLS ${median.cls} ; INP ${median.inp ?? "non mesuré"} ; JavaScript ${Math.round(median.jsAvant / 1024)} Ko avant le chargement, ${Math.round(median.jsApres / 1024)} Ko après`);
}

// JavaScript of each page (one load each, no throttling).
const poids: Record<string, number> = {};
for (const chemin of PAGES) {
  const ctx = await navigateur.newContext({ viewport: { width: 1707, height: 799 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  const ids = new Set<string>();
  let total = 0;
  cdp.on("Network.requestWillBeSent", (e) => {
    if (e.type === "Script") ids.add(e.requestId);
  });
  cdp.on("Network.loadingFinished", (e) => {
    if (ids.has(e.requestId)) total += e.encodedDataLength;
  });
  await page.goto(adresse(chemin), { waitUntil: "load" });
  await page.waitForTimeout(5000);
  poids[chemin] = total;
  await ctx.close();
}
console.log(`JavaScript transféré par page (compressé) : ${Object.entries(poids).map(([c, o]) => `${c} ${Math.round(o / 1024)} Ko`).join(" ; ")}`);
await navigateur.close();
ecrireMesures("vitesse.json", { conditions: { profil: "Pixel 7", reseau: FAST_4G, cpu: 4, cache: "froid", passages: PASSAGES, touchers: TOUCHERS }, resultats: sortie, poids });
