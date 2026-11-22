// The open data's words (F.1), apart from the dictionary (lib/i18n/fr.ts): the globe, the atlas and the search take
// the dictionary to the browser, and these words name the day's files, a sign of data (« donnees-courant ») that the
// browser's files never carry while the door is closed (scan:build). Only the server reads this module.
const NBSP = " ";

/** The open data's page (F.1): the day's files, their licences, the dated sources, how to check a file. */
export const donneesOuvertes = {
  titre: "Les données",
  description: `Les données de Sovermap, librement réutilisables${NBSP}: l’état du jour en CSV et en JSON, avec leur schéma, leurs licences, leurs sources datées et leurs sommes de contrôle.`,
  chapo: `Tout ce que Sovermap publie se réutilise librement. Voici l’état du jour, en fichiers ouverts.`,
  fichiers: "Les fichiers du jour",
  fichiersDate: (date: string) =>
    `L’état publié du ${date}, remplacé chaque jour, avant l’ouverture marqué «${NBSP}en préparation${NBSP}».`,
  noms: {
    "sovermap-domains.csv": "les domaines, couche par couche (CSV)",
    "sovermap-domains.json": "les domaines (JSON)",
    "sovermap-operators.csv": "les exploitants, sociétés ou organismes publics (CSV)",
    "sovermap-operators.json": "les exploitants (JSON)",
    "sovermap-ministries.csv": "les ministères (CSV)",
    "sovermap-ministries.json": "les ministères (JSON)",
    "sovermap-countries.csv": "les pays des sièges (CSV)",
    "sovermap-countries.json": "les pays des sièges (JSON)",
    "datapackage.json": "le schéma de chaque fichier, ses champs décrits en français, sa licence et ses sources",
    SHA256SUMS: "les sommes de contrôle",
    "donnees-courant.tar.gz": "l’état complet du jour, tel que le site le lit",
  },
  licences: "Les licences",
  licencesTexte: [
    `Les données${NBSP}: Licence Ouverte${NBSP}2.0, sauf les noms d’organisations tirés de la base du RIPE, qui restent soumis à ses conditions.`,
    `Le code${NBSP}: EUPL${NBSP}1.2.`,
    `Le titulaire${NBSP}: «${NBSP}Les contributeurs de Sovermap${NBSP}».`,
  ],
  sources: "Les sources du jour",
  methode: (version: string) => `Version de la méthode${NBSP}: ${version}.`,
  source: (id: string, fiche: number, date: string, etat: string) =>
    `${id} (fiche ${fiche} du registre des sources)${NBSP}: copie du ${date}, ${etat}.`,
  sansDate: "date inconnue",
  verifier: "Vérifier un fichier",
  verifierTexte:
    "Chaque fichier a sa somme de contrôle SHA-256 dans SHA256SUMS. Pour la vérifier, dans le dossier des fichiers téléchargés :",
  commandes: {
    windows: "Get-FileHash -Algorithm SHA256 sovermap-domains.csv",
    unix: "sha256sum -c SHA256SUMS",
  },
  commandeWindows: "Commande Windows (PowerShell)",
  commandeUnix: "Commande macOS ou Linux",
  jeu: "Sovermap : qui héberge les sites publics français",
  /** The attributions (docs/sources.md), each with the real date of the file the day's state was made from. */
  attributions: {
    exigees: "Les attributions exigées",
    exigeesIntro:
      "Celles que la licence ou les conditions de chaque source exigent, chacune avec la date réelle du fichier dont l’état du jour est fait. Aucune ne vaut aval du producteur.",
    courtoisie: "Les attributions de courtoisie",
    courtoisieIntro: "Celles qu’aucune licence n’exige, données par courtoisie, datées de même.",
    /** « du 21/11/2026 », or « du 20/11/2026 au 21/11/2026 » for files or readings of several days. */
    periode: (debut: string, fin: string) => (debut === fin ? `du ${fin}` : `du ${debut} au ${fin}`),
    dinumArchive: (date: string) =>
      `Source${NBSP}: DINUM / Etalab, liste des noms de domaine des organismes publics, copie archivée du ${date}, https://github.com/etalab/noms-de-domaine-organismes-publics, Licence Ouverte${NBSP}2.0.`,
    dinum: (date: string) =>
      `Source${NBSP}: DINUM, liste des noms de domaine des organismes publics, version du ${date}, Licence Ouverte${NBSP}2.0.`,
    dila: (fichier: string, date: string) =>
      `Source${NBSP}: Service-Public.gouv.fr / DILA, Référentiel de l’organisation administrative de l’État, fichier ${fichier} du ${date}, https://echanges.dila.gouv.fr/OPENDATA/RefOrgaAdminEtat/FluxAnneeCourante/dila_refOrga_admin_Etat_fr_latest.zip, Licence Ouverte.`,
    sig: (date: string) =>
      `Source${NBSP}: Service d’information du Gouvernement (SIG), Observatoire de l’écosystème numérique de l’État – Sites internet, mise à jour du ${date} — Licence Ouverte${NBSP}2.0.`,
    mesr: (date: string) =>
      `Source${NBSP}: ministère de l’Enseignement supérieur, de la Recherche et de l’Espace, Principaux établissements d’enseignement supérieur, mis à jour le ${date} — Licence Ouverte.`,
    sirene: (periode: string) => `Source${NBSP}: Insee, base Sirene (www.insee.fr), données lues ${periode}.`,
    ripe: (date: string) =>
      `Noms des organisations de la région du RIPE${NBSP}: RIPE Database (RIPE NCC), copie du ${date}, soumise aux RIPE Database Terms and Conditions.`,
    ue: (date: string) =>
      `Codes et noms des pays${NBSP}: Office des publications de l’Union européenne, EU Vocabularies (table «${NBSP}Countries and territories${NBSP}») et Code de rédaction interinstitutionnel (annexe A6), lus le ${date}.`,
    ueCcBy: (annee: string) =>
      `Liste des États membres et décisions d’adéquation de la Commission${NBSP}: Copyright Union européenne, ${annee}, CC${NBSP}BY${NBSP}4.0.`,
    rir: (periode: string) =>
      `Pays d’enregistrement des AS${NBSP}: fichiers statistiques des registres Internet régionaux (RIPE NCC, ARIN, APNIC, LACNIC, AFRINIC), ${periode}.`,
    iptoasn: (date: string) => `IP → AS${NBSP}: IPtoASN (iptoasn.com), PDDL${NBSP}1.0, relevé du ${date}.`,
    gleif: (periode: string) => `Données LEI${NBSP}: GLEIF, lues ${periode}.`,
    naturalEarth: `Fond de carte${NBSP}: Natural Earth (domaine public).`,
    psl: (date: string) =>
      `Domaines enregistrés${NBSP}: Public Suffix List (publicsuffix.org), MPL${NBSP}2.0, version du ${date}.`,
    cellar: `Références des décisions de l’UE${NBSP}: Cellar, Office des publications de l’Union européenne.`,
  },
};
