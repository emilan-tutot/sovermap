// French dictionary: the one source of every text shown or read aloud by the site, metadata included. No text is
// written in a component: `npm run lint:design` refuses it (DESIGN.md §9). English comes after the launch (decision D5,
// chantier T11) and will follow this file key for key. French typography: a non-breaking space before « : ; ! ? » and
// inside « », compound names never split (DESIGN.md §6).
const NBSP = " ";

export const fr = {
  site: {
    name: "Sovermap",
    question: `Qui héberge l’État${NBSP}?`,
    description: `Pour chaque site public français${NBSP}: chez qui il est hébergé ou diffusé, à quelle société il appartient et dans quel pays est son siège, jour après jour.`,
  },
  meta: {
    /** The title of a page, followed by the name of the site. */
    titre: (page: string) => `${page} · Sovermap`,
    accueil: `Qui héberge l’État${NBSP}? · Sovermap`,
  },
  coque: {
    evitement: "Aller au contenu",
    logo: "Sovermap, accueil",
    /** The navigation of the full site (DESIGN.md §9), behind an open door only. */
    navigation: {
      libelle: "Navigation principale",
      atlas: "Atlas",
      ministeres: "Ministères",
      societes: "Sociétés",
      journal: "Journal",
      methode: "Méthode",
      donnees: "Données",
    },
    filAriane: "Fil d’Ariane",
  },
  attente: {
    title: "En préparation",
    lead: "Sovermap mesurera chaque jour l’hébergement des sites publics français, couche par couche, avec ses sources et sa méthode.",
    status: "Le site n’est pas encore ouvert. Aucune donnée n’est publiée pour l’instant.",
    /** The text alternative of the waiting page's share image (public/partage.png). */
    partage: `Sovermap · Qui héberge l’État${NBSP}? Le site est en préparation.`,
  },
  /**
   * The share images of the full site (D.7, proposal A « la question »: public/partage/<type>.png, drawn by
   * scripts/design/partage.ts), one per kind of page: its kind, its question, one sentence; and their text alternative.
   */
  partage: {
    accueil: {
      etiquette: "Atlas",
      question: `Qui héberge l’État${NBSP}?`,
      phrase: `Chaque site public français${NBSP}: la société qui le sert et le pays du siège de sa maison mère, jour après jour.`,
    },
    radiographie: {
      etiquette: "Radiographie",
      question: `Qui héberge ce site${NBSP}?`,
      phrase: "Du nom du site au pays du siège de la société qui le sert, couche par couche, chacune avec sa source.",
    },
    ministere: {
      etiquette: "Ministère",
      question: `Qui héberge ses sites${NBSP}?`,
      phrase: "Les sites d’un ministère, la société qui sert chacun d’eux et le pays du siège de sa maison mère.",
    },
    societe: {
      etiquette: "Société",
      question: `Quels sites publics sert-elle${NBSP}?`,
      phrase: "Les domaines qu’elle sert, sa chaîne de propriété jusqu’à la maison mère, et le pays de son siège.",
    },
    pays: {
      etiquette: "Pays du siège",
      question: `Quels sites publics dépendent de ses sociétés${NBSP}?`,
      phrase: "Le pays du siège de la maison mère, jamais l’emplacement des serveurs.",
    },
    alt: (etiquette: string, question: string) => `Sovermap · ${etiquette}${NBSP}: ${question}`,
  },
  /** The open data's page (F.1): the day's files, their licences, the dated sources, how to check a file. */
  donneesOuvertes: {
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
  },
  /** The text pages (part E): their shared words. Each page's own words: lib/i18n/fr-textes.ts. */
  textes: {
    sources: "Les sources",
    revision: (date: string) => `Révisé le ${date}.`,
    iaNonRelu: `Ce texte a été rédigé avec l’aide d’une intelligence artificielle${NBSP}; l’éditeur ne l’a pas encore relu.`,
    iaRelu: "Textes rédigés avec l’aide d’une IA.",
    voirCredits: "Voir les Crédits.",
  },
  footer: {
    version: `Version servie${NBSP}:`,
    independent: "Site indépendant, sans lien avec l’État.",
    /** The links to the text pages, behind an open door. */
    liens: "Pages du site",
  },
  notFound: {
    code: "404",
    title: "Page introuvable",
    lead: "Cette adresse ne correspond à aucune page de Sovermap.",
    back: "Retour à l’accueil",
  },
  globe: {
    titre: "Les fils de la France vers les pays des sièges",
    honnetete: "Les fils vont vers le pays du siège de la maison mère, pas vers l’emplacement d’un serveur.",
    descriptionScene: `Globe${NBSP}: des fils partent de la France vers les pays des sièges des maisons mères. La liste des pays suit.`,
    chargement: "Chargement de la carte en relief",
    recentrer: "Recentrer",
    explorer: "Explorer le globe",
    terminer: "Terminer l’exploration",
    aideTactile: `Glissez pour tourner. Touchez «${NBSP}Terminer l’exploration${NBSP}» pour reprendre le défilement.`,
    repli: `Carte fixe${NBSP}: animations réduites, économie de données ou WebGL indisponible.`,
  },
  /** Every page of the full site (plan § 6, point 2). */
  fraicheur: {
    derniereCollecte: (date: string) => `Dernière collecte${NBSP}: ${date}`,
    dateHeure: (date: string, heure: string) => `${date}, ${heure}${NBSP}UTC`,
    enRetard: "Données en retard",
    retard: (heures: string) => `Dernière collecte il y a ${heures}${NBSP}h, au-delà de 36${NBSP}h.`,
  },
  /** The Quality page (D.2, EX-16): what the day's collection measured and how it was checked. */
  qualite: {
    titre: "Qualité et fraîcheur",
    description: `La qualité des données du jour${NBSP}: la date de la dernière collecte, l’âge de chaque source, la couverture, les échecs et les contrôles qui l’ont validée.`,
    chapo: "Ce que la collecte du jour a mesuré, comment elle a été contrôlée, et l’âge de chacune de ses sources.",
    nonPublie: "non publié",
    /** The day and the end of the collection (etat.json says when it ended, not when it was published). */
    entete: (date: string, heure: string) => `Collecte du ${date}, finie à ${heure}${NBSP}UTC`,
    /** A time in UTC, never cut from its zone. */
    heureUtc: (heure: string) => `${heure}${NBSP}UTC`,
    jours: (n: number) => (n === 1 ? "1er jour publié" : `${n} jours publiés de suite`),
    sections: {
      collecte: "La collecte",
      couverture: "La couverture",
      echecs: "Les échecs",
      controles: "Les contrôles",
      gardeFous: "Les garde-fous",
      debit: "La politesse envers les serveurs",
      sources: "Les sources",
    },
    collecte: {
      debut: "Début",
      fin: "Fin",
      duree: "Durée",
      point: "Point de mesure",
      methode: "Méthode",
    },
    couverture: {
      noms: "Noms mesurés",
      surListe: (n: string) => `sur ${n} noms de la liste`,
      domaines: "Domaines",
      dontEtat: `dont périmètre «${NBSP}État${NBSP}»`,
    },
    echecs: {
      noms: "Noms en échec",
      parCode: "Par code",
      pannes: "Domaines en panne confirmée",
    },
    controles: {
      temoins: "Témoins (Quad9 et Cloudflare)",
      concordants: "concordants",
      discordants: "en désaccord",
      regle: `Règle «${NBSP}sous-zone interne${NBSP}»`,
      nomsEcartes: (n: string) => `${n} noms écartés`,
      controleRegle: (date: string, poses: string, avecAdresse: string) =>
        `${poses} noms reposés à Quad9 le ${date}${NBSP}; ${avecAdresse} avec une adresse`,
    },
    debit: {
      maximum: "Le plus de questions en une seconde vers un même serveur",
      auDela: "Secondes au-delà de 10 questions",
      surSecondes: (n: string, total: string, part: string) => `${n} sur ${total} (${part})`,
      tolerance: `Tolérance${NBSP}: jamais plus de 15, et au plus 0,1${NBSP}% des secondes au-delà de 10.`,
    },
    sources: {
      fiche: "Fiche",
      source: "Source",
      date: "Date",
      etat: "État",
    },
    /** The guards of the day's collection and their limits (proposals B and C). */
    gardeFous: {
      echecs: "Échecs non confirmés par le résolveur de contrôle",
      pannes: "Domaines en panne confirmée",
      debitPart: "Secondes au-delà de 10 questions vers un même serveur",
      debitMax: "Le plus de questions en une seconde vers un même serveur",
      fraicheur: "Âge de la dernière collecte",
      heures: (h: string) => `${h}${NBSP}h`,
      limite: (s: string) => `limite${NBSP}: ${s}`,
      tenu: "dans la limite",
      depasse: "au-delà de la limite",
      lecture: (libelle: string, valeur: string, limite: string) => `${libelle}${NBSP}: ${valeur}, ${limite}.`,
      colonnes: { controle: "Contrôle", valeur: "Valeur", limite: "Limite", resultat: "Résultat" },
    },
  },
  /** The Radiographie of a domain (D.2; spec R2, R3, R5): its layers, from the site to the country of a seat. */
  radiographie: {
    titre: (domaine: string) => `${domaine}${NBSP}: qui héberge ce site${NBSP}?`,
    description: (domaine: string) =>
      `Radiographie de ${domaine}${NBSP}: serveurs de noms, adresses, réseau, société, maison mère et pays du siège, chacun avec sa source et sa date.`,
    surtitre: "Radiographie",
    chapo:
      "Les couches du site, de son nom au pays du siège de la société qui le sert. Chaque couche donne sa source, sa date et son niveau de confiance.",
    indisponible: "Les données de ce domaine n’ont pas pu être lues. Réessayez plus tard.",
    modes: { libelle: "Affichage", simple: "Simple", expert: "Expert" },
    collecte: (date: string) => `Collecte du ${date}`,
    couches: "Les couches",
    chaine: "La chaîne, du site au pays du siège",
    source: "Source",
    date: "Date",
    niveau: "Niveau",
    nonDetermine: "non déterminé",
    partiel: "Fiche partielle ce jour-là (listes raccourcies ou fiche réduite).",
    categories: {
      France: "France",
      "UE hors France": "UE hors France",
      "Europe hors UE": "Europe hors UE",
      "hors d'Europe": "hors d’Europe",
      "non déterminé": "non déterminé",
    },
    niveaux: { confirmé: "confirmé", probable: "probable", "non déterminé": "non déterminé" },
    /** A company and its country: « Celeste · France ». */
    societe: (nom: string, pays: string) => `${nom} · ${pays}`,
    /** An AS: « AS34177 », and its holder when the day's index publishes it. */
    as: (numero: number, titulaire: string | null) =>
      titulaire === null ? `AS${numero}` : `AS${numero} · ${titulaire}`,
    liste: (valeurs: readonly string[]) => valeurs.join(", "),
    /** A list whose items hold commas. */
    listeLongue: (valeurs: readonly string[]) => valeurs.join(`${NBSP}; `),
    site: "Le site",
    resolveurs: { quad9: "Quad9", cloudflare: "Cloudflare" },
    /** « Niveau : probable », « Preuve : AS34177 ». */
    champ: (libelle: string, valeur: string) => `${libelle}${NBSP}: ${valeur}`,
    /** « Périmètre « État » (domaine en .gouv.fr, Référentiel de la DILA) ». */
    avecRaisons: (perimetre: string, raisons: readonly string[]) =>
      raisons.length === 0 ? perimetre : `${perimetre} (${raisons.join(", ")})`,
    /** « Hébergé par Celeste · France ». */
    role: (role: string, societe: string) => `${role} ${societe}`,
    domaine: {
      titre: "Le domaine",
      nomWeb: "Nom web",
      etat: `Périmètre «${NBSP}État${NBSP}»`,
      horsEtat: `Hors du périmètre «${NBSP}État${NBSP}»`,
      raisons: {
        "gouv.fr": "domaine en .gouv.fr",
        dila: "Référentiel de la DILA",
        sig: "Observatoire du SIG",
        mesr: "MESR",
      },
      ministeres: "Ministères",
      autresNoms: (n: number) => (n === 1 ? "1 autre nom mesuré" : `${n} autres noms mesurés`),
      provenances: {
        dinum: "Liste des noms de domaine des organismes publics (DINUM)",
        dila: "Référentiel de l’organisation administrative de l’État (DILA)",
        sig: "Observatoire de l’écosystème numérique de l’État, sites internet (SIG)",
        mesr: "Principaux établissements d’enseignement supérieur (MESR)",
        domaine: "Ajouté comme nom web de son domaine",
      },
      copies: (source: string, dates: readonly string[]) =>
        dates.length === 0
          ? source
          : dates.length === 1
            ? `${source}, copie du ${dates[0]}`
            : `${source}, copies du ${dates.slice(0, -1).join(", du ")} et du ${dates.at(-1)}`,
    },
    serveurs: {
      titre: "Les serveurs de noms",
      valeur: (n: number) => (n === 1 ? "1 serveur de noms" : `${n} serveurs de noms`),
      dnssec: "DNSSEC",
      dnssecOui: "réponses validées",
      dnssecNon: "réponses non validées",
      source: "DNS, résolveur de la collecte",
    },
    adresses: {
      titre: "Les adresses",
      ok: "Le nom web répond",
      nxdomain: "Le nom web n’existe pas (NXDOMAIN)",
      nodata: "Le nom web existe, sans adresse (NODATA)",
      echec: (code: string) => `Question en échec (${code})`,
      echecConfirme: (code: string, par: string) => `Question en échec (${code}), confirmé par ${par}`,
      familleEnEchec: (famille: string) => `Adresses ${famille}${NBSP}: question en échec, inconnues`,
      cname: "Chaîne CNAME",
      plages: "Plages d’adresses",
      plage: (debut: string, fin: string) => `${debut} à ${fin}`,
      controle: (resolveur: string, accord: boolean) =>
        accord
          ? `Contrôle par ${resolveur}${NBSP}: même réponse`
          : `Contrôle par ${resolveur}${NBSP}: réponse différente`,
      source: "DNS, résolveur de la collecte, et résolveur de contrôle",
    },
    reseau: {
      titre: "Le réseau",
      aucun: "Aucun réseau",
      enregistre: (pays: string) => `enregistré${NBSP}: ${pays}`,
      source: (iptoasn: string, ris: string) =>
        `IPtoASN, relevé du ${iptoasn}${NBSP}; RIS du RIPE${NBSP}NCC, du ${ris}`,
    },
    exploitant: {
      titre: "La société exploitante",
      role: { "hébergé par": "Hébergé par", "diffusé par": "Diffusé par" },
      preuve: "Preuve",
      aucune: "Aucune société établie",
      source: (version: string) =>
        `Référentiels de Sovermap, version ${version} (sources de chaque ligne dans le registre)`,
    },
    mere: {
      titre: "La maison mère",
      sommet: (nom: string) => `${nom}, au sommet de sa chaîne`,
      nomNonPublie: "nom non publié ce jour-là",
      /** « qui possède qui »: « OVH SAS → OVH Groupe ». */
      chaine: (noms: readonly string[]) => noms.join(" → "),
    },
    pays: {
      titre: "Le pays du siège",
      /** « États-Unis · hors d’Europe »; « France » once, never « France · France ». */
      valeur: (pays: string, categorie: string) => (pays === categorie ? pays : `${pays} · ${categorie}`),
    },
    cdn: {
      titre: "Le CDN",
      aucun: "Aucun CDN reconnu",
      methode: { cname: "reconnu par son CNAME", plage: "reconnu par sa plage d’adresses", as: "reconnu par son AS" },
      source: (version: string) =>
        `Référentiel des CDN de Sovermap, version ${version}, et listes officielles des fournisseurs`,
    },
    secnumcloud: {
      titre: "Les offres SecNumCloud",
      valeur: "Pas encore reliées aux sociétés (chantier en cours)",
      source: "Catalogue des services qualifiés de l’ANSSI",
    },
    messagerie: {
      titre: "La messagerie",
      aucun: "Aucun serveur de messagerie",
      nul: "Messagerie refusée (MX nul)",
      echec: "Question en échec",
    },
    verifier: {
      titre: "Vérifier vous-même",
      chapo: "Les mêmes questions DNS, posées depuis votre ordinateur au résolveur public Quad9.",
      windows: "Windows (PowerShell)",
      macLinux: "macOS et Linux",
      /** The commands: values, never translated. */
      commandeWindows: (type: string, nom: string) => `Resolve-DnsName -Name ${nom} -Type ${type} -Server 9.9.9.9`,
      commandeDig: (type: string, nom: string) => `dig ${type} ${nom} @9.9.9.9`,
    },
  },
  /** The companies (D.2, R9): who hosts or delivers the measured sites, who owns whom. */
  societes: {
    titre: "Les sociétés",
    description: `Les sociétés qui hébergent ou diffusent les sites publics mesurés par Sovermap${NBSP}: qui possède qui, et le pays du siège de leur maison mère.`,
    chapo:
      "Les sociétés qui hébergent ou diffusent les sites mesurés, dans l’ordre alphabétique. Un organisme public y figure avec sa nature, jamais comme une société.",
    entete: (n: string) => `${n}${NBSP}sociétés et organismes`,
    domaines: (n: number, texte: string) => (n === 1 ? "1 domaine servi" : `${texte} domaines servis`),
    siege: (pays: string, categorie: string) =>
      `Siège de la maison mère${NBSP}: ${pays === categorie ? pays : `${pays} · ${categorie}`}`,
    siegeInconnu: "Maison mère non déterminée",
    /** The list's proposed forms (point 11): the table's columns, the groups' titles, an index's letter. */
    colonnes: { societe: "Société ou organisme", siege: "Siège de la maison mère", domaines: "Domaines servis" },
    /** The seat in the table's column, whose header already names it. */
    siegeCourt: (pays: string, categorie: string) => (pays === categorie ? pays : `${pays} · ${categorie}`),
    groupes: {
      France: "France",
      "UE hors France": "Union européenne, hors France",
      "Europe hors UE": "Europe, hors Union européenne",
      "hors d'Europe": "Hors d’Europe",
      "non déterminé": "Maison mère non déterminée",
    },
    lettre: (lettre: string) => `Lettre ${lettre}`,
    controle: (texte: string) => `Contrôle${NBSP}: ${texte}`,
    surtitre: "Exploitant",
    titrePage: (nom: string) => `${nom}${NBSP}: les sites publics servis`,
    descriptionPage: (nom: string) =>
      `Les domaines des sites publics servis par ${nom}, sa chaîne de propriété et le pays du siège de sa maison mère.`,
    pays: (pays: string) => `Pays${NBSP}: ${pays}`,
    chaine: "Qui possède qui",
    sommet: "Au sommet de sa chaîne.",
    mereInconnue: `Maison mère non déterminée${NBSP}: aucune source permise ne l’établit.`,
    chaineNonPubliee: "Chaîne de propriété non publiée ce jour-là.",
    listeDomaines: "Les domaines servis",
    page: (p: number, n: number) => `Page ${p} sur ${n}`,
    precedente: "Page précédente",
    suivante: "Page suivante",
    pagination: "Pages de la liste",
    source: (version: string) => `Source${NBSP}: référentiels de Sovermap, version ${version}, et collecte du jour.`,
  },
  /** The ministries (D.2, R8): the sites the DILA's Référentiel links to each ministry, and who serves them. */
  ministeres: {
    titre: "Les ministères",
    description: `Les ministères et les services de l’État auxquels le Référentiel de la DILA rattache des sites${NBSP}: qui les héberge ou les diffuse, et le pays du siège de sa maison mère.`,
    chapo:
      "Les ministères et les services de l’État auxquels le Référentiel de l’organisation administrative de l’État (DILA) rattache des sites mesurés, dans l’ordre alphabétique.",
    entete: (n: string) => `${n}${NBSP}ministères et services`,
    domaines: (n: number, texte: string) => (n === 1 ? "1 domaine" : `${texte} domaines`),
    /** The list's proposed forms (point 11): the table's columns, the groups by nature, an index's letter. */
    colonnes: { ministere: "Ministère ou service", domaines: "Domaines" },
    natures: { ministeres: "Les ministères", autres: "Les autres services de l’État" },
    lettre: (lettre: string) => `Lettre ${lettre}`,
    surtitre: "Ministère",
    titrePage: (nom: string) => `${nom}${NBSP}: qui héberge ses sites${NBSP}?`,
    descriptionPage: (nom: string) =>
      `Les sites de ${nom}${NBSP}: la société qui sert chacun d’eux et le pays du siège de sa maison mère.`,
    repartition: "Le pays du siège de la maison mère",
    repartitionNote:
      "Pour chaque domaine, la société qui sert son nom web (celle qui le diffuse quand un CDN s’interpose, sinon celle qui l’héberge).",
    groupes: "Les domaines, par société",
    sansSociete: "Société non déterminée",
    ligne: (categorie: string, n: string) => `${categorie}${NBSP}: ${n}`,
    /** The constellation (DESIGN.md §5). */
    constellation: {
      titre: "La constellation",
      legende: "Légende de la constellation",
      genres: {
        "hors-ue": "Maison mère hors de l’Union européenne",
        ue: "Maison mère en France ou dans l’Union",
        inconnu: "Société ou maison mère non déterminée",
      },
      taille: "Un disque par site ; un groupe par société, plus grand avec plus de sites.",
      libelleGroupe: (nom: string, n: number, genre: string) =>
        `${nom}${NBSP}: ${n === 1 ? "1 site" : `${n}${NBSP}sites`}, ${genre.toLowerCase()}`,
    },
    source: `Source${NBSP}: Référentiel de l’organisation administrative de l’État (DILA), et collecte du jour.`,
  },
  /** The journal (D.2, R10): the changes of hosting confirmed by two successive collections, day by day. */
  journal: {
    titre: "Le journal",
    description: `Les changements d’hébergement des sites publics confirmés par deux collectes successives, jour par jour.`,
    chapo:
      "Les changements d’hébergement confirmés par deux collectes successives, jour par jour. Un changement de liste, de référentiel ou de méthode n’y entre jamais.",
    etatInitial: `État initial${NBSP}: le premier jour publié, rien à comparer.`,
    reglesChangees: `Règles nouvelles ce jour-là${NBSP}: la veille a été reclassée, rien n’entre au journal.`,
    changements: (n: number, texte: string) =>
      n === 0 ? "Aucun changement confirmé" : n === 1 ? "1 changement confirmé" : `${texte} changements confirmés`,
    jour: (date: string) => `Le ${date}`,
    titreJour: (date: string) => `Le journal du ${date}`,
    descriptionJour: (date: string) => `Les changements d’hébergement des sites publics confirmés le ${date}.`,
    couches: { adresses: "Les adresses", serveursDeNoms: "Les serveurs de noms", messagerie: "La messagerie" },
    avantApres: (avant: string, apres: string) => `${avant} → ${apres}`,
    retour: "Tous les jours",
  },
  /** A country (D.2, R7): the companies whose ultimate parent has its seat there. */
  pays: {
    surtitre: "Pays du siège",
    titrePage: (nom: string) => `${nom}${NBSP}: les sites publics servis depuis ses sociétés`,
    descriptionPage: (nom: string) =>
      `${nom}${NBSP}: les sociétés dont la maison mère y a son siège, et les domaines des sites publics qu’elles servent.`,
    honnetete: "Le pays du siège de la maison mère, pas l’emplacement des serveurs.",
    domaines: (n: string, etat: string) =>
      `${n}${NBSP}domaines servis, dont ${etat}${NBSP}du périmètre «${NBSP}État${NBSP}»`,
    societes: "Les sociétés",
    aucune: "Aucune société dont la maison mère a son siège dans ce pays, ce jour-là.",
  },
  /** The Atlas (D.2): the question, the headline figure and its neighbours, the globe and its table. */
  atlas: {
    auMoins: (pourcent: string) => `Au moins ${pourcent}`,
    definition: (domaines: string) =>
      `des ${domaines}${NBSP}domaines du périmètre «${NBSP}État${NBSP}» sont servis par au moins une société dont la maison mère a son siège hors de l’Union européenne, établi par deux sources indépendantes à chaque étape («${NBSP}confirmé${NBSP}»).`,
    probable: (pourcent: string) => `Probable${NBSP}: ${pourcent} de plus`,
    nonDetermine: (pourcent: string) => `Non déterminé${NBSP}: ${pourcent}`,
    collecte: (date: string) => `Collecte du ${date}`,
    sousChiffres: "À côté",
    gouvFr: (pourcent: string, domaines: string) => `Domaines en .gouv.fr${NBSP}: au moins ${pourcent} de ${domaines}`,
    serveursDeNoms: (pourcent: string, domaines: string) =>
      `Serveurs de noms${NBSP}: au moins ${pourcent} de ${domaines} domaines`,
    messagerie: (pourcent: string, domaines: string) =>
      `Messagerie${NBSP}: au moins ${pourcent} de ${domaines} domaines`,
    tableau: "Les pays des sièges, en tableau",
    colonnes: {
      pays: "Pays du siège",
      domaines: `Domaines du périmètre «${NBSP}État${NBSP}»`,
      categorie: "Union européenne",
    },
    horsUE: "hors UE",
    dansUE: "dans l’UE",
    panneau: (n: string) => `${n}${NBSP}domaines du périmètre «${NBSP}État${NBSP}» servis depuis ce pays du siège`,
    voirPays: "Voir la page du pays",
    fermer: "Fermer",
    /** The time slider (D.2), from two published days. */
    temps: {
      libelle: "Le chiffre, jour après jour",
      jour: (date: string, auMoins: string, probable: string, nonDetermine: string) =>
        `Le ${date}${NBSP}: au moins ${auMoins}${NBSP}; probable${NBSP}: ${probable} de plus${NBSP}; non déterminé${NBSP}: ${nonDetermine}.`,
      reglesChangees: (methode: string) =>
        `Règles nouvelles ce jour-là (méthode ${methode})${NBSP}: un écart avec la veille vient des règles, jamais d’un déménagement.`,
    },
  },
  /** The search (D.2, R4). */
  recherche: {
    libelle: "Chercher un site, un ministère, une société ou un pays",
    exemple: "impots.gouv.fr, Culture, OVH, États-Unis…",
    chargement: "Chargement de l’index…",
    erreur: "La recherche n’a pas pu se charger. Réessayez plus tard.",
    nombre: (n: number) => (n === 0 ? "Aucun résultat" : n === 1 ? "1 résultat" : `${n}${NBSP}résultats`),
    categories: { d: "Domaine", s: "Exploitant", m: "Ministère ou service de l’État", p: "Pays du siège" },
    categorieEtat: `Domaine, périmètre «${NBSP}État${NBSP}»`,
  },
} as const;

export type Dictionary = typeof fr;
