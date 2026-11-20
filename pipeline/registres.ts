// The registries' bulk files (docs/sources.md, cards 21 and 22): the delegation files of the five RIRs give each AS's
// country of REGISTRATION (never a location); the RIPE database's « split » files give, for the RIPE region, the name
// of the organisation that holds an AS. Personal data (e-mail and postal addresses, phones, persons) is dropped as
// each object is read: only the fields named here are ever kept, and only for the AS numbers actually observed
// (« insubstantial part », art. 4.5 of the RIPE Database Terms and Conditions).

/** `registry|cc|asn|start|value|date|status[|opaque-id]`: AS number → country code of registration. */
export function paysDesAs(contenus: readonly string[]): Map<number, string> {
  const pays = new Map<number, string>();
  for (const contenu of contenus) {
    for (const ligne of contenu.split("\n")) {
      if (ligne.startsWith("#")) continue;
      const champs = ligne.split("|");
      if (champs[2] !== "asn") continue;
      const cc = (champs[1] ?? "").toUpperCase();
      const debut = Number(champs[3]);
      const nombre = Number(champs[4]);
      if (
        !/^[A-Z]{2}$/.test(cc) ||
        !Number.isInteger(debut) ||
        !Number.isInteger(nombre) ||
        nombre < 1 ||
        nombre > 1_000_000
      )
        continue;
      for (let asn = debut; asn < debut + nombre; asn += 1) pays.set(asn, cc);
    }
  }
  return pays;
}

/** RPSL objects of a « split » file: blank-line separated, `attribute: value`, continuation lines ignored. */
function* objets(contenu: string, gardes: ReadonlySet<string>): Generator<Map<string, string>> {
  let courant = new Map<string, string>();
  for (const ligne of contenu.split("\n")) {
    if (ligne.trim() === "") {
      if (courant.size > 0) yield courant;
      courant = new Map();
      continue;
    }
    if (ligne.startsWith("%") || ligne.startsWith("#") || /^[\s+]/.test(ligne)) continue;
    const deux = ligne.indexOf(":");
    if (deux < 1) continue;
    const attribut = ligne.slice(0, deux).trim().toLowerCase();
    // Every field but these is dropped at once: no e-mail, no address, no phone, no person ever kept.
    if (!gardes.has(attribut) || courant.has(attribut)) continue;
    courant.set(
      attribut,
      ligne
        .slice(deux + 1)
        .trim()
        .slice(0, 200),
    );
  }
  if (courant.size > 0) yield courant;
}

export type TitulaireRipe = {
  asn: number;
  asName: string;
  org: string | null;
  orgName: string | null;
  pays: string | null;
};

/** For the observed AS numbers of the RIPE region: their as-name and their holding organisation's name and country. */
export function titulairesRipe(
  autNum: string,
  organisations: string,
  observes: ReadonlySet<number>,
): Map<number, TitulaireRipe> {
  const parAs = new Map<number, TitulaireRipe>();
  for (const o of objets(autNum, new Set(["aut-num", "as-name", "org"]))) {
    const asn = Number((o.get("aut-num") ?? "").replace(/^AS/i, ""));
    if (!observes.has(asn)) continue;
    parAs.set(asn, { asn, asName: o.get("as-name") ?? "", org: o.get("org") ?? null, orgName: null, pays: null });
  }
  const voulues = new Set([...parAs.values()].flatMap((t) => (t.org === null ? [] : [t.org])));
  const parOrg = new Map<string, { nom: string; pays: string | null }>();
  for (const o of objets(organisations, new Set(["organisation", "org-name", "country"]))) {
    const id = o.get("organisation") ?? "";
    if (!voulues.has(id)) continue;
    parOrg.set(id, { nom: o.get("org-name") ?? "", pays: o.get("country")?.toUpperCase() ?? null });
  }
  for (const t of parAs.values()) {
    const org = t.org === null ? undefined : parOrg.get(t.org);
    if (org) {
      t.orgName = org.nom;
      t.pays = org.pays;
    }
  }
  return parAs;
}
