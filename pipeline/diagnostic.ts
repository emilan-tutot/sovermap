// The failures of a day, for the diagnosis of a degraded collection (the owner's answer to point 17, § 3): each failing
// domain with the layers that failed and their codes, and the operators of its zone's authoritative name servers. A
// trial's written state cannot tell them (its failed layers keep the published day's values: trap 65), and the run's
// summary names no third party. The file is written beside the output, never in it (`travail/diagnostic.json`): it
// goes to the run's artifact only, never to « donnees ». It asks nothing: it reads the day's state.
import type { EnregistrementDomaine, Etat, Exploitant } from "./publication";

export type LigneDiagnostic = {
  domaine: string;
  /** The zone's questions (NS, then SOA) failed: their code; null when the zone answered. */
  zone: string | null;
  /** The mail exchangers' question (MX) failed. */
  messagerie: boolean;
  nomWeb: string;
  /** The web name's questions (A and AAAA) failed: their code; null when it answered. */
  web: string | null;
  /** The zone's authoritative name servers as measured today (none when the zone failed), with their operators. */
  serveursDeNoms: { hote: string; exploitants: string[] }[];
};

/** An operator as the measurement names it: its company when one is established, otherwise its proof (an AS). */
function exploitantDe(e: Exploitant): string {
  return e.societe ?? e.preuve;
}

/** Does this domain fail as the guard counts it (its zone, its mail exchangers' question or its web name)? */
function enEchec(d: EnregistrementDomaine, jour: Etat): boolean {
  return d.zone.etat === "echec" || d.messagerie.etat === "echec" || jour.noms.get(d.nomWeb)?.etat === "echec";
}

/** The day's failing domains, in the order of their names. */
export function diagnosticDesEchecs(jour: Etat): LigneDiagnostic[] {
  return [...jour.domaines.values()]
    .filter((d) => enEchec(d, jour))
    .sort((a, b) => (a.domaine < b.domaine ? -1 : a.domaine > b.domaine ? 1 : 0))
    .map((d) => {
      const web = jour.noms.get(d.nomWeb);
      return {
        domaine: d.domaine,
        zone: d.zone.etat === "echec" ? (d.zone.echec?.code ?? "ERREUR") : null,
        messagerie: d.messagerie.etat === "echec",
        nomWeb: d.nomWeb,
        web: web?.etat === "echec" ? (web.echec?.code ?? "ERREUR") : null,
        serveursDeNoms: d.serveursDeNoms.hotes.map((h) => ({
          hote: h.hote,
          exploitants: [...new Set(h.exploitants.map(exploitantDe))],
        })),
      };
    });
}
