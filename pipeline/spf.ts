// SPF (couche 10, decision C2-1): who may send mail for a domain. The record is read as RFC 7208 reads it, without
// any sender: its networks (ip4, ip6), the domains it includes (include, redirect) and the names whose addresses it
// authorises (a, mx), within the limit of 10 DNS lookups. A mechanism with a macro (%{…}) depends on the sender: it is
// kept as « non évalué ». Nothing here judges the record (no « weak SPF »): it says who is authorised, not how well.
import { isIP } from "node:net";

export type Mecanisme =
  | { type: "ip4" | "ip6"; reseau: string }
  | { type: "include" | "exists" | "redirect"; domaine: string }
  | { type: "a" | "mx" | "ptr"; domaine: string | null; prefixe4: number | null; prefixe6: number | null }
  | { type: "all"; qualificatif: string }
  | { type: "macro"; texte: string };

/** The mechanisms and modifiers of one record, in order; unknown terms are ignored (RFC 7208, 6). */
export function lireSpf(enregistrement: string): Mecanisme[] {
  const termes = enregistrement.trim().split(/\s+/);
  if ((termes[0] ?? "").toLowerCase() !== "v=spf1") return [];
  const sortie: Mecanisme[] = [];
  for (const brut of termes.slice(1)) {
    const terme = brut.replace(/^[+\-~?]/, "");
    const qualificatif = brut.length > terme.length ? (brut[0] ?? "+") : "+";
    if (/%\{/.test(terme)) {
      sortie.push({ type: "macro", texte: terme.slice(0, 120) });
      continue;
    }
    const m = /^(ip4|ip6|include|exists|a|mx|ptr|all)(?::([^/]*))?(?:\/(\d{1,3}))?(?:\/\/(\d{1,3}))?$/i.exec(terme);
    const redirect = /^redirect=(.+)$/i.exec(terme);
    if (redirect?.[1] !== undefined) {
      sortie.push({ type: "redirect", domaine: redirect[1].toLowerCase() });
      continue;
    }
    if (m === null) continue;
    const nom = (m[1] ?? "").toLowerCase();
    const valeur = m[2] ?? null;
    switch (nom) {
      case "ip4":
      case "ip6": {
        const adresse = valeur ?? "";
        const longueur = m[3] ?? (nom === "ip4" ? "32" : "128");
        if (isIP(adresse) === (nom === "ip4" ? 4 : 6)) sortie.push({ type: nom, reseau: `${adresse}/${longueur}` });
        break;
      }
      case "include":
      case "exists":
        if (valeur) sortie.push({ type: nom, domaine: valeur.toLowerCase() });
        break;
      case "a":
      case "mx":
      case "ptr":
        sortie.push({
          type: nom,
          domaine: valeur ? valeur.toLowerCase() : null,
          prefixe4: m[3] ? Number(m[3]) : null,
          prefixe6: m[4] ? Number(m[4]) : null,
        });
        break;
      case "all":
        sortie.push({ type: "all", qualificatif });
        break;
    }
  }
  return sortie;
}

export type ResolveurSpf = {
  /** The SPF record of a domain (only « v=spf1 » TXT records are ever read), or null. */
  spf(domaine: string): Promise<string | null>;
  /** The addresses of a name (A and AAAA). */
  adresses(nom: string): Promise<string[]>;
  /** The mail exchangers of a domain. */
  mx(domaine: string): Promise<string[]>;
};

export type ResultatSpf = {
  statut: "absent" | "lu" | "limite dépassée" | "boucle";
  /** Every network authorised, with the domain whose record names it. */
  reseaux: { reseau: string; depuis: string }[];
  /** The domains included or redirected to. */
  inclus: string[];
  /** Terms that depend on the sender (macros, exists, ptr): kept, never evaluated. */
  nonEvalues: string[];
  /** DNS lookups counted (RFC 7208, 4.6.4). */
  recherches: number;
};

const LIMITE = 10;

/** Expands the SPF record of a domain within 10 lookups. */
export async function etendreSpf(domaine: string, resolveur: ResolveurSpf): Promise<ResultatSpf> {
  const resultat: ResultatSpf = { statut: "lu", reseaux: [], inclus: [], nonEvalues: [], recherches: 0 };
  const vus = new Set<string>();
  const premier = await resolveur.spf(domaine);
  if (premier === null) return { ...resultat, statut: "absent" };

  async function parcourir(nom: string, enregistrement: string): Promise<void> {
    if (vus.has(nom)) {
      resultat.statut = "boucle";
      return;
    }
    vus.add(nom);
    for (const m of lireSpf(enregistrement)) {
      if (resultat.statut !== "lu") return;
      switch (m.type) {
        case "ip4":
        case "ip6":
          resultat.reseaux.push({ reseau: m.reseau, depuis: nom });
          break;
        case "include":
        case "redirect": {
          resultat.recherches += 1;
          if (resultat.recherches > LIMITE) {
            resultat.statut = "limite dépassée";
            return;
          }
          resultat.inclus.push(m.domaine);
          const suivant = await resolveur.spf(m.domaine);
          if (suivant !== null) await parcourir(m.domaine, suivant);
          break;
        }
        case "a":
        case "mx": {
          resultat.recherches += 1;
          if (resultat.recherches > LIMITE) {
            resultat.statut = "limite dépassée";
            return;
          }
          const cible = m.domaine ?? nom;
          const noms = m.type === "a" ? [cible] : (await resolveur.mx(cible)).slice(0, 10);
          for (const n of noms) {
            for (const adresse of await resolveur.adresses(n)) {
              const longueur = adresse.includes(":") ? (m.prefixe6 ?? 128) : (m.prefixe4 ?? 32);
              resultat.reseaux.push({ reseau: `${adresse}/${longueur}`, depuis: nom });
            }
          }
          break;
        }
        case "exists":
        case "ptr":
        case "macro":
          resultat.recherches += m.type === "macro" ? 0 : 1;
          resultat.nonEvalues.push(m.type === "macro" ? m.texte : `${m.type}:${m.domaine ?? nom}`);
          break;
        case "all":
          break;
      }
    }
  }
  await parcourir(domaine, premier);
  return resultat;
}
