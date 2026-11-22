// Tests of the open data's page (F.1, D.7): what it reads of the published state, the files' addresses, and its
// Dataset structured data. A made-up account name and state, no network.
import { describe, expect, it } from "vitest";
import { adresseFichierOuvert, donneesOuvertesDe } from "@/lib/donnees/ouvertes";
import type { EtatPublie } from "@/lib/donnees/lecture";
import { jsonLdDataset } from "@/lib/referencement";

const etat = (brut: Record<string, unknown>): EtatPublie => ({
  date: "2026-11-22",
  statut: "preparation",
  jours: 2,
  sommes: {},
  brut,
});

describe("the open data's page (F.1)", () => {
  it("reads the method's version and the dated sources, and leaves out what is not one", () => {
    const d = donneesOuvertesDe(
      etat({
        versions: { regles: { methode: "0.2.3" } },
        sources: [
          { id: "dila", fiche: 4, etat: "du jour", date: "2026-11-22T00:00:00.000Z" },
          { id: "iptoasn", fiche: 18, etat: "relevé manuel", date: null },
          { id: "<script>", fiche: 1, etat: "du jour", date: "2026-11-22" },
          { id: "ris-ipv4", fiche: "19", etat: "du jour", date: "2026-11-22" },
        ],
      }),
    );
    expect(d).toEqual({
      date: "2026-11-22",
      methode: "0.2.3",
      sources: [
        { id: "dila", fiche: 4, etat: "du jour", date: "2026-11-22" },
        { id: "iptoasn", fiche: 18, etat: "relevé manuel", date: null },
      ],
    });
    expect(donneesOuvertesDe(etat({ versions: { regles: { methode: "dernière" } } })).methode).toBeNull();
  });

  it("links a file of the release only from the project's organization, never a personal account", () => {
    expect(adresseFichierOuvert("SHA256SUMS", "sovermap")).toBe(
      "https://github.com/sovermap/sovermap/releases/download/donnees-courant/SHA256SUMS",
    );
    expect(adresseFichierOuvert("SHA256SUMS", "exemple")).toBeNull();
    expect(adresseFichierOuvert("SHA256SUMS", undefined)).toBeNull();
    expect(adresseFichierOuvert("SHA256SUMS", "ex/../autre")).toBeNull();
  });

  it("describes the dataset for the engines, as JSON that no « < » can close", () => {
    const texte = jsonLdDataset("https://sovermap.com", "2026-11-22", [
      { fichier: "sovermap-domains.csv", adresse: "https://github.com/exemple/sovermap/releases/download/x/a.csv" },
    ]);
    expect(texte).not.toContain("<");
    const donnees = JSON.parse(texte) as Record<string, unknown>;
    expect(donnees["@type"]).toBe("Dataset");
    expect(donnees["url"]).toBe("https://sovermap.com/donnees");
    expect(String(donnees["description"]).length).toBeGreaterThanOrEqual(50);
    expect(donnees["distribution"]).toEqual([
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: "https://github.com/exemple/sovermap/releases/download/x/a.csv",
      },
    ]);
  });
});
