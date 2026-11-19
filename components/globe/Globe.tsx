"use client";

// The one 3D scene of the site (DESIGN.md §8): kept for the real Atlas, not shown in production during T1. Text and figure
// come first; the scene loads after the first paint and fades in; a static fallback shows the same scene.
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { JETONS } from "@/lib/design/tokens";
import { fr } from "@/lib/i18n/fr";
import type { Etiquette, Scene } from "./commun";
import { estMonde, type Fil } from "./geo";
import { nouvelleMemoire, placerEtiquettes, type Ancre, type Place, type Point } from "./etiquettes";
import placesRepli from "./repli-etiquettes.json";
import "./globe.css";

type Props = { fils: Fil[]; origine: Fil; choisi: string | null; onChoisir: (code: string) => void };

/** Where the labels of the static fallback go, in units of its image (0 to 1000): computed by scripts/design/replis.ts
 * with the same rule as the live scene. */
type PlaceRepli = { px: number; py: number; ax: number; ay: number; cote: "gauche" | "droite" };
const PLACES_REPLI = placesRepli as Record<string, PlaceRepli | undefined>;

/** Exposed for the measures (scripts/design): frame rate, pixel density, and the last placed labels and threads. */
type Mesure = { fps: number[]; dpr: number; pret: boolean; places?: Place[]; fils?: Point[][]; points?: Etiquette[] };
declare global {
  interface Window {
    __sovermap3d?: Mesure;
    /** Set by the filming script only: a steady quality, whatever the frame rate. */
    __sovermapQualiteFixe?: boolean;
  }
}

type Pointeur = { id: number; x: number; y: number; t: number; bouge: number; type: string; ignore: boolean };
type Pose = { el: HTMLSpanElement; filet: SVGLineElement | null; l: number; h: number };

const tailles = new WeakMap<HTMLElement, { l: number; h: number }>();
/**
 * What one scene keeps from frame to frame, never shared with another scene: the columns of labels (see etiquettes.ts),
 * and where each label is drawn, the place it aims at and what is left of its glide (a label slides, never jumps).
 */
type Suivi = {
  memoire: ReturnType<typeof nouvelleMemoire>;
  dessin: Map<string, { x: number; y: number; cibleX: number; cibleY: number; pointX: number; pointY: number; dx: number; dy: number }>;
};

/** From just outside the point to the nearest edge of its label, at the height of the point when it can. */
function ligne(px: number, py: number, x: number, y: number, l: number, h: number, cote: "gauche" | "droite") {
  const ax = cote === "gauche" ? x + l : x;
  const ay = Math.min(y + h - 3, Math.max(y + 3, py));
  const d = Math.hypot(ax - px, ay - py) || 1;
  return { x1: px + ((ax - px) / d) * 6, y1: py + ((ay - py) / d) * 6, x2: ax, y2: ay, d };
}

