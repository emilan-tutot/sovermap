import type { Fraicheur } from "@/lib/donnees/fraicheur";
import type { Qualite } from "@/lib/donnees/qualite";
import { dateFr, heureUtc, nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.qualite;

/** The day of the published collection, its days in a row, and, past 36 hours, that the data are late (in words). */
export function EnTete({ q, f }: { q: Qualite; f: Fraicheur }) {
  const fin = q.collecte.fin;
  return (
    <>
      {f.enRetard ? (
        <p className="bulletin-retard">
          <strong>{fr.fraicheur.enRetard}</strong> {fr.fraicheur.retard(nombre(Math.floor(f.ageHeures)))}
        </p>
      ) : null}
      <p className="bulletin-tete">
        {fin === null ? t.nonPublie : t.entete(dateFr(fin), heureUtc(fin))} · {t.jours(q.jours)}
      </p>
    </>
  );
}

/** The sources of the day: their card in the registry, their date and their state. */
export function Sources({ q }: { q: Qualite }) {
  return (
    <section className="releve" aria-labelledby="q-sources">
      <h2 id="q-sources">{t.sections.sources}</h2>
      <table className="releve-table">
        <thead>
          <tr>
            <th scope="col">{t.sources.fiche}</th>
            <th scope="col">{t.sources.source}</th>
            <th scope="col">{t.sources.date}</th>
            <th scope="col">{t.sources.etat}</th>
          </tr>
        </thead>
        <tbody>
          {q.sources.map((s) => (
            <tr key={s.id}>
              <td className="valeur">{s.fiche ?? ""}</td>
              <td>{s.id}</td>
              <td className="valeur">{s.date === null ? "" : dateFr(s.date)}</td>
              <td>{s.etat}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
