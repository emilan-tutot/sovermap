// The copies the collection pins, and whether a newer version exists (the owner's answer to point 13, § 8): the Knot
// Resolver image (by its digest, its tag in the comment of its line in collecte.yml), the Public Suffix List (the
// « VERSION » line of the copy in referentiels/psl/) and the INSEE's COG (the vintage in the id of its source in
// referentiels/pays.json). Pure: scripts/copies-epinglees.ts does the reads.

/** The resolver's pinned image: its digest and, in the comment of its line, its tag (« v6.5.1-20261117 »). */
export function imageEpinglee(workflow: string): { digest: string; etiquette: string } | null {
  const m =
    /^\s*RESOLVEUR: docker\.io\/cznic\/knot-resolver@(sha256:[0-9a-f]{64}) # (v[0-9][0-9.]*-[0-9]{8})\s*$/m.exec(
      workflow,
    );
  return m === null ? null : { digest: m[1] ?? "", etiquette: m[2] ?? "" };
}

/** A tag of Docker Hub's list, checked at the boundary. */
export type Etiquette = { nom: string; digest: string };

/** The tags of Docker Hub's answer (`results`), only those with a name and a digest. */
export function etiquettesDe(reponse: unknown): Etiquette[] {
  const resultats = (reponse as { results?: unknown })?.results;
  if (!Array.isArray(resultats)) return [];
  return resultats.flatMap((r: unknown) => {
    const o = r as { name?: unknown; digest?: unknown };
    return typeof o?.name === "string" && typeof o.digest === "string" && /^sha256:[0-9a-f]{64}$/.test(o.digest)
      ? [{ nom: o.name, digest: o.digest }]
      : [];
  });
}

/**
 * The most recent weekly build of the pinned major version (« v6.5.1-20261117 »: version, then the day of the build):
 * the latest day first, the highest version within a day.
 */
export function etiquetteRecente(etiquettes: readonly Etiquette[], epinglee: string): Etiquette | null {
  const majeure = /^v([0-9]+)\./.exec(epinglee)?.[1];
  if (majeure === undefined) return null;
  const forme = /^v([0-9]+)\.([0-9]+)\.([0-9]+)-([0-9]{8})$/;
  const cle = (e: Etiquette) => {
    const m = forme.exec(e.nom);
    return m === null ? null : [Number(m[4]), Number(m[1]), Number(m[2]), Number(m[3])];
  };
  const datees = etiquettes.filter((e) => /^v([0-9]+)\./.exec(e.nom)?.[1] === majeure && cle(e) !== null);
  const ordre = (a: Etiquette, b: Etiquette) => {
    const ka = cle(a) ?? [];
    const kb = cle(b) ?? [];
    for (let i = 0; i < ka.length; i += 1) if ((ka[i] ?? 0) !== (kb[i] ?? 0)) return (kb[i] ?? 0) - (ka[i] ?? 0);
    return 0;
  };
  return [...datees].sort(ordre)[0] ?? null;
}

/** The « VERSION » line of a Public Suffix List (« 2026-11-19_08-30-20_UTC »). */
export function versionPsl(texte: string): string | null {
  return /^\/\/ VERSION: ([0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}_UTC)\s*$/m.exec(texte)?.[1] ?? null;
}

/** The pinned vintage of the COG, from the id of its source in referentiels/pays.json (« cog-insee-pays-2026 »). */
export function millesimeEpingle(sources: Readonly<Record<string, unknown>>): number | null {
  const annees = Object.keys(sources).flatMap((id) => {
    const m = /^cog-insee-pays-([0-9]{4})$/.exec(id);
    return m === null ? [] : [Number(m[1])];
  });
  return annees.length === 0 ? null : Math.max(...annees);
}

/** The latest vintage among the titles of the COG's resources on data.gouv.fr (« Millésime 2027 : … »). */
export function millesimeRecent(reponse: unknown): number | null {
  const ressources = (reponse as { resources?: unknown })?.resources;
  if (!Array.isArray(ressources)) return null;
  const annees = ressources.flatMap((r: unknown) => {
    const titre = (r as { title?: unknown })?.title;
    const m = typeof titre === "string" ? /Millésime ([0-9]{4})/.exec(titre) : null;
    return m === null ? [] : [Number(m[1])];
  });
  return annees.length === 0 ? null : Math.max(...annees);
}
