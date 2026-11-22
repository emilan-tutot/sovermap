import Link from "next/link";
import type { ReactNode } from "react";
import { Valeur } from "@/components/texte/Valeur";
import {
  type Categorie,
  type ExploitantVu,
  type HoteVu,
  type Niveau,
  nomPays,
  type Provenance,
  type Radiographie,
  type SocieteVue,
  type SourcesRadiographie,
} from "@/lib/donnees/radiographie";
import { dateFr } from "@/lib/i18n/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.radiographie;
export type Mode = "simple" | "expert";

const pays = (code: string | null) => (code === null ? t.nonDetermine : (nomPays(code) ?? code));
const categorie = (c: Categorie) => t.categories[c];
const niveau = (n: Niveau) => t.niveaux[n];
/** The distinct companies of a list of operators, in their order. */
const societes = (exploitants: readonly ExploitantVu[]): SocieteVue[] => [
  ...new Map(exploitants.flatMap((e) => (e.societe === null ? [] : [[e.societe.cle, e.societe] as const]))).values(),
];
const societesDesHotes = (hotes: readonly HoteVu[]) => societes(hotes.flatMap((h) => h.exploitants));
/** The dates of each list a name comes from, in their order. */
function provenances(liste: readonly Provenance[]): Map<Provenance["source"], string[]> {
  const parSource = new Map<Provenance["source"], string[]>();
  for (const p of liste)
    parSource.set(p.source, [...(parSource.get(p.source) ?? []), ...(p.date === null ? [] : [p.date])]);
  return parSource;
}
/** « 23.1.244.0-23.2.9.255 » → « 23.1.244.0 à 23.2.9.255 », which may wrap between its two ends. */
const plage = (brute: string) => {
  const [debut, fin] = brute.split("-");
  return debut !== undefined && fin !== undefined ? t.adresses.plage(debut, fin) : brute;
};

/** One numbered layer (DESIGN.md §5): its title and value(s), then its source, its date and, when published, its level. */
function Couche(props: {
  numero: number;
  titre: string;
  children: ReactNode;
  source: string;
  date: string | null;
  niveau: Niveau | null;
}) {
  return (
    <li className="couche" id={`couche-${props.numero}`}>
      <h3 className="couche-titre">
        <span className="couche-numero valeur">{props.numero}</span>
        <span>{props.titre}</span>
      </h3>
      <div className="couche-valeur">{props.children}</div>
      <div className="couche-meta">
        <p>{t.champ(t.source, props.source)}</p>
        {props.date === null ? null : <p>{t.champ(t.date, dateFr(props.date))}</p>}
        {props.niveau === null ? null : <p>{t.champ(t.niveau, niveau(props.niveau))}</p>}
      </div>
    </li>
  );
}

/** A list of raw values (host names, prefixes), each on its own line, wrapping only where DESIGN.md §6 allows it. */
function Valeurs({ valeurs }: { valeurs: readonly string[] }) {
  return (
    <ul className="couche-liste">
      {valeurs.map((v) => (
        <li key={v} className="valeur">
          <Valeur texte={v} />
        </li>
      ))}
    </ul>
  );
}

function Societes({ liste }: { liste: readonly SocieteVue[] }) {
  return liste.length === 0 ? (
    <p>{t.nonDetermine}</p>
  ) : (
    <ul className="couche-liste">
      {liste.map((s) => (
        <li key={s.cle}>{t.societe(s.nom, pays(s.pays))}</li>
      ))}
    </ul>
  );
}

function etatAdresses(r: NonNullable<Radiographie["web"]>): string {
  switch (r.etat) {
    case "ok":
      return t.adresses.ok;
    case "nxdomain":
      return t.adresses.nxdomain;
    case "nodata":
      return t.adresses.nodata;
    case "echec":
      return r.echec?.confirmePar
        ? t.adresses.echecConfirme(r.echec.code, r.echec.confirmePar)
        : t.adresses.echec(r.echec?.code ?? t.nonDetermine);
    default: {
      const jamais: never = r.etat;
      return jamais;
    }
  }
}

