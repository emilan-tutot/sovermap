// Tests of the polite downloader: robots.txt read first and obeyed (RFC 9309), one second between two requests to a
// host, five redirects at most, https only. A fake fetch and a fake clock: no network. Hosts under `.example`.
import { describe, expect, it } from "vitest";
import { agentUtilisateur, autorise, correspond, lireRobots, RefusRobots, Telechargeur } from "./sources";

describe("robots.txt (RFC 9309)", () => {
  it("matches prefixes, wildcards and the end anchor", () => {
    expect(correspond("/fish", "/fish.html")).toBe(true);
    expect(correspond("/fish", "/Fish.asp")).toBe(false);
    expect(correspond("/*.php", "/folder/filename.php?parameters")).toBe(true);
    expect(correspond("/*.php$", "/filename.php")).toBe(true);
    expect(correspond("/*.php$", "/filename.php?parameters")).toBe(false);
    expect(correspond("/fish*.php", "/fishheads/catfish.php?parameters")).toBe(true);
    expect(correspond("/*/raw", "/groupe/projet/raw")).toBe(true);
  });

  it("never takes long on a crafted rule", () => {
    const regle = `/${"a*".repeat(200)}b`;
    const chemin = `/${"a".repeat(5_000)}`;
    const debut = performance.now();
    expect(correspond(regle, chemin)).toBe(false);
    expect(performance.now() - debut).toBeLessThan(1_000);
  });

  it("applies the group of our agent, else « * », the longest rule winning and « allow » on a tie", () => {
    const robots = lireRobots(
      ["User-agent: *", "Disallow: /api/", "Allow: /api/public", "", "User-agent: autre-robot", "Disallow: /"].join(
        "\n",
      ),
    );
    expect(autorise(robots, "/api/prive")).toBe(false);
    expect(autorise(robots, "/api/public/liste")).toBe(true);
    expect(autorise(robots, "/donnees.zip")).toBe(true);
    const pourNous = lireRobots("User-agent: Sovermap-bot\nDisallow: /\n\nUser-agent: *\nAllow: /\n");
    expect(autorise(pourNous, "/x")).toBe(false);
  });
});

type Appel = { url: string; agent: string | null; quand: number };

function faux(reponses: Record<string, { status: number; corps?: string; location?: string }>) {
  const appels: Appel[] = [];
  let horloge = 0;
  const fetchFaux = (async (entree: string | URL | Request, init?: RequestInit) => {
    const url = entree.toString();
    const entetes = new Headers(init?.headers);
    appels.push({ url, agent: entetes.get("user-agent"), quand: horloge });
    const r = reponses[url] ?? { status: 404 };
    const headers = new Headers(r.location ? { location: r.location } : {});
    return new Response(r.status >= 300 && r.status < 400 ? null : (r.corps ?? ""), { status: r.status, headers });
  }) as typeof fetch;
  const dormir = async (ms: number) => {
    horloge += ms;
  };
  const vraieDate = Date.now;
  return {
    appels,
    telechargeur: () => {
      Date.now = () => horloge;
      return new Telechargeur({
        agent: agentUtilisateur("1"),
        fetch: fetchFaux,
        dormir,
      });
    },
    retablir: () => {
      Date.now = vraieDate;
    },
  };
}

describe("the polite downloader", () => {
  it("reads robots.txt first, then waits one second before the file, with its user agent", async () => {
    const f = faux({
      "https://donnees.example/robots.txt": { status: 200, corps: "User-agent: *\nDisallow: /prive/\n" },
      "https://donnees.example/fichier.csv": { status: 200, corps: "a,b\n" },
    });
    try {
      const t = f.telechargeur();
      const r = await t.obtenir("https://donnees.example/fichier.csv");
      expect(r.corps.toString()).toBe("a,b\n");
      expect(f.appels.map((a) => a.url)).toEqual([
        "https://donnees.example/robots.txt",
        "https://donnees.example/fichier.csv",
      ]);
      expect((f.appels[1]?.quand ?? 0) - (f.appels[0]?.quand ?? 0)).toBeGreaterThanOrEqual(1000);
      expect(f.appels.every((a) => a.agent?.startsWith("Sovermap-bot/") === true)).toBe(true);
      await expect(t.obtenir("https://donnees.example/prive/x")).rejects.toBeInstanceOf(RefusRobots);
    } finally {
      f.retablir();
    }
  });

  it("checks the robots.txt of every host a redirect leads to, and refuses plain http", async () => {
    const f = faux({
      "https://a.example/robots.txt": { status: 404 },
      "https://a.example/f": { status: 302, location: "https://b.example/f" },
      "https://b.example/robots.txt": { status: 200, corps: "User-agent: *\nDisallow: /\n" },
      "https://c.example/robots.txt": { status: 404 },
      "https://c.example/f": { status: 302, location: "http://c.example/f" },
    });
    try {
      const t = f.telechargeur();
      await expect(t.obtenir("https://a.example/f")).rejects.toBeInstanceOf(RefusRobots);
      await expect(t.obtenir("https://c.example/f")).rejects.toThrow(/non https/);
    } finally {
      f.retablir();
    }
  });

  it("refuses a body larger than its limit, announced or not", async () => {
    let horloge = 0;
    const vraieDate = Date.now;
    Date.now = () => horloge;
    try {
      const fetchFaux = (async (entree: string | URL | Request) => {
        const url = entree.toString();
        if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
        if (url.endsWith("/annonce"))
          return new Response("x".repeat(10), { status: 200, headers: { "content-length": "999999" } });
        return new Response("x".repeat(2_000), { status: 200 });
      }) as typeof fetch;
      const t = new Telechargeur({
        agent: "Sovermap-bot/1",
        fetch: fetchFaux,
        dormir: async (ms) => void (horloge += ms),
        tailleMax: 1_000,
      });
      await expect(t.obtenir("https://e.example/annonce")).rejects.toThrow(/trop grand/);
      await expect(t.obtenir("https://e.example/flux")).rejects.toThrow(/trop grand/);
    } finally {
      Date.now = vraieDate;
    }
  });

  it("forbids everything when robots.txt answers a server error", async () => {
    const f = faux({ "https://d.example/robots.txt": { status: 503 } });
    try {
      await expect(f.telechargeur().obtenir("https://d.example/f")).rejects.toBeInstanceOf(RefusRobots);
    } finally {
      f.retablir();
    }
  });
});

describe("the agent string", () => {
  it("names the project and its address, never an account nor the repository (point 03 of chantier 2)", () => {
    expect(agentUtilisateur("0.2.0")).toBe("Sovermap-bot/0.2.0 (+https://sovermap.vercel.app)");
    expect(agentUtilisateur("0.2.0")).not.toMatch(/github|@/i);
  });
});
