import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { Valeur } from "@/components/texte/Valeur";
import { lecteur } from "@/lib/donnees/lecture";
import { lireIndexSocietes, nomPays, sourcesDe } from "@/lib/donnees/radiographie";
import { estCleSociete, lireDomainesSociete, pageDe } from "@/lib/donnees/societes";
import { nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";

type Props = { params: Promise<{ cle: string }>; searchParams: Promise<{ page?: string | string[] }> };

const t = fr.societes;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cle } = await params;
  if (!estCleSociete(cle)) return {};
  // The name comes from the day's index; the metadata never reads data behind a closed door (the page answers 404).
  const etat = await lecteur.etat();
  if (etat.statut !== "ok") return {};
  const lu = await lecteur.fichier("index/exploitants.json");
  const nom = lu.statut === "ok" ? lireIndexSocietes(lu.donnees)?.get(cle)?.nom : undefined;
  return nom === undefined ? {} : { title: t.titrePage(nom), description: t.descriptionPage(nom) };
}

// A company's page (D.2, R9): its country, who owns whom up to its ultimate parent, who controls the top of its chain,
// and the registered domains it serves that day (200 a page), each leading to its Radiographie. Behind a closed door,
// no data is read: the page answers « not found ».
export default async function SocietePage({ params, searchParams }: Props) {
  const { cle } = await params;
  if (!estCleSociete(cle)) notFound();
  const etat = await lecteur.etat();
  if (etat.statut === "porte fermée" || etat.statut === "absent") notFound();
  if (etat.statut !== "ok") {
    return (
      <Coque>
        <h1 className="titre-page">{t.titre}</h1>
        <p className="note">{fr.radiographie.indisponible}</p>
      </Coque>
    );
  }
  const [luIndex, luDomaines] = await Promise.all([
    lecteur.fichier("index/exploitants.json"),
    lecteur.fichier(`index/exploitants/${cle}.json`),
  ]);
  const index = luIndex.statut === "ok" ? lireIndexSocietes(luIndex.donnees) : null;
  const s = index?.get(cle);
  if (index !== null && s === undefined) notFound();
  const domaines = luDomaines.statut === "ok" ? lireDomainesSociete(luDomaines.donnees, cle) : null;
  if (s === undefined || domaines === null) {
    return (
      <Coque>
        <h1 className="titre-page">{t.titre}</h1>
        <p className="note">{fr.radiographie.indisponible}</p>
      </Coque>
    );
  }
  const { page } = await searchParams;
  const p = pageDe(domaines, Number(typeof page === "string" ? page : "1"));
  const sources = sourcesDe(etat.donnees);
  return (
    <Coque>
      <FilAriane
        miettes={[
          { nom: fr.coque.navigation.societes, chemin: "/societes" },
          { nom: s.nom, chemin: `/societes/${cle}` },
        ]}
      />
      <p className="etiquette-capitales">{t.surtitre}</p>
      <h1 className="titre-page">{s.nom}</h1>
      <section className="releve" aria-labelledby="titre-chaine">
        <h2 id="titre-chaine">{t.chaine}</h2>
        <p>{t.pays(nomPays(s.pays) ?? s.pays)}</p>
        {s.mere === null ? (
          <p>{t.mereInconnue}</p>
        ) : s.mere === cle ? (
          <p>{t.sommet}</p>
        ) : s.maillons.length === 0 ? (
          <p>{t.chaineNonPubliee}</p>
        ) : (
          <ol className="chaine">
            {s.maillons.map((m) => (
              <li key={m.cle}>
                {index?.has(m.cle) ? (
                  <Link href={`/societes/${m.cle}`} prefetch={false}>
                    {m.nom}
                  </Link>
                ) : (
                  <span>{m.nom}</span>
                )}
                <span>{nomPays(m.pays) ?? m.pays}</span>
              </li>
            ))}
          </ol>
        )}
        {s.mere === null ? null : (
          <p>
            {t.siege(
              nomPays(s.paysMere) ?? s.paysMere ?? fr.radiographie.nonDetermine,
              fr.radiographie.categories[s.categorie],
            )}
          </p>
        )}
        {s.controle === null ? null : <p>{t.controle(s.controle)}</p>}
        <p className="releve-note">{t.source(sources.referentiels.societes ?? fr.radiographie.nonDetermine)}</p>
      </section>
      <section className="releve" aria-labelledby="titre-domaines">
        <h2 id="titre-domaines">{t.listeDomaines}</h2>
        <p>{t.domaines(domaines.length, nombre(domaines.length))}</p>
        <ul className="liste-domaines">
          {p.elements.map((d) => (
            <li key={d}>
              <Link href={`/radiographie/${d}`} prefetch={false} className="valeur">
                <Valeur texte={d} />
              </Link>
            </li>
          ))}
        </ul>
        {p.pages > 1 ? (
          <nav className="pagination" aria-label={t.pagination}>
            {p.page > 1 ? (
              <Link href={`?page=${p.page - 1}`} prefetch={false}>
                {t.precedente}
              </Link>
            ) : null}
            <span>{t.page(p.page, p.pages)}</span>
            {p.page < p.pages ? (
              <Link href={`?page=${p.page + 1}`} prefetch={false}>
                {t.suivante}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </Coque>
  );
}
