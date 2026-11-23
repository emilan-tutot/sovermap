// The failures of a day, for the diagnosis of a degraded collection (the owner's answer to point 17, § 3): each failing
// domain with the layers that failed and their codes, whether Quad9 shared the failure, whether the domain was still
// under way when the collection stopped, and the operators of its zone's authoritative name servers. A trial's written
// state cannot tell them (its failed layers keep the published day's values: trap 65), and the run's summary names no
// third party. The file is written beside the output, never in it (`travail/diagnostic.json`): it goes to the run's
// artifact only, never to « donnees » nor to the « donnees-courant » release (both take « sortie »). It asks nothing:
// it reads the day's state.
import type { EnregistrementDomaine, Etat, Exploitant } from "./publication";

/** The file's name, in the work folder beside « sortie », never inside it (tests/collecte-workflow.test.ts). */
export const FICHIER_DIAGNOSTIC = "diagnostic.json";

export type LigneDiagnostic = {
  domaine: string;
  /** The zone's questions (NS, then SOA) failed: their code; null when the zone answered. */
  zone: string | null;
  /** The mail exchangers' question (MX) failed. */
  messagerie: boolean;
  nomWeb: string;
  /** The web name's questions (A and AAAA) failed: their code; null when it answered. */
  web: string | null;
  /** Quad9 shared the failure: the domain's own breakdown, outside the guard of 2 % (published « confirmé »). */
  confirme: boolean;
  /**
   * Under way when the collection stopped: its questions not yet asked got « ERREUR » without being asked, so its
   * failures say nothing of its servers.
   */
  inacheve: boolean;
  /** The zone's authoritative name servers as measured today (none when the zone failed), with their operators. */
  serveursDeNoms: { hote: string; exploitants: string[] }[];
};

/** What the day's state does not keep: Quad9's verdict on a mail exchangers' failure, and the domains under way. */
export type ContexteDiagnostic = { pannesMx: ReadonlySet<string>; inacheves: ReadonlySet<string> };

const SANS_CONTEXTE: ContexteDiagnostic = { pannesMx: new Set(), inacheves: new Set() };

/** An operator as the measurement names it: its company when one is established, otherwise its proof (an AS). */
function exploitantDe(e: Exploitant): string {
  return e.societe ?? e.preuve;
}

/** Does this domain fail as the guard counts it (its zone, its mail exchangers' question or its web name)? */
function enEchec(d: EnregistrementDomaine, jour: Etat): boolean {
  return d.zone.etat === "echec" || d.messagerie.etat === "echec" || jour.noms.get(d.nomWeb)?.etat === "echec";
}

/** The day's failing domains, in the order of their names. */
export function diagnosticDesEchecs(jour: Etat, contexte: ContexteDiagnostic = SANS_CONTEXTE): LigneDiagnostic[] {
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
        // As the guard counts a confirmed breakdown (pipeline/cli/collecter.ts).
        confirme:
          (d.zone.echec?.confirmePar ?? null) !== null ||
          (web?.echec?.confirmePar ?? null) !== null ||
          contexte.pannesMx.has(d.domaine),
        inacheve: contexte.inacheves.has(d.domaine),
        serveursDeNoms: d.serveursDeNoms.hotes.map((h) => ({
          hote: h.hote,
          exploitants: [...new Set(h.exploitants.map(exploitantDe))],
        })),
      };
    });
}