/** The level of the addresses layer: two resolvers that agree confirm it (docs/methode.md §5). */
const niveauAdresses = (r: NonNullable<Radiographie["web"]>): Niveau =>
  r.controle === null ? "probable" : r.controle.accord ? "confirmé" : "non déterminé";

export function VueRadiographie({ r, s, mode }: { r: Radiographie; s: SourcesRadiographie; mode: Mode }) {
  const web = r.web;
  const expert = mode === "expert";
  const exploitants = web?.exploitants ?? [];
  const lesSocietes = societes(exploitants);
  const meres = lesSocietes.map((so) => ({ so, mere: so.mere }));
  const collecte = s.collecte;
  const versionAs = s.referentiels.as ?? t.nonDetermine;
  return (
    <div className="radiographie">
      <nav className="radiographie-modes" aria-label={t.modes.libelle}>
        <Link href="?mode=simple" aria-current={expert ? undefined : "page"} prefetch={false} scroll={false}>
          {t.modes.simple}
        </Link>
        <Link href="?mode=expert" aria-current={expert ? "page" : undefined} prefetch={false} scroll={false}>
          {t.modes.expert}
        </Link>
      </nav>
      <div className="radiographie-colonnes">
        <section className="radiographie-couches" aria-labelledby="titre-couches">
          <h2 id="titre-couches" className="etiquette-capitales">
            {t.couches}
          </h2>
          {web?.partiel ? <p className="releve-note">{t.partiel}</p> : null}
          <ol className="couches">
            <Couche
              numero={1}
              titre={t.domaine.titre}
              source={t.listeLongue(
                [...provenances(web?.provenances ?? [])].map(([source, dates]) =>
                  t.domaine.copies(t.domaine.provenances[source], dates.map(dateFr)),
                ),
              )}
              date={null}
              niveau={null}
            >
              <p className="valeur">
                <Valeur texte={r.domaine} />
              </p>
              <p>
                {t.avecRaisons(
                  r.perimetre === "État" ? t.domaine.etat : t.domaine.horsEtat,
                  r.raisons.map((x) =>
                    x in t.domaine.raisons ? t.domaine.raisons[x as keyof typeof t.domaine.raisons] : x,
                  ),
                )}
              </p>
              {r.ministeres.length > 0 ? <p>{t.liste(r.ministeres)}</p> : null}
              {expert ? <p className="valeur">{t.champ(t.domaine.nomWeb, r.nomWeb)}</p> : null}
              {expert && r.autresNoms > 0 ? <p>{t.domaine.autresNoms(r.autresNoms)}</p> : null}
            </Couche>
            <Couche
              numero={2}
              titre={t.serveurs.titre}
              source={t.serveurs.source}
              date={collecte}
              niveau={r.serveurs.niveau}
            >
              <p>{t.serveurs.valeur(r.serveurs.ns.length)}</p>
              <Societes liste={societesDesHotes(r.serveurs.hotes)} />
              {expert ? <Valeurs valeurs={r.serveurs.ns} /> : null}
              {r.serveurs.dnssec === null ? null : (
                <p>{t.liste([t.serveurs.dnssec, r.serveurs.dnssec ? t.serveurs.dnssecOui : t.serveurs.dnssecNon])}</p>
              )}
            </Couche>
            <Couche
              numero={3}
              titre={t.adresses.titre}
              source={t.adresses.source}
              date={collecte}
              niveau={web === null ? null : niveauAdresses(web)}
            >
              {web === null ? (
                <p>{t.nonDetermine}</p>
              ) : (
                <>
                  <p>{etatAdresses(web)}</p>
                  {web.familleEnEchec === null ? null : <p>{t.adresses.familleEnEchec(web.familleEnEchec)}</p>}
                  {web.controle === null ? null : (
                    <p>
                      {t.adresses.controle(
                        web.controle.resolveur in t.resolveurs
                          ? t.resolveurs[web.controle.resolveur as keyof typeof t.resolveurs]
                          : web.controle.resolveur,
                        web.controle.accord,
                      )}
                    </p>
                  )}
                  {expert && web.cname.length > 0 ? (
                    <>
                      <p>{t.adresses.cname}</p>
                      <Valeurs valeurs={web.cname} />
                    </>
                  ) : null}
                  {expert && web.reseaux.some((x) => x.plage !== null) ? (
                    <>
                      <p>{t.adresses.plages}</p>
                      <Valeurs valeurs={web.reseaux.flatMap((x) => (x.plage === null ? [] : [plage(x.plage)]))} />
                    </>
                  ) : null}
                </>
              )}
            </Couche>
            <Couche
              numero={4}
              titre={t.reseau.titre}
              source={t.reseau.source(dateFr(s.iptoasn ?? ""), dateFr(s.ris ?? ""))}
              date={s.ris}
              niveau={null}
            >
              {web === null || web.reseaux.length === 0 ? (
                <p>{t.reseau.aucun}</p>
              ) : (
                <ul className="couche-liste">
                  {[...new Map(web.reseaux.map((x) => [x.as, x])).values()].map((x) => (
                    <li key={x.as}>
                      <span className="valeur">{t.as(x.as, x.titulaire)}</span>
                      {expert && x.pays !== null ? (
                        <p className="releve-note">{t.reseau.enregistre(pays(x.pays))}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Couche>
            <Couche
              numero={5}
              titre={t.exploitant.titre}
              source={t.exploitant.source(versionAs)}
              date={null}
              niveau={null}
            >
              {exploitants.length === 0 ? (
                <p>{t.exploitant.aucune}</p>
              ) : (
                <ul className="couche-liste">
                  {exploitants.map((e, i) => (
                    <li key={`${e.role}-${e.societe?.cle ?? i}`}>
                      <p>
                        {t.role(
                          t.exploitant.role[e.role],
                          e.societe === null ? t.nonDetermine : t.societe(e.societe.nom, pays(e.societe.pays)),
                        )}
                      </p>
                      <p className="releve-note">{t.champ(t.niveau, niveau(e.niveau))}</p>
                      {expert ? <p className="releve-note">{t.champ(t.exploitant.preuve, e.preuve)}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Couche>
            <Couche
              numero={6}
              titre={t.mere.titre}
              source={t.exploitant.source(s.referentiels.societes ?? t.nonDetermine)}
              date={null}
              niveau={null}
            >
              {meres.length === 0 ? (
                <p>{t.nonDetermine}</p>
              ) : (
                <ul className="couche-liste">
                  {meres.map(({ so, mere }) => (
                    <li key={so.cle}>
                      {mere === null
                        ? t.nonDetermine
                        : mere === "sommet"
                          ? t.mere.sommet(so.nom)
                          : t.societe(mere.nom, pays(mere.pays))}
                    </li>
                  ))}
                </ul>
              )}
            </Couche>
            <Couche
              numero={7}
              titre={t.pays.titre}
              source={t.exploitant.source(s.referentiels.societes ?? t.nonDetermine)}
              date={null}
              niveau={web?.niveau ?? null}
            >
              {meres.length === 0 ? (
                <p>{web === null ? t.nonDetermine : categorie(web.categorie)}</p>
              ) : (
                <ul className="couche-liste">
                  {meres.map(({ so, mere }) => (
                    <li key={so.cle}>
                      {mere === null
                        ? t.nonDetermine
                        : t.pays.valeur(pays(mere === "sommet" ? so.pays : mere.pays), categorie(so.categorie))}
                    </li>
                  ))}
                </ul>
              )}
            </Couche>
            <Couche
              numero={8}
              titre={t.cdn.titre}
              source={t.cdn.source(s.referentiels.cdn ?? t.nonDetermine)}
              date={collecte}
              niveau={null}
            >
              <p>
                {web?.cdn
                  ? t.liste([
                      web.cdn.nom,
                      t.cdn.methode[web.cdn.methode as keyof typeof t.cdn.methode] ?? web.cdn.methode,
                    ])
                  : t.cdn.aucun}
              </p>
            </Couche>
            <Couche numero={9} titre={t.secnumcloud.titre} source={t.secnumcloud.source} date={null} niveau={null}>
              <p>{t.secnumcloud.valeur}</p>
            </Couche>
          </ol>
        </section>
        <aside className="radiographie-chaine" aria-labelledby="titre-chaine">
          <h2 id="titre-chaine" className="etiquette-capitales">
            {t.chaine}
          </h2>
          <ol className="chaine">
            <li>
              <a href="#couche-1">{t.site}</a>
              <span className="valeur">
                <Valeur texte={r.nomWeb} />
              </span>
            </li>
            <li>
              <a href="#couche-2">{t.serveurs.titre}</a>
              <span>{t.liste(societesDesHotes(r.serveurs.hotes).map((x) => x.nom)) || t.nonDetermine}</span>
            </li>
            <li>
              <a href="#couche-4">{t.reseau.titre}</a>
              <span className="valeur">
                {t.liste([...new Set((web?.reseaux ?? []).map((x) => `AS${x.as}`))]) || t.nonDetermine}
              </span>
            </li>
            <li>
              <a href="#couche-5">{t.exploitant.titre}</a>
              <span>{t.liste(lesSocietes.map((x) => x.nom)) || t.nonDetermine}</span>
            </li>
            <li>
              <a href="#couche-6">{t.mere.titre}</a>
              <span>
                {t.liste(
                  meres.map(({ so, mere }) => (mere === null ? t.nonDetermine : mere === "sommet" ? so.nom : mere.nom)),
                ) || t.nonDetermine}
              </span>
            </li>
            <li>
              <a href="#couche-7">{t.pays.titre}</a>
              <span>{web === null ? t.nonDetermine : categorie(web.categorie)}</span>
            </li>
          </ol>
        </aside>
      </div>
      <section className="releve" aria-labelledby="titre-messagerie">
        <h2 id="titre-messagerie">{t.messagerie.titre}</h2>
        {r.messagerie.etat === "aucun" ? (
          <p>{t.messagerie.aucun}</p>
        ) : r.messagerie.etat === "nul" ? (
          <p>{t.messagerie.nul}</p>
        ) : r.messagerie.etat === "echec" ? (
          <p>{t.messagerie.echec}</p>
        ) : (
          <>
            <Societes liste={societesDesHotes(r.messagerie.hotes)} />
            {expert ? <Valeurs valeurs={r.messagerie.mx.map((m) => m.hote)} /> : null}
            <p className="releve-note">
              {t.liste([t.champ(t.niveau, niveau(r.messagerie.niveau)), categorie(r.messagerie.categorie)])}
            </p>
          </>
        )}
      </section>
      <section className="releve" aria-labelledby="titre-verifier">
        <h2 id="titre-verifier">{t.verifier.titre}</h2>
        <p>{t.verifier.chapo}</p>
        <h3 className="etiquette-capitales">{t.verifier.windows}</h3>
        <pre className="commande valeur">
          {[
            t.verifier.commandeWindows("A", r.nomWeb),
            t.verifier.commandeWindows("NS", r.domaine),
            t.verifier.commandeWindows("MX", r.domaine),
          ].join("\n")}
        </pre>
        <h3 className="etiquette-capitales">{t.verifier.macLinux}</h3>
        <pre className="commande valeur">
          {[
            t.verifier.commandeDig("A", r.nomWeb),
            t.verifier.commandeDig("NS", r.domaine),
            t.verifier.commandeDig("MX", r.domaine),
          ].join("\n")}
        </pre>
      </section>
    </div>
  );
}
