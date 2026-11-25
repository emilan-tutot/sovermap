// Tests of the sources' attributions (F.1): the real dates of the files a made-up state was made from, the period of
// files or readings of several days, and nothing for a source whose date or name the state does not give. No network.
import { describe, expect, it } from "vitest";
import { attributionsDe } from "@/lib/donnees/attributions";
import type { EtatPublie } from "@/lib/donnees/lecture";

const etat = (brut: Record<string, unknown>): EtatPublie => ({
  date: "2026-11-22",
  statut: "preparation",
  jours: 2,
  sommes: {},
  brut,
});

const complet = etat({
  versions: {
    regles: {
      listes: ["2026-11-19", "2024-12-11"],
      perimetre: ["sig:2026-11-01:0123456789ab", "mesr:2026-11-21:ba9876543210"],
      psl: "2026-11-19_08-30-20_UTC",
      iptoasn: "2026-11-20T00:00:00.000Z",
    },
    dila: "dila_refOrga_admin_Etat_fr_20261121.json",
  },
  sources: [
    { id: "dila", fiche: 4, etat: "du jour", date: "2026-11-21T03:32:02.000Z" },
    { id: "ripe-organisation", fiche: 22, etat: "du jour", date: "2026-11-20T23:22:51.000Z" },
    { id: "rir-arin", fiche: 21, etat: "du jour", date: "2026-11-21T14:00:27.000Z" },
    { id: "rir-ripencc", fiche: 21, etat: "du jour", date: "2026-11-20T23:13:04.000Z" },
  ],
});

/** A date, or a period of two. */
const PERIODE = String.raw`du \d{2}/\d{2}/\d{4}(?: au \d{2}/\d{2}/\d{4})?`;

describe("the sources' attributions (F.1)", () => {
  it("dates each source by the file the state was made from, and gives a period for several days", () => {
    const a = attributionsDe(complet);
    const exigees = a.exigees.join("\n");
    expect(exigees).toContain("copie archivée du 11/12/2024");
    expect(exigees).toContain("liste des noms de domaine des organismes publics, version du 19/11/2026");
    expect(exigees).toContain("fichier dila_refOrga_admin_Etat_fr_20261121.json du 21/11/2026");
    expect(exigees).toContain("Sites internet, mise à jour du 01/11/2026");
    expect(exigees).toContain("mis à jour le 21/11/2026");
    expect(exigees).toContain("RIPE Database (RIPE NCC), copie du 20/11/2026");
    // The Observatoire of the démarches (card 55): only when their page is published, with the edition and its period.
    expect(exigees).not.toContain("Observatoire de la qualité des démarches");
    expect(attributionsDe(complet, { edition: 15, periode: "octobre 2026" }).exigees.join("\n")).toContain(
      "DINUM, Observatoire de la qualité des démarches en ligne, édition 15 (octobre 2026), Licence Ouverte",
    );
    const courtoisie = a.courtoisie.join("\n");
    expect(courtoisie).toContain("(RIPE NCC, ARIN, APNIC, LACNIC, AFRINIC), du 20/11/2026 au 21/11/2026.");
    expect(courtoisie).toContain("relevé du 20/11/2026");
    expect(courtoisie).toContain("version du 19/11/2026");
    expect(courtoisie).toContain("Natural Earth (domaine public)");
    // A licence's name and its version are never cut at the end of a line.
    expect(exigees).toContain("Licence Ouverte 2.0.");
    expect(exigees).toContain("CC BY 4.0.");
  });

  it("leaves out a source whose date or name the state does not give, never dating it wrong", () => {
    const a = attributionsDe(
      etat({
        versions: { regles: { listes: ["2024-12-11"], perimetre: ["sig:hier:0123"] }, dila: "<script>.json" },
        sources: [{ id: "dila", fiche: 4, etat: "du jour", date: "2026-11-21" }],
      }),
    );
    const tout = [...a.exigees, ...a.courtoisie].join("\n");
    expect(tout).toContain("copie archivée du 11/12/2024");
    expect(tout).not.toContain("version du 11/12/2024");
    expect(tout).not.toMatch(/DILA|SIG|RIPE Database|IPtoASN|Public Suffix|registres Internet/);
    // The countries and the companies come with the site's own referentials, always dated.
    expect(tout).toMatch(/EU Vocabularies .*, lus le \d{2}\/\d{2}\/\d{4}\./);
    expect(tout).toMatch(new RegExp(String.raw`base Sirene \(www\.insee\.fr\), données lues ${PERIODE}\.`));
    expect(tout).toMatch(new RegExp(String.raw`GLEIF, lues ${PERIODE}\.`));
  });
});