/** Places the labels (etiquettes.ts), then draws them: each follows its point, and glides when it changes place. */
function afficher(suivi: Suivi, sortie: Etiquette[], fils: Point[][], poses: Map<string, Pose>, largeur: number, hauteur: number, basLibre: number): Place[] {
  const { memoire, dessin } = suivi;
  const points = new Map(sortie.map((e) => [e.code, e]));
  const ancres: Ancre[] = [];
  for (const e of sortie) {
    const pose = poses.get(e.code);
    if (pose && e.visible) ancres.push({ code: e.code, x: e.x, y: e.y, l: pose.l, h: pose.h });
  }
  const places = placerEtiquettes(ancres, fils, largeur, hauteur, basLibre, memoire);
  const parCode = new Map(places.map((p) => [p.code, p]));
  // Where each label is drawn this frame: on its place, or on its way there.
  const traces: { code: string; pose: Pose; p: Place; e: Etiquette; x: number; y: number; glisse: boolean }[] = [];
  for (const [code, pose] of poses) {
    const p = parCode.get(code);
    const e = points.get(code);
    if (!p || !e) {
      pose.el.style.opacity = "0";
      if (pose.filet) pose.filet.style.opacity = "0";
      dessin.delete(code);
      continue;
    }
    const avant = dessin.get(code);
    // A jump of its place (not the slow move of its point) starts a glide from where the label was drawn.
    const saut = avant !== undefined && Math.hypot(p.x - avant.cibleX - (e.x - avant.pointX), p.y - avant.cibleY - (e.y - avant.pointY)) > 8;
    let dx = avant ? (saut ? avant.x - p.x : avant.dx * 0.75) : 0;
    let dy = avant ? (saut ? avant.y - p.y : avant.dy * 0.75) : 0;
    if (Math.abs(dx) < 0.3) dx = 0;
    if (Math.abs(dy) < 0.3) dy = 0;
    const x = p.x + dx;
    const y = p.y + dy;
    dessin.set(code, { x, y, cibleX: p.x, cibleY: p.y, pointX: e.x, pointY: e.y, dx, dy });
    traces.push({ code, pose, p, e, x, y, glisse: dx !== 0 || dy !== 0 });
  }
  // A gliding label that would pass over another one is hidden until its way is clear: no two labels ever overlap.
  const cache = new Set<string>();
  for (const a of traces)
    for (const b of traces) {
      if (a === b || !a.glisse) continue;
      if (a.x < b.x + b.p.l + 2 && b.x < a.x + a.p.l + 2 && a.y < b.y + b.p.h + 2 && b.y < a.y + a.p.h + 2) cache.add(a.code);
    }
  for (const { code, pose, p, e, x, y } of traces) {
    const masque = cache.has(code);
    pose.el.style.transition = masque ? "none" : "";
    pose.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    pose.el.style.opacity = masque ? "0" : "1";
    if (pose.filet) {
      const s = ligne(e.x, e.y, x, y, p.l, p.h, p.cote);
      pose.filet.setAttribute("x1", s.x1.toFixed(1));
      pose.filet.setAttribute("y1", s.y1.toFixed(1));
      pose.filet.setAttribute("x2", s.x2.toFixed(1));
      pose.filet.setAttribute("y2", s.y2.toFixed(1));
      pose.filet.style.transition = masque ? "none" : "";
      pose.filet.style.opacity = !masque && s.d > 10 ? "1" : "0";
    }
  }
  return places;
}

