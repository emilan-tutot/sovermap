import Link from "next/link";
import { Coque } from "@/components/coque/Coque";
import { FilAriane } from "@/components/coque/FilAriane";
import { Texte } from "@/components/texte/Texte";
import { Valeur } from "@/components/texte/Valeur";
import { dateFr } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import type { PageDeTexte, Segment } from "@/lib/textes";

const t = fr.textes;

function Segments({ segments }: { segments: readonly Segment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        typeof s === "string" ? (
          <Texte key={i} texte={s} />
        ) : "valeur" in s ? (
          <span key={i} className="valeur">
            <Valeur texte={s.valeur} />
          </span>
        ) : (
          <Link key={i} href={s.vers} prefetch={false}>
            {s.lien}
          </Link>
        ),
      )}
    </>
  );
}

/**
 * A text page of the site (part E): its title, a notice by the title while the publisher has not read the text again
 * (brief E.3: clear, and from the first reading), its sections, its sources and the day of its last revision; once
 * read again, one line at the foot of the page instead.
 */
export function PageTexte({ page }: { page: PageDeTexte }) {
  return (
    <Coque>
      <FilAriane miettes={[{ nom: page.titre, chemin: page.chemin }]} />
      <h1 className="titre-page">{page.titre}</h1>
      {page.relu ? null : <p className="note texte-ia">{t.iaNonRelu}</p>}
      <p className="chapo">{page.chapo}</p>
      {page.sections.map((s, i) => (
        <section
          key={i}
          className="texte-section"
          id={s.ancre}
          aria-labelledby={s.titre === undefined ? undefined : `section-${i}`}
        >
          {s.titre === undefined ? null : <h2 id={`section-${i}`}>{s.titre}</h2>}
          {s.blocs.map((b, j) =>
            "paragraphe" in b ? (
              <p key={j}>
                <Segments segments={b.paragraphe} />
              </p>
            ) : (
              <ul key={j}>
                {b.liste.map((e, k) => (
                  <li key={k}>
                    <Segments segments={e} />
                  </li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
      <section className="texte-sources" aria-labelledby="texte-sources">
        <h2 id="texte-sources">{t.sources}</h2>
        <ul>
          {page.sources.map((s, i) => (
            <li key={i}>
              <Segments segments={s} />
            </li>
          ))}
        </ul>
        <p className="releve-note texte-revision">{t.revision(dateFr(page.revision))}</p>
      </section>
      {page.relu ? (
        <p className="releve-note">
          {t.iaRelu}{" "}
          <Link href="/credits" prefetch={false}>
            {t.voirCredits}
          </Link>
        </p>
      ) : null}
    </Coque>
  );
}
