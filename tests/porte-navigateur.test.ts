import { describe, expect, it } from "vitest";
import { fr } from "../lib/i18n/fr";
import { ADRESSES_PORTE, type Attendu } from "../lib/porte";
import { scriptNavigateur } from "../scripts/lib/porte-navigateur";

// The browser script of the door's list must run on its own (no reference to a module) and judge every answer the
// way probe:prod does. Here it runs against a simulated site that gives every closed-door answer but one.
type Faux = { status: number; type: string; contentType: string; texte: string };

const bonneReponse = (attendu: Attendu): Faux => {
  const r = (status: number, contentType: string, texte: string) => ({ status, type: "basic", contentType, texte });
  switch (attendu) {
    case "attente":
      return r(
        200,
        "text/html",
        `<link rel="icon" href="/icon.svg"/><link rel="apple-touch-icon" href="/apple-touch-icon.png"/>` +
          `<meta property="og:image" content="https://site.example/partage.png"/>` +
          `<h1>${fr.site.question}</h1><p>${fr.attente.title}</p><p>${fr.attente.status}</p>`,
      );
    case "attente-rsc":
      return r(200, "text/x-component", `0:["${fr.attente.status}"]`);
    case "robots-ferme":
      return r(200, "text/plain", "User-Agent: *\nDisallow: /\n");
    case "plan-vide":
      return r(200, "application/xml", "<urlset></urlset>");
    case "fichier":
      return r(200, "image/svg+xml", "<svg></svg>");
    case "introuvable":
      return r(404, "text/html", `<h1>${fr.notFound.title}</h1>`);
    case "refusee":
      return r(400, "text/plain", "INVALID_IMAGE_OPTIMIZE_REQUEST");
  }
};

async function executer(fausses: Faux[]) {
  let n = 0;
  const fetch = async () => {
    const f = fausses[n] ?? bonneReponse("introuvable");
    n += 1;
    return { status: f.status, type: f.type, headers: { get: () => f.contentType }, text: async () => f.texte };
  };
  const document = { querySelector: () => ({ getAttribute: () => "abc1234" }) };
  const location = { origin: "https://site.example" };
  const corps = `return ${scriptNavigateur(0).replace(/^await /, "")};`;
  const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor as new (
    ...args: string[]
  ) => (...valeurs: unknown[]) => Promise<{ origine: string; version: string; adresses: number; ecarts: string[] }>;
  return new AsyncFunction("fetch", "document", "location", corps)(fetch, document, location);
}

describe("the browser script of the door's list (point 01 of chantier 2)", () => {
  it("finds nothing when every address gets the closed door's answer", async () => {
    const resultat = await executer(ADRESSES_PORTE.map((a) => bonneReponse(a.attendu)));
    expect(resultat).toEqual({
      origine: "https://site.example",
      version: "abc1234",
      adresses: ADRESSES_PORTE.length,
      ecarts: [],
    });
  });

  it("names the address that answers otherwise, as probe:prod would", async () => {
    const i = ADRESSES_PORTE.findIndex((a) => a.chemin === "/globe/monde.json" && a.entetes === undefined);
    const fausses = ADRESSES_PORTE.map((a, j) =>
      j === i ? { status: 200, type: "basic", contentType: "application/json", texte: "{}" } : bonneReponse(a.attendu),
    );
    const resultat = await executer(fausses);
    expect(resultat.ecarts).toEqual(["/globe/monde.json répond 200, pas 404"]);
  });

  it("asks one second apart by default", () => {
    expect(scriptNavigateur()).toContain("derniere + 1000 - Date.now()");
  });

  it("is written in ASCII only, so that copying it by hand loses no character", () => {
    const script = scriptNavigateur();
    expect([...script].every((c) => c.charCodeAt(0) < 128)).toBe(true);
    // The texts keep their non-breaking space and apostrophes, escaped.
    expect(script).toContain("Qui h\\u00e9berge l\\u2019\\u00c9tat\\u00a0?");
  });
});