/** The one 3D scene of the site: after the first paint, paused off screen, never a trap for scrolling on a phone. */
export function Globe({ fils, origine, choisi, onChoisir }: Props) {
  const boite = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene | null>(null);
  const pointeur = useRef<Pointeur | null>(null);
  const [etat, setEtat] = useState<"attente" | "pret" | "repli">("attente");
  const [tactile, setTactile] = useState(false);
  const [actif, setActif] = useState(false);
  const actifRef = useRef(false);
  const choisirRef = useRef(onChoisir);
  useEffect(() => {
    actifRef.current = actif;
    choisirRef.current = onChoisir;
  });
  // The countries a click may choose: those of the threads shown, recomputed when the threads change.
  const codes = useMemo(() => new Set([origine.code, ...fils.map((f) => f.code)]), [origine.code, fils]);

  useEffect(() => {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    const economie = nav.connection?.saveData === true;
    const faible = (nav.hardwareConcurrency || 8) <= 2 || (nav.deviceMemory ?? 8) <= 2;
    let webgl = false;
    try {
      webgl = document.createElement("canvas").getContext("webgl2") !== null;
    } catch {
      webgl = false;
    }
    let annule = false;
    let nettoyer = () => {};
    const id = window.setTimeout(() => {
      if (reduit || economie || faible || !webgl) {
        setEtat("repli");
        return;
      }
      setTactile(window.matchMedia("(pointer: coarse)").matches);
      void demarrer().catch(() => setEtat("repli"));
    }, 0);

    async function demarrer() {
      // After the first paint and the load of the page, when the main thread is free.
      await new Promise<void>((fin) => (document.readyState === "complete" ? fin() : window.addEventListener("load", () => fin(), { once: true })));
      await new Promise<void>((fin) => {
        if ("requestIdleCallback" in window) window.requestIdleCallback(() => fin(), { timeout: 1200 });
        else setTimeout(fin, 120);
      });
      // The map is checked when it arrives: a missing or malformed file shows the static fallback, never a broken globe.
      const carte = async () => {
        const r = await fetch("/globe/monde.json");
        const donnees: unknown = r.ok ? await r.json() : null;
        if (!estMonde(donnees)) throw new Error("monde.json");
        return donnees;
      };
      const [module, monde] = await Promise.all([import("./scene"), carte()]);
      const suivi: Suivi = { memoire: nouvelleMemoire(), dessin: new Map() };
      const canvas = toile.current;
      const conteneur = boite.current;
      if (annule || !canvas || !conteneur) return;
      const s = module.creer({ canvas, monde, fils, origine, jetons: JETONS, reduit: false });
      scene.current = s;
      const plafond = Math.min(2, window.devicePixelRatio || 1);
      let dpr = plafond;
      const mesure: Mesure = { fps: [], dpr, pret: false };
      window.__sovermap3d = mesure;
      const redimensionner = () => s.taille(conteneur.clientWidth, conteneur.clientHeight, dpr);
      redimensionner();
      const ro = new ResizeObserver(redimensionner);
      ro.observe(conteneur);
      let visible = true;
      let image = 0;
      let t0 = -1;
      let avant = 0;
      let compte = 0;
      let duree = 0;
      const sortie: Etiquette[] = [];
      const filsEcran: Point[][] = [];
      // The labels are HTML over the canvas (readable, never baked into a texture), found once they are rendered.
      let poses = new Map<string, Pose>();
      const boucle = (ms: number) => {
        image = 0;
        if (!visible || document.hidden) return;
        const t = ms / 1000;
        if (t0 < 0) {
          t0 = t;
          avant = t;
        }
        const dt = Math.min(0.1, t - avant);
        avant = t;
        s.dessiner(t - t0, dt);
        s.etiquettes(conteneur.clientWidth, conteneur.clientHeight, sortie, filsEcran);
        if (poses.size === 0) {
          poses = new Map(
            [...conteneur.querySelectorAll<HTMLSpanElement>(".etiquette-pays")].map((el) => {
              const code = el.dataset["code"] ?? "";
              const taille = tailles.get(el) ?? { l: el.offsetWidth, h: el.offsetHeight };
              if (taille.l > 0) tailles.set(el, taille);
              return [code, { el, filet: conteneur.querySelector<SVGLineElement>(`line[data-code="${code}"]`), l: taille.l, h: taille.h }];
            }),
          );
        }
        // The band at the bottom of the scene belongs to the buttons.
        mesure.places = afficher(suivi, sortie, filsEcran, poses, conteneur.clientWidth, conteneur.clientHeight, 56);
        mesure.fils = filsEcran;
        mesure.points = sortie;
        compte += 1;
        duree += dt;
        if (duree >= 1) {
          const fps = compte / duree;
          mesure.fps.push(Math.round(fps));
          if (mesure.fps.length > 300) mesure.fps.shift();
          // Quality follows the frame rate: fewer pixels when it drops, back up when it is comfortable.
          if (!window.__sovermapQualiteFixe) {
            if (fps < 45 && dpr > 1) {
              dpr = Math.max(1, dpr - 0.25);
              redimensionner();
            } else if (fps > 58 && dpr < plafond) {
              dpr = Math.min(plafond, dpr + 0.25);
              redimensionner();
            }
          }
          mesure.dpr = dpr;
          compte = 0;
          duree = 0;
        }
        image = requestAnimationFrame(boucle);
      };
      const relancer = () => {
        if (!image && visible && !document.hidden) {
          avant = performance.now() / 1000;
          image = requestAnimationFrame(boucle);
        }
      };
      const io = new IntersectionObserver(
        ([entree]) => {
          visible = entree?.isIntersecting ?? true;
          relancer();
        },
        { threshold: 0.01 },
      );
      io.observe(conteneur);
      document.addEventListener("visibilitychange", relancer);
      relancer();
      canvas.dataset.pret = "oui";
      mesure.pret = true;
      setEtat("pret");
      nettoyer = () => {
        ro.disconnect();
        io.disconnect();
        document.removeEventListener("visibilitychange", relancer);
        cancelAnimationFrame(image);
        s.liberer();
        scene.current = null;
      };
    }

    return () => {
      annule = true;
      window.clearTimeout(id);
      nettoyer();
    };
  }, [fils, origine]);

  useEffect(() => {
    if (choisi) scene.current?.centrer(choisi);
  }, [choisi]);

  const position = (e: ReactPointerEvent) => {
    const r = boite.current?.getBoundingClientRect();
    if (!r) return { nx: 0, ny: 0 };
    return { nx: ((e.clientX - r.left) / r.width) * 2 - 1, ny: -(((e.clientY - r.top) / r.height) * 2 - 1) };
  };
  const surAppui = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    // A touch that starts at the very edge of the screen belongs to the « back » gesture of the system.
    const bord = e.pointerType === "touch" && (e.clientX < 24 || e.clientX > window.innerWidth - 24);
    pointeur.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), bouge: 0, type: e.pointerType, ignore: bord };
    if (bord) return;
    if (e.pointerType !== "touch" || actifRef.current) {
      e.currentTarget.setPointerCapture(e.pointerId);
      scene.current?.calme();
    }
  };
  const surMouvement = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = pointeur.current;
    if (!p) {
      if (e.pointerType === "mouse") {
        const { nx, ny } = position(e);
        scene.current?.survoler(nx, ny);
      }
      return;
    }
    if (p.ignore || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.bouge += Math.abs(dx) + Math.abs(dy);
    p.x = e.clientX;
    p.y = e.clientY;
    if (p.type === "touch" && !actifRef.current) return;
    scene.current?.glisser(dx, dy);
  };
  const surRelache = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = pointeur.current;
    pointeur.current = null;
    if (!p || p.ignore) return;
    scene.current?.lacher();
    if (p.bouge < 8 && performance.now() - p.t < 600) {
      const { nx, ny } = position(e);
      const code = scene.current?.choisir(nx, ny) ?? null;
      if (code && codes.has(code)) choisirRef.current(code);
      if (p.type === "touch" && !actifRef.current) setActif(true);
    }
  };
  const surAnnulation = () => {
    pointeur.current = null;
    scene.current?.lacher();
  };

  const tous = [origine, ...fils];
  return (
    <>
      <div ref={boite} className="scene" data-actif={actif ? "oui" : "non"}>
        <p className="cache">{fr.globe.descriptionScene}</p>
        {etat === "repli" ? (
          <div className="repli-cadre">
            {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG of the same scene, served as is */}
            <img className="scene-repli" src="/globe/repli.svg" alt="" width={1000} height={1000} />
            <svg className="filets" viewBox="0 0 1000 1000" aria-hidden="true">
              {tous.map((f) => {
                const p = PLACES_REPLI[f.code];
                if (!p) return null;
                const d = Math.hypot(p.ax - p.px, p.ay - p.py) || 1;
                return <line key={f.code} x1={p.px + ((p.ax - p.px) / d) * 17} y1={p.py + ((p.ay - p.py) / d) * 17} x2={p.ax} y2={p.ay} />;
              })}
            </svg>
            <div className="etiquettes" aria-hidden="true">
              {tous.map((f) => {
                const p = PLACES_REPLI[f.code];
                return p ? (
                  <span key={f.code} className="etiquette-pays etiquette-repli" data-cote={p.cote} data-hors-ue={f.horsUE ? "oui" : "non"} style={{ left: `${p.ax / 10}%`, top: `${p.ay / 10}%` }}>
                    {f.nom}&nbsp;· <b>{f.sites}</b>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        ) : (
          <>
            {etat === "attente" ? <p className="scene-attente">{fr.globe.chargement}</p> : null}
            <canvas
              ref={toile}
              aria-hidden="true"
              onPointerDown={surAppui}
              onPointerMove={surMouvement}
              onPointerUp={surRelache}
              onPointerCancel={surAnnulation}
            />
            <svg className="filets" aria-hidden="true">
              {etat === "pret" ? tous.map((f) => <line key={f.code} data-code={f.code} style={{ opacity: 0 }} />) : null}
            </svg>
            <div className="etiquettes" aria-hidden="true">
              {etat === "pret"
                ? tous.map((f) => (
                    <span key={f.code} className="etiquette-pays" style={{ opacity: 0 }} data-code={f.code} data-hors-ue={f.horsUE ? "oui" : "non"}>
                      {f.nom}&nbsp;· <b>{f.sites}</b>
                    </span>
                  ))
                : null}
            </div>
          </>
        )}
        {etat === "pret" ? (
          <div className="scene-outils">
            {tactile ? (
              <button type="button" className="bouton bouton-explorer" aria-pressed={actif} onClick={() => setActif((a) => !a)}>
                {actif ? fr.globe.terminer : fr.globe.explorer}
              </button>
            ) : null}
            <button type="button" className="bouton" onClick={() => scene.current?.recentrer()}>
              {fr.globe.recentrer}
            </button>
          </div>
        ) : null}
      </div>
      {etat === "repli" ? <p className="scene-aide">{fr.globe.repli}</p> : null}
      {etat === "pret" && tactile && actif ? <p className="scene-aide">{fr.globe.aideTactile}</p> : null}
    </>
  );
}
