import type { Fraicheur } from "@/lib/donnees/fraicheur";
import type { Qualite } from "@/lib/donnees/qualite";
import { minutes, nombre } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { gardeFous } from "./garde-fous";

/**
 * Proposal C, « le tableau des contrôles »: one dense table, a row per guard with its value, its limit and its verdict
 * in words, after one line that sums up the collection (its duration, its names, its domains).
 */
export function TableauControles({ q, f }: { q: Qualite; f: Fraicheur }) {
  const g = fr.qualite.gardeFous;
  const t = fr.qualite;
  return (
    <section className="releve" aria-labelledby="q-tableau">
      <h2 id="q-tableau">{t.sections.controles}</h2>
      <p className="releve-note">
        {t.collecte.duree}{" "}
        <span className="valeur">
          {q.collecte.dureeMinutes === null ? t.nonPublie : minutes(q.collecte.dureeMinutes)}
        </span>{" "}
        · {t.couverture.noms}{" "}
        <span className="valeur">
          {q.couverture.nomsMesures === null ? t.nonPublie : nombre(q.couverture.nomsMesures)}
        </span>{" "}
        · {t.couverture.domaines}{" "}
        <span className="valeur">{q.couverture.domaines === null ? t.nonPublie : nombre(q.couverture.domaines)}</span>
      </p>
      <table className="releve-table">
        <thead>
          <tr>
            <th scope="col">{g.colonnes.controle}</th>
            <th scope="col">{g.colonnes.valeur}</th>
            <th scope="col">{g.colonnes.limite}</th>
            <th scope="col">{g.colonnes.resultat}</th>
          </tr>
        </thead>
        <tbody>
          {gardeFous(q, f).map((gf) => (
            <tr key={gf.cle}>
              <th scope="row">{gf.libelle}</th>
              <td className="valeur">{gf.texte ?? t.nonPublie}</td>
              <td className="valeur">{gf.texteLimite}</td>
              <td>{gf.tenu === null ? t.nonPublie : gf.tenu ? g.tenu : g.depasse}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
