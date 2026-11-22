import type { Fraicheur } from "@/lib/donnees/fraicheur";
import type { Qualite } from "@/lib/donnees/qualite";
import { heureUtc, minutes, nombre, pourcent } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";
import { EnTete, Sources } from "./Commun";

const t = fr.qualite;
const nd = (v: string | null) => v ?? t.nonPublie;
const n = (v: number | null) => (v === null ? null : nombre(v));

/** One « term : value » row; a value not published says so. */
function Ligne({ terme, valeur }: { terme: string; valeur: string | null }) {
  return (
    <div className="releve-ligne">
      <dt>{terme}</dt>
      <dd className="valeur">{nd(valeur)}</dd>
    </div>
  );
}

/** Proposal A, « le bulletin »: one reading column, sections of term-value lists, the sources in a table. */
export function Bulletin({ q, f }: { q: Qualite; f: Fraicheur }) {
  const fin = q.collecte.fin;
  return (
    <>
      <EnTete q={q} f={f} />

      <section className="releve" aria-labelledby="q-collecte">
        <h2 id="q-collecte">{t.sections.collecte}</h2>
        <dl>
          <Ligne
            terme={t.collecte.debut}
            valeur={q.collecte.debut === null ? null : t.heureUtc(heureUtc(q.collecte.debut))}
          />
          <Ligne terme={t.collecte.fin} valeur={fin === null ? null : t.heureUtc(heureUtc(fin))} />
          <Ligne
            terme={t.collecte.duree}
            valeur={q.collecte.dureeMinutes === null ? null : minutes(q.collecte.dureeMinutes)}
          />
          <Ligne terme={t.collecte.point} valeur={q.collecte.pointDeMesure} />
          <Ligne terme={t.collecte.methode} valeur={q.methode} />
        </dl>
      </section>

      <section className="releve" aria-labelledby="q-couverture">
        <h2 id="q-couverture">{t.sections.couverture}</h2>
        <dl>
          <Ligne terme={t.couverture.noms} valeur={n(q.couverture.nomsMesures)} />
          <Ligne terme={t.couverture.domaines} valeur={n(q.couverture.domaines)} />
          <Ligne terme={t.couverture.dontEtat} valeur={n(q.couverture.domainesEtat)} />
        </dl>
      </section>

      <section className="releve" aria-labelledby="q-echecs">
        <h2 id="q-echecs">{t.sections.echecs}</h2>
        <dl>
          <Ligne
            terme={t.echecs.noms}
            valeur={
              q.echecs.noms === null
                ? null
                : `${nombre(q.echecs.noms)}${q.echecs.pourcent === null ? "" : ` (${pourcent(q.echecs.pourcent)})`}`
            }
          />
          {Object.entries(q.echecs.parCode).map(([code, k]) => (
            <Ligne key={code} terme={code} valeur={nombre(k)} />
          ))}
          <Ligne
            terme={t.echecs.pannes}
            valeur={
              q.echecs.pannesConfirmees === null
                ? null
                : `${nombre(q.echecs.pannesConfirmees)}${q.echecs.pannesPourcent === null ? "" : ` (${pourcent(q.echecs.pannesPourcent)})`}`
            }
          />
        </dl>
      </section>

      <section className="releve" aria-labelledby="q-controles">
        <h2 id="q-controles">{t.sections.controles}</h2>
        <dl>
          <Ligne
            terme={t.controles.temoins}
            valeur={
              q.temoinsConcordants === null
                ? null
                : q.temoinsConcordants
                  ? t.controles.concordants
                  : t.controles.discordants
            }
          />
          <Ligne
            terme={t.controles.regle}
            valeur={q.regleInterne?.noms == null ? null : t.controles.nomsEcartes(nombre(q.regleInterne.noms))}
          />
        </dl>
      </section>

      <section className="releve" aria-labelledby="q-debit">
        <h2 id="q-debit">{t.sections.debit}</h2>
        <dl>
          <Ligne terme={t.debit.maximum} valeur={q.debit?.max == null ? null : nombre(q.debit.max)} />
          <Ligne
            terme={t.debit.auDela}
            valeur={
              q.debit?.secondesAuDela == null || q.debit.secondes === null || q.debit.pourcent === null
                ? null
                : t.debit.surSecondes(
                    nombre(q.debit.secondesAuDela),
                    nombre(q.debit.secondes),
                    pourcent(q.debit.pourcent, 3),
                  )
            }
          />
        </dl>
        <p className="releve-note">{t.debit.tolerance}</p>
      </section>

      <Sources q={q} />
    </>
  );
}
