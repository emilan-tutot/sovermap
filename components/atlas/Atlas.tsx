import Link from "next/link";
import { connection } from "next/server";
import { Coque } from "@/components/coque/Coque";
import { Valeur } from "@/components/texte/Valeur";
import { type Chiffres, filsDe, lireChiffres, origineDe } from "@/lib/donnees/atlas";
import { indisponible } from "@/lib/donnees/indisponible";
import { lecteur } from "@/lib/donnees/lecture";
import { lireIndexPays, slugDuCode } from "@/lib/donnees/pays";
import { nombre, pourcent } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { Recherche } from "@/components/recherche/Recherche";
import { lireHistorique } from "@/lib/donnees/historique";
import { jsonLdSite } from "@/lib/referencement";
import { origineDuSite } from "@/lib/site";
import { CurseurTemps } from "./CurseurTemps";
import { GlobeAtlas } from "./GlobeAtlas";

const t = fr.atlas;
const pc = (n: number) => pourcent(n, 1);

function ChiffreTitre({ c }: { c: Chiffres }) {
  const titre = c.chiffreTitre;
  return (
    <section className="atlas-chiffre" aria-labelledby="atlas-chiffre">
      <p id="atlas-chiffre" className="chiffre-titre">
        {t.auMoins(pc(titre.auMoinsPourcent))}
      </p>
      <p className="atlas-definition">{t.definition(nombre(titre.domaines))}</p>
      <ul className="atlas-voisins">
        <li>{t.probable(pc(titre.probablePourcent))}</li>
        <li>{t.nonDetermine(pc(titre.nonDeterminePourcent))}</li>
      </ul>
      {c.avertissement === null ? null : <p className="releve-note">{c.avertissement}</p>}
      <ul className="atlas-sous-chiffres" aria-label={t.sousChiffres}>
        {c.sousChiffreGouvFr === null ? null : (
          <li>{t.gouvFr(pc(c.sousChiffreGouvFr.auMoinsPourcent), nombre(c.sousChiffreGouvFr.domaines))}</li>
        )}
        {c.serveursDeNoms === null ? null : (
          <li>{t.serveursDeNoms(pc(c.serveursDeNoms.auMoinsPourcent), nombre(c.serveursDeNoms.domaines))}</li>
        )}
        {c.messagerie === null ? null : (
          <li>{t.messagerie(pc(c.messagerie.auMoinsPourcent), nombre(c.messagerie.domaines))}</li>
        )}
      </ul>
    </section>
  );
}

/**
 * The Atlas (D.2), behind an open door only: the question, the headline figure « at least X % » with the probable and
 * undetermined shares beside it, its perimeter, date and definition; the figures of .gouv.fr, of the name servers and of
 * the mail; the globe with the day's threads; the countries in a table, the globe's text alternative. First version:
 * the search and the time slider come next.
 */
export async function Atlas() {
  // Rendered on demand with the day's data, never frozen at build time (its caching: D.4).
  await connection();
  const etat = await lecteur.etat();
  const [luChiffres, luPays, luHistorique] =
    etat.statut === "ok"
      ? await Promise.all([
          lecteur.fichier("agregats/chiffres.json"),
          lecteur.fichier("index/pays.json"),
          lecteur.fichier("agregats/historique.json"),
        ])
      : [etat, etat, etat];
  const jours = luHistorique.statut === "ok" ? lireHistorique(luHistorique.donnees) : [];
  const chiffres = luChiffres.statut === "ok" ? lireChiffres(luChiffres.donnees) : null;
  const index = luPays.statut === "ok" ? lireIndexPays(luPays.donnees) : null;
  if (etat.statut !== "ok" || chiffres === null || index === null) indisponible();
  const fils = filsDe(index);
  const liens: Record<string, string> = {};
  for (const f of fils) {
    const slug = slugDuCode(f.code);
    if (slug !== null) liens[f.code] = slug;
  }
  return (
    <Coque large>
      <div className="atlas-haut">
        <div className="atlas-texte">
          <h1 className="question">{fr.site.question}</h1>
          {/* The site's structured data (D.7): its name and its home page, a script that is never executed. */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSite(origineDuSite()) }} />
          <ChiffreTitre c={chiffres} />
          <CurseurTemps jours={jours} />
        </div>
        <div className="atlas-globe-bloc">
          <GlobeAtlas fils={fils} origine={origineDe(index)} liens={liens} />
          <p className="releve-note">{fr.globe.honnetete}</p>
        </div>
        <div className="atlas-recherche">
          <Recherche />
        </div>
      </div>
      <section className="releve" aria-labelledby="atlas-tableau">
        <h2 id="atlas-tableau">{t.tableau}</h2>
        <table className="releve-table">
          <thead>
            <tr>
              <th scope="col">{t.colonnes.pays}</th>
              <th scope="col">{t.colonnes.domaines}</th>
              <th scope="col">{t.colonnes.categorie}</th>
            </tr>
          </thead>
          <tbody>
            {fils.map((f) => (
              <tr key={f.code}>
                <th scope="row">
                  {liens[f.code] === undefined ? (
                    <Valeur texte={f.nom} />
                  ) : (
                    <Link href={`/pays/${liens[f.code]}`} prefetch={false}>
                      <Valeur texte={f.nom} />
                    </Link>
                  )}
                </th>
                <td className="valeur">{nombre(f.sites)}</td>
                <td className={f.horsUE ? "hors-ue" : undefined}>{f.horsUE ? t.horsUE : t.dansUE}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="releve" aria-labelledby="atlas-limites">
        <h2 id="atlas-limites">{t.limites.titre}</h2>
        <p>{t.limites.montre}</p>
        <p>
          {t.limites.neMontrePas}
          <Link href="/methode#ce-que-sovermap-montre" prefetch={false}>
            {t.limites.lien}
          </Link>
          {t.limites.fin}
        </p>
      </section>
    </Coque>
  );
}
