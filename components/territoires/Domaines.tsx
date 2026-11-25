import Link from "next/link";
import { Valeur } from "@/components/texte/Valeur";
import type { DomaineTerritoire } from "@/lib/donnees/territoires";
import { fr } from "@/lib/i18n/fr";

const t = fr.territoires;

/**
 * The sites of a territory (D.2): each domain, linked to its Radiographie, with the category of its retained seat, in
 * the order of their names; « aucun » when there is none that day.
 */
export function Domaines({ domaines }: { domaines: readonly DomaineTerritoire[] }) {
  if (domaines.length === 0) return <p>{t.aucun}</p>;
  return (
    <table className="releve-table liste-releve">
      <thead>
        <tr>
          <th scope="col">{t.colonnes.domaine}</th>
          <th scope="col">{t.colonnes.categorie}</th>
        </tr>
      </thead>
      <tbody>
        {[...domaines]
          .sort((a, b) => (a.domaine < b.domaine ? -1 : a.domaine > b.domaine ? 1 : 0))
          .map((d) => (
            <tr key={d.domaine}>
              <th scope="row">
                <Link href={`/radiographie/${d.domaine}`} prefetch={false}>
                  <Valeur texte={d.domaine} />
                </Link>
              </th>
              <td className={d.horsUE === true ? "hors-ue" : undefined}>{fr.radiographie.categories[d.categorie]}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
