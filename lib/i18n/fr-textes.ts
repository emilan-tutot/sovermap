// The words of the text pages (part E), page by page: the one source of what they say, with their sources and the day
// of their last revision. Not read again by the publisher yet (relu: false), until the review of brief E.5. French
// typography: a non-breaking space before « : ; ! ? » and inside « » (DESIGN.md §6).
import { type Editeur, HEBERGEUR } from "@/lib/editeur";
import type { PageDeTexte, Segment } from "@/lib/textes";

const NBSP = " ";
const REVISION = "2026-11-22";

/**
 * French typography for a text written with plain spaces: a non-breaking space before « : ; ! ? », inside « », and
 * between the groups of a number (1 900). Applied to every text of every page, so that none can miss it.
 */
export function typographie(texte: string): string {
  return texte
    .replace(/ ([:;!?»])/g, `${NBSP}$1`)
    .replace(/« /g, `«${NBSP}`)
    .replace(/(\d) (?=\d{3}\b)/g, `$1${NBSP}`);
}

const segment = (s: Segment): Segment =>
  typeof s === "string" ? typographie(s) : "valeur" in s ? s : { ...s, lien: typographie(s.lien) };

/** A page, its typography set. */
function soignee(p: PageDeTexte): PageDeTexte {
  return {
    ...p,
    titre: typographie(p.titre),
    description: typographie(p.description),
    chapo: typographie(p.chapo),
    sections: p.sections.map((s) => ({
      ...s,
      ...(s.titre === undefined ? {} : { titre: typographie(s.titre) }),
      blocs: s.blocs.map((b) =>
        "paragraphe" in b ? { paragraphe: b.paragraphe.map(segment) } : { liste: b.liste.map((e) => e.map(segment)) },
      ),
    })),
    sources: p.sources.map((s) => s.map(segment)),
  };
}

export const aPropos: PageDeTexte = soignee({
  chemin: "/a-propos",
  court: "À propos",
  titre: "À propos de Sovermap",
  description: `Sovermap est un site indépendant${NBSP}: chaque jour, il mesure par le DNS qui sert les sites publics français, avec ses sources et sa méthode.`,
  chapo: "Un site indépendant, sans lien avec l’État.",
  sections: [
    {
      blocs: [
        {
          paragraphe: [
            "Il n’est pas pour autant sans lien avec les sociétés qu’il décrit : il utilise les offres gratuites de Vercel (pour le site) et de GitHub, filiale de Microsoft (pour le code et les données), et son nom de domaine passe par Cloudflare, son registraire. Elles peuvent figurer parmi les sociétés mesurées (voir ",
            { lien: "Sovermap, passé à sa propre radiographie", vers: "/radiographie-de-sovermap" },
            ").",
          ],
        },
        {
          paragraphe: [
            `Chaque jour, Sovermap mesure par le DNS seulement (l’annuaire d’Internet) les sites publics français de la liste officielle des noms de domaine du secteur public, complétée par d’autres sources ouvertes${NBSP}: plus de 40${NBSP}000 domaines enregistrés, dont environ 1${NBSP}900 forment le périmètre «${NBSP}État${NBSP}».`,
          ],
        },
        {
          paragraphe: [
            "Pour chacun, il donne la société qui le sert et le pays du siège de sa maison mère, couche par couche, avec la source et la date de chaque couche.",
          ],
        },
        {
          paragraphe: [
            `Il ne visite jamais les sites mesurés${NBSP}: aucune page n’est téléchargée, aucune connexion n’est ouverte vers eux.`,
          ],
        },
        {
          paragraphe: [
            `Son code (licence EUPL${NBSP}1.2) et ses données (Licence Ouverte${NBSP}2.0) sont publics. Chacun peut refaire la mesure à la main${NBSP}: `,
            { lien: "la méthode", vers: "/methode" },
            " le montre, commande par commande.",
          ],
        },
        { paragraphe: ["Le site n’a ni compte ni publicité, et ne dépose lui-même aucun cookie ni traceur."] },
      ],
    },
  ],
  sources: [
    [
      `La méthode de Sovermap, §${NBSP}1 et §${NBSP}3 (41${NBSP}340 domaines enregistrés dans la liste mesurée au 21/11/2026 ; environ 1${NBSP}900 dans le périmètre «${NBSP}État${NBSP}»).`,
    ],
    ["Le registre des sources de Sovermap (la liste officielle des noms de domaine du secteur public)."],
  ],
  revision: REVISION,
  relu: false,
});

export const corrections: PageDeTexte = soignee({
  chemin: "/corrections",
  court: "Signaler une erreur",
  titre: "Signaler une erreur",
  description: `Une donnée de Sovermap vous semble fausse${NBSP}? Comment la signaler, ce qui se passe ensuite, et le droit de réponse sous trois jours.`,
  chapo: `Sovermap peut se tromper${NBSP}: une source en retard, une société mal rattachée à sa maison mère, un site mal classé. Signalez-le${NBSP}: chaque signalement est lu, et chaque correction est datée.`,
  sections: [
    {
      titre: "Comment signaler",
      blocs: [
        {
          liste: [
            [
              `Par une issue GitHub, avec le modèle «${NBSP}Signaler une erreur${NBSP}». Attention${NBSP}: une issue est publique. N’y écrivez aucune donnée personnelle.`,
            ],
            ["Par e-mail : l’adresse viendra avec l’ouverture du site."],
          ],
        },
        {
          paragraphe: ["Indiquez l’adresse de la page, ce qui vous semble faux et, si vous l’avez, une source."],
        },
      ],
    },
    {
      titre: "Ce qui se passe ensuite",
      blocs: [
        {
          liste: [
            ["Le signalement est lu, et confronté aux sources de la couche concernée."],
            ["Si l’erreur est confirmée, la donnée est corrigée à la collecte suivante, et le journal le dit."],
            [
              `Si la règle elle-même était en cause, la méthode change de version, et ce jour-là est marqué «${NBSP}règles nouvelles${NBSP}».`,
            ],
          ],
        },
      ],
    },
    {
      titre: "Le droit de réponse",
      blocs: [
        {
          paragraphe: [
            "Toute personne nommée ou désignée sur le site dispose d’un droit de réponse. Sa réponse est insérée dans les trois jours suivant sa réception, gratuitement, à côté de la page concernée.",
          ],
        },
      ],
    },
  ],
  sources: [
    [
      `Loi n°${NBSP}2004-575 du 21${NBSP}juin 2004 pour la confiance dans l’économie numérique, article 1-1, III (droit de réponse, trois jours).`,
    ],
    ["La méthode de Sovermap, ses versions et le journal des changements confirmés."],
  ],
  revision: REVISION,
  relu: false,
});

export const accessibilite: PageDeTexte = soignee({
  chemin: "/accessibilite",
  court: "Accessibilité",
  titre: "Déclaration d’accessibilité",
  description: `Sovermap publie volontairement sa déclaration d’accessibilité${NBSP}: le niveau visé (WCAG${NBSP}2.2 AA), ce qui est vérifié, et les contenus qui ont une alternative.`,
  chapo: `Sovermap n’est pas tenu par la loi de publier cette déclaration${NBSP}: il la publie volontairement, et vise le niveau AA des règles WCAG${NBSP}2.2.`,
  sections: [
    {
      titre: "État de conformité",
      blocs: [
        {
          paragraphe: [
            "Aucun audit d’accessibilité n’a encore été fait : le site ne déclare donc aucun état de conformité. L’objectif est le niveau AA des règles d’accessibilité WCAG 2.2. Déjà vérifié à chaque version, sur chaque type de page, à l’ordinateur et au téléphone : aucune erreur sérieuse ou critique de l’outil automatique axe, et aucun défilement horizontal.",
          ],
        },
      ],
    },
    {
      titre: "Ce qui est vérifié à chaque version du site",
      blocs: [
        {
          liste: [
            ["Un contrôle automatique (axe) de chaque type de page, sans violation sérieuse ni critique."],
            [
              "Un parcours au clavier : le lien d’évitement d’abord, puis un contour visible sur chaque élément atteint.",
            ],
            ["Aucun défilement horizontal, de 360 à 1 920 pixels de large, dans Edge, Firefox et WebKit (Safari)."],
            [
              "Le mouvement réduit : quand le visiteur le demande, les animations s’arrêtent et le globe devient une image fixe.",
            ],
            ["Le contraste des couleurs, mesuré."],
          ],
        },
      ],
    },
    {
      titre: "Contenus non accessibles, et leur alternative",
      blocs: [
        {
          liste: [
            ["Le globe en trois dimensions de l’Atlas : le tableau des pays, sous le globe, donne les mêmes chiffres."],
            ["La constellation d’un ministère : la liste de ses domaines, par société, sur la même page."],
          ],
        },
      ],
    },
    {
      titre: "Signaler un problème",
      blocs: [{ paragraphe: [{ lien: "Signaler une erreur", vers: "/corrections" }, "."] }],
    },
  ],
  sources: [
    [
      `Loi n°${NBSP}2005-102 du 11${NBSP}février 2005, article 47 (version issue de l’ordonnance n°${NBSP}2023-859) ; décret n°${NBSP}2019-768, article 2 : un site édité par un particulier, gratuit, n’entre dans aucune des catégories obligées.`,
    ],
    ["Le journal du design de Sovermap (contrastes mesurés) et ses tests de bout en bout (contrôles de chaque page)."],
  ],
  revision: REVISION,
  relu: false,
});

export const glossaire: PageDeTexte = soignee({
  chemin: "/glossaire",
  court: "Glossaire",
  titre: "Glossaire",
  description: `Les mots de Sovermap expliqués simplement${NBSP}: DNS, réseau (AS), société exploitante, maison mère, CDN, SecNumCloud, confirmé, probable.`,
  chapo: "Les mots du site, en une phrase chacun.",
  sections: [
    {
      blocs: [
        {
          liste: [
            [
              `DNS${NBSP}: l’annuaire d’Internet. Il traduit un nom en adresses de serveurs. Sovermap ne mesure que lui.`,
            ],
            ["Domaine : un nom enregistré auprès d’un registre, par exemple ", { valeur: "impots.gouv.fr" }, "."],
            ["Nom web : le nom qui sert le site d’un domaine, souvent ", { valeur: "www." }, " suivi du domaine."],
            ["Serveurs de noms : les serveurs qui répondent pour un domaine dans le DNS."],
            ["CNAME : un alias. Un nom renvoie vers un autre nom."],
            ["Adresse : une adresse IPv4 ou IPv6, où le nom mène."],
            [
              "AS (système autonome) : un réseau d’Internet, désigné par un numéro, par exemple ",
              { valeur: "AS16276" },
              ". Chaque adresse appartient au réseau qui l’annonce.",
            ],
            ["Société exploitante : la société, ou l’organisme, qui exploite ce réseau."],
            ["Maison mère ultime : la société qui contrôle la société exploitante, en haut de la chaîne de propriété."],
            ["Pays du siège : le pays où la maison mère a son siège. Ce n’est jamais l’emplacement des serveurs."],
            [
              "CDN (réseau de diffusion) : un réseau placé devant un site, qui le sert aux visiteurs depuis ses propres serveurs.",
            ],
            ["Hébergé par : la société dont le réseau sert le site quand aucun CDN ne s’interpose."],
            [
              "Diffusé par : la société dont le CDN sert le site aux visiteurs. Derrière un CDN, l’hébergeur d’origine n’est pas observable depuis l’extérieur.",
            ],
            ["Confirmé : pour chaque couche, au moins deux sources indépendantes concordent."],
            ["Probable : une seule source, cohérente."],
            [
              "Non déterminé : les sources manquent ou se contredisent ; le désaccord est montré. Sovermap ne devine jamais.",
            ],
            ["Hors UE : la maison mère a son siège hors de l’Union européenne."],
            [
              `Périmètre «${NBSP}État${NBSP}» : les domaines en `,
              { valeur: ".gouv.fr" },
              ", plus ceux des services et établissements de l’État recensés par le Référentiel de l’organisation administrative de l’État (DILA) et l’Observatoire du SIG, plus ceux des opérateurs de l’État. Environ 1 900 domaines.",
            ],
            [
              "SecNumCloud : une qualification de l’ANSSI pour des offres de cloud. Qu’une société ait au moins une offre qualifiée ne veut pas dire qu’un site qu’elle sert l’utilise.",
            ],
            ["Radiographie : la page d’un domaine, couche par couche, du nom au pays du siège."],
            ["Journal : les changements d’hébergement confirmés par deux collectes successives, jour par jour."],
          ],
        },
      ],
    },
  ],
  sources: [
    [
      `La méthode de Sovermap (§${NBSP}2, vocabulaire ; §${NBSP}3, périmètre ; §${NBSP}5, niveaux de confiance ; couche 8, SecNumCloud).`,
    ],
  ],
  revision: REVISION,
  relu: false,
});

export const pourquoi: PageDeTexte = soignee({
  chemin: "/pourquoi-ca-compte",
  court: "Pourquoi ça compte",
  titre: "Pourquoi ça compte",
  description:
    "Le pays du siège d’une société peut décider du droit qui s’applique aux données qu’elle détient : les règles des États-Unis, de l’Union et de la France, une source par phrase.",
  chapo:
    "Le pays du siège d’une société peut décider du droit qui s’applique aux données qu’elle détient. Voici les règles, une source par phrase. Sovermap décrit des dépendances ; il ne dit jamais qu’un site est en faute.",
  sections: [
    {
      titre: "Le droit des États-Unis",
      blocs: [
        {
          paragraphe: [
            "Une loi des États-Unis prévoit que les fournisseurs soumis à ce droit communiquent, sur demande légale, les données qu’ils détiennent, même stockées hors des États-Unis (18 U.S.C. § 2713, issu du CLOUD Act de 2018).",
          ],
        },
      ],
    },
    {
      titre: "Le droit européen",
      blocs: [
        {
          paragraphe: [
            "En droit européen, une demande d’un juge ou d’une autorité d’un pays tiers n’est reconnue que si elle repose sur un accord international (RGPD, article 48).",
          ],
        },
        {
          paragraphe: [
            "La Cour de justice de l’Union européenne a invalidé en 2020 le précédent cadre de transfert de données entre l’Union et les États-Unis (arrêt du 16 juillet 2020, C-311/18).",
          ],
        },
        {
          paragraphe: [
            "Le cadre actuel a fait l’objet d’un recours, rejeté par le Tribunal de l’Union européenne le 3 septembre 2025 ; un pourvoi a été formé devant la Cour de justice (décision d’exécution 2023/1795 ; T-553/23 ; C-703/25 P).",
          ],
        },
      ],
    },
    {
      titre: "Le droit français",
      blocs: [
        {
          paragraphe: [
            "La loi n° 2024-449 du 21 mai 2024 (article 31) et son décret d’application, le décret n° 2026-272 du 14 avril 2026 (publié au Journal officiel le 16 avril 2026), demandent à l’État, à ses opérateurs et à certains groupements qui confient à un cloud privé des données d’une sensibilité particulière de veiller à leur protection contre tout accès d’autorités d’États tiers non autorisé par le droit européen.",
          ],
        },
        {
          paragraphe: [
            "Ces règles dépendent de la sensibilité des données, que Sovermap ne voit pas. La doctrine « Cloud au centre » (règle 9, sur le site de la DINUM, lue le 22/11/2026) n’exige une offre de cloud qualifiée SecNumCloud que pour les données d’une sensibilité particulière, et ne parle ni des réseaux de diffusion ni des sites publics. Sovermap décrit des dépendances ; il ne juge jamais leur légalité.",
          ],
        },
      ],
    },
    {
      titre: "SecNumCloud",
      blocs: [
        {
          paragraphe: [
            "Une qualification SecNumCloud de l’ANSSI porte sur un service désigné, pas sur une société ; elle atteste notamment que ce service offre une protection vis-à-vis du droit extra-européen (décision de qualification n° 3395/ANSSI/SDE/NP du 31 juillet 2026, référentiel SecNumCloud 3.2).",
          ],
        },
        {
          paragraphe: [
            "C’est pourquoi Sovermap écrit : « Cette société a au moins une offre qualifiée SecNumCloud. Cela ne veut pas dire que ce site l’utilise. »",
          ],
        },
        {
          paragraphe: [
            "Héberger un site sur une offre qualifiée n’enlève pas la nécessité de sécuriser le site lui-même (guide de l’ANSSI sur l’hébergement des systèmes d’information sensibles).",
          ],
        },
      ],
    },
    {
      titre: "Ce que Sovermap n’en conclut pas",
      blocs: [
        {
          paragraphe: [
            "Une dépendance n’est pas une faute. Sovermap ne voit ni les données d’un site, ni leur sensibilité, ni les contrats qui le lient à ses prestataires.",
          ],
        },
      ],
    },
  ],
  sources: [
    ["18 U.S.C. § 2713 (Pub. L. 115-141, division V, 2018), sur uscode.house.gov et govinfo.gov."],
    [
      "Règlement (UE) 2016/679 (RGPD), article 48 ; CJUE, 16 juillet 2020, C-311/18 ; décision d’exécution (UE) 2023/1795 ; Tribunal de l’UE, 3 septembre 2025, T-553/23 ; pourvoi C-703/25 P.",
    ],
    [
      "Loi n° 2024-449 du 21 mai 2024, article 31 ; décret n° 2026-272 ; doctrine « Cloud au centre » de la DINUM, règle R9.",
    ],
    [
      "ANSSI : décision de qualification n° 3395/ANSSI/SDE/NP du 31 juillet 2026 ; guide sur l’hébergement des systèmes d’information sensibles.",
    ],
    [
      "Le cadre juridique de Sovermap (docs/juridique.md, § 1), où chaque texte est cité avec son adresse et sa date de lecture.",
    ],
  ],
  revision: REVISION,
  relu: false,
});

export const credits: PageDeTexte = soignee({
  chemin: "/credits",
  court: "Crédits",
  titre: "Crédits",
  description:
    "Qui a fait quoi : les textes et le code écrits avec l’aide d’une IA, les polices sous licence libre, les logiciels libres et le fond de carte.",
  chapo: "Les outils, les polices, les logiciels et les données dont Sovermap est fait.",
  sections: [
    {
      titre: "Les textes",
      blocs: [
        {
          paragraphe: [
            "Les textes du site ont été rédigés avec l’aide d’une intelligence artificielle, Claude, d’Anthropic. Tant que l’éditeur n’a pas relu un texte, sa page le dit, près du titre. Une fois relu, l’éditeur en assume la responsabilité, et la page le rappelle en une ligne, à son pied.",
          ],
        },
      ],
    },
    {
      titre: "Le code",
      blocs: [
        {
          paragraphe: [
            "Le code a été écrit avec l’aide de la même intelligence artificielle. Il est publié sous licence EUPL 1.2.",
          ],
        },
      ],
    },
    {
      titre: "Les polices",
      blocs: [
        {
          paragraphe: [
            "Servies par le site lui-même, sous licence SIL Open Font License 1.1 ; leurs licences sont servies avec elles.",
          ],
        },
        {
          liste: [
            ["Chakra Petch : Copyright 2018 The Chakra Petch Project Authors."],
            ["Manrope : Copyright 2019 The Manrope Project Authors."],
            ["IBM Plex Mono : Copyright 2017 IBM Corp."],
          ],
        },
      ],
    },
    {
      titre: "Les logiciels libres",
      blocs: [
        {
          liste: [
            ["Next.js et React (licence MIT)."],
            ["three.js (licence MIT), pour le globe."],
            ["dns-packet (licence MIT)."],
            ["Pour la collecte : Knot Resolver, de CZ.NIC (licence GPL)."],
          ],
        },
      ],
    },
    {
      titre: "Les données",
      blocs: [
        { paragraphe: ["Le fond de carte : Natural Earth (domaine public)."] },
        { paragraphe: ["Les autres sources : le registre des sources de Sovermap, dans son dépôt public."] },
      ],
    },
  ],
  sources: [
    ["Les dépendances du site (package.json) et les licences des polices (public/licenses)."],
    ["Le registre des sources de Sovermap (fiches 12 et 41)."],
  ],
  revision: REVISION,
  relu: false,
});

export const radiographieDeSovermap: PageDeTexte = soignee({
  chemin: "/radiographie-de-sovermap",
  court: "Sovermap, radiographié",
  titre: "Sovermap, passé à sa propre radiographie",
  description:
    "Sovermap dépend lui aussi de sociétés dont la maison mère a son siège hors de l’Union européenne : son hébergement, ses données, sa collecte.",
  chapo:
    "Sovermap dépend lui aussi de sociétés dont la maison mère a son siège hors de l’Union européenne. Il le dit, avec les mêmes mots que pour les sites qu’il mesure.",
  sections: [
    {
      blocs: [
        {
          liste: [
            [
              "Le site est hébergé et diffusé par Vercel Inc., dont le siège est aux États-Unis (offre gratuite « Hobby »), avec ses fonctions dans la région de Paris (",
              { valeur: "cdg1" },
              ").",
            ],
            [
              "Les données sont publiées sur GitHub, qui appartient à Microsoft Corporation, dont le siège est aux États-Unis.",
            ],
            ["La collecte tourne sur les serveurs de GitHub Actions (même maison mère)."],
            [
              "Le nom de domaine est enregistré chez Cloudflare, Inc., dont le siège est aux États-Unis, qui en est le registraire et en sert le DNS.",
            ],
            [
              "Dans votre navigateur : rien d’autre que le site lui-même. Aucune police, aucun script, aucune image ne vient d’un autre domaine.",
            ],
          ],
        },
        {
          paragraphe: [
            "Pourquoi ces choix : des offres gratuites, pour un projet sans budget. Ce n’est pas une recommandation.",
          ],
        },
      ],
    },
  ],
  sources: [
    ["Le plan technique de Sovermap (hébergement, décisions D2 et D6 ; quotas)."],
    [
      "La politique de sécurité du site (aucun tiers) et ses tests de bout en bout (aucune requête vers un autre domaine).",
    ],
  ],
  revision: REVISION,
  relu: false,
});

export const methode: PageDeTexte = soignee({
  chemin: "/methode",
  court: "Méthode",
  titre: "La méthode",
  description:
    "Comment Sovermap mesure chaque site public par le DNS, couche par couche, avec deux sources pour le « confirmé », et comment refaire chaque mesure à la main.",
  chapo: "Comment Sovermap mesure chaque site public, couche par couche, et comment refaire chaque mesure à la main.",
  sections: [
    {
      titre: "Ce que Sovermap montre, et ce qu’il ne montre pas",
      ancre: "ce-que-sovermap-montre",
      blocs: [
        { paragraphe: ["Il montre, pour chaque domaine de la liste de référence :"] },
        {
          liste: [
            ["s’il répond, et ses serveurs de noms ;"],
            [
              "ses adresses, son réseau, la société qui exploite ce réseau, sa maison mère ultime et le pays du siège de chacune ;",
            ],
            ["si un réseau de diffusion (CDN) est placé devant le site ;"],
            ["si la société a au moins une offre qualifiée SecNumCloud ;"],
            ["des agrégats, et les changements confirmés jour après jour."],
          ],
        },
        { paragraphe: ["Il ne montre pas :"] },
        {
          liste: [
            ["où se trouvent physiquement les serveurs ;"],
            ["où sont stockées les données des usagers ;"],
            ["les systèmes internes de l’État ;"],
            ["si un site respecte la loi ;"],
            ["l’hébergeur d’origine caché derrière un CDN (« non observable »)."],
          ],
        },
        {
          paragraphe: [
            "Une dépendance n’est pas une faute, et Sovermap ne juge jamais la légalité d’un choix : les règles dépendent de la sensibilité des données, qu’il ne voit pas (voir ",
            { lien: "Pourquoi ça compte", vers: "/pourquoi-ca-compte" },
            ").",
          ],
        },
      ],
    },
    {
      titre: "Ce qui est mesuré",
      blocs: [
        {
          paragraphe: [
            "La liste officielle des noms de domaine du secteur public (DINUM), complétée par d’autres sources ouvertes. Les noms internes ou techniques (réseau interministériel, préproduction, recette, outils) ne sont ni mesurés ni affichés. Le chiffre compte chaque domaine enregistré une fois, par son nom web : ",
            { valeur: "www." },
            " s’il répond, sinon le domaine lui-même.",
          ],
        },
        {
          paragraphe: [
            "Le chiffre-titre porte sur le périmètre « État » : les domaines en ",
            { valeur: ".gouv.fr" },
            ", plus ceux des services et établissements de l’État recensés par le Référentiel de la DILA et l’Observatoire du SIG, plus ceux des opérateurs de l’État. Environ 1 900 domaines. Le chiffre limité aux domaines en ",
            { valeur: ".gouv.fr" },
            " est publié à côté.",
          ],
        },
      ],
    },
    {
      titre: "La chaîne des couches",
      blocs: [
        {
          liste: [
            ["Le domaine."],
            ["Ses serveurs de noms."],
            ["Ses adresses, et la chaîne de ses alias."],
            ["Le réseau qui annonce chaque adresse, établi par deux sources indépendantes."],
            ["La société qui exploite ce réseau."],
            ["Sa maison mère ultime (GLEIF, puis un registre officiel ou le rapport annuel du groupe)."],
            ["Le pays du siège de chacune."],
            [
              "SecNumCloud : la société a-t-elle au moins une offre qualifiée ? Cela ne veut pas dire que le site l’utilise.",
            ],
            ["Le CDN placé devant le site, reconnu par un alias ou par son réseau."],
            ["La messagerie du domaine, à part du chiffre-titre."],
          ],
        },
      ],
    },
    {
      titre: "Les niveaux de confiance",
      blocs: [
        {
          liste: [
            [
              "Confirmé : pour chaque couche, au moins deux sources indépendantes concordent. Chaque jour, tous les domaines du périmètre « État » sont reposés à un résolveur européen de contrôle (Quad9).",
            ],
            ["Probable : une seule source, cohérente."],
            [
              "Non déterminé : les sources manquent ou se contredisent ; le désaccord est montré. Sa part est publiée chaque jour.",
            ],
          ],
        },
      ],
    },
    {
      titre: "Avant de publier",
      blocs: [
        {
          liste: [
            ["Un changement n’est publié qu’après deux collectes successives concordantes."],
            [
              "Si une collecte change plus de 2 % des classements, rien n’est publié, et l’état de la veille reste affiché.",
            ],
            ["Des domaines témoins, au comportement connu, sont contrôlés à chaque collecte."],
            ["Au-delà de 2 % de domaines en échec que le résolveur de contrôle ne confirme pas, rien n’est publié."],
            [
              "La mesure est polie : un agent qui s’identifie, aucune requête vers les sites mesurés, et un débit limité. L’objectif est de ne jamais dépasser 10 questions par seconde vers un même serveur ; une collecte reste acceptée tant qu’elle n’en pose jamais plus de 15, avec au plus une seconde au-delà de 10 (ou 0,1 % des secondes, si c’est plus). Les dépassements de chaque jour sont publiés sur la page Qualité.",
            ],
          ],
        },
      ],
    },
    {
      titre: "Refaire une mesure à la main",
      blocs: [
        {
          paragraphe: [
            "Sous Windows : ",
            { valeur: "Resolve-DnsName -Name www.impots.gouv.fr -Server 9.9.9.9" },
            ". Sous macOS ou Linux : ",
            { valeur: "dig www.impots.gouv.fr @9.9.9.9" },
            ". Chaque Radiographie donne, en mode expert, les commandes de chacune de ses couches.",
          ],
        },
      ],
    },
    {
      titre: "Sovermap et l’eGovernment Benchmark 2026",
      blocs: [
        {
          paragraphe: [
            "La Commission européenne publie, dans l’eGovernment Benchmark 2026, un indicateur pilote : 37,2 % des sites gouvernementaux étaient hébergés sur une infrastructure contrôlée en dernier ressort par une organisation dont le siège est hors de l’Union européenne (relevé de novembre 2025, agrégat européen). Sa chaîne est la même que celle de Sovermap : adresse, réseau, organisation, propriétaire ultime, pays du siège, sans géolocalisation.",
          ],
        },
        {
          paragraphe: [
            "Les deux chiffres diffèrent par leur périmètre (les sites gouvernementaux de l’Union, sans chiffre français publié ; ici, les domaines de l’État français), par leur date et leur rythme (un relevé ; ici, chaque jour), et par leur seuil de preuve (ici, deux sources par couche pour le « confirmé »). Ils ne se comparent donc pas directement.",
          ],
        },
      ],
    },
    {
      titre: "Les versions de la méthode",
      blocs: [
        {
          liste: [
            ["0.1 (18/11/2026) : première rédaction, éprouvée sur 21 noms réels."],
            [
              "0.2 (19/11/2026) : les noms internes exclus, l’unité et le périmètre du chiffre, le contrôle de tous les domaines de l’État.",
            ],
            [
              "0.2 (collecte v1) (20/11/2026) : la messagerie mesurée, le domaine enregistré par la Public Suffix List, les témoins et les échecs DNS parmi les garde-fous.",
            ],
            [
              "0.2.1 (21/11/2026) : la règle « sous-zone interne » et ses garde-fous, l’ordre et le rythme de la mesure.",
            ],
          ],
        },
      ],
    },
  ],
  sources: [
    ["La méthode de Sovermap, docs/methode.md (§ 1 à § 7, § 10 et § 11), dans son dépôt public."],
    ["Commission européenne, eGovernment Benchmark 2026 (rapport sous licence CC BY 4.0), lu le 18/11/2026."],
  ],
  revision: REVISION,
  relu: false,
});

export const confidentialite: PageDeTexte = soignee({
  chemin: "/confidentialite",
  court: "Confidentialité",
  titre: "Confidentialité",
  description:
    "Ce que Sovermap sait de ses visiteurs : aucun cookie ni traceur de sa part ; parfois, la session de défi de son hébergeur ; ses journaux techniques ; vos droits.",
  chapo:
    "Sovermap n’a ni compte, ni cookie, ni traceur. Il ne reste que ce que tout site produit : les journaux techniques de son hébergeur, et parfois sa protection contre les robots.",
  sections: [
    {
      titre: "Aucun cookie, aucun traceur",
      blocs: [
        {
          paragraphe: [
            "Sovermap ne dépose lui-même aucun cookie et n’écrit rien dans votre navigateur. Il ne charge rien d’un autre domaine : ni police, ni script, ni image, ni mesure d’audience. Il n’y a donc aucun bandeau à accepter.",
          ],
        },
        {
          paragraphe: [
            "Une exception vient de son hébergeur, Vercel : sa protection contre les robots peut soumettre un navigateur à un défi, rarement celui d’un visiteur ordinaire. Après un défi réussi, Vercel garde dans ce navigateur une « session de défi », valable une heure (documentation de Vercel, « Firewall concepts », lue le 22/11/2026).",
          ],
        },
        {
          paragraphe: [
            "La règle qui s’applique est l’article 82 de la loi Informatique et Libertés : il exempte de consentement ce qui est strictement nécessaire à un service de communication en ligne expressément demandé par l’utilisateur. Parmi ses exemples, la CNIL cite les traceurs qui assurent la sécurité d’un mécanisme d’authentification, « par exemple en limitant les tentatives d’accès robotisées » (page « Cookies et autres traceurs : que dit la loi ? », lue le 22/11/2026).",
          ],
        },
      ],
    },
    {
      titre: "Les journaux techniques de l’hébergeur",
      blocs: [
        {
          paragraphe: [
            "Comme tout hébergeur, Vercel Inc. note, pour chaque requête, l’adresse IP du visiteur, son navigateur et l’heure. Ces journaux servent à faire fonctionner et à protéger le site. L’éditeur en est responsable ; Vercel agit pour lui, en sous-traitant.",
          ],
        },
        {
          liste: [
            [
              "Base juridique : l’intérêt légitime de l’éditeur à faire fonctionner et à protéger le site (RGPD, article 6, paragraphe 1, f).",
            ],
            [
              "Durée : Vercel garde ses journaux d’exécution une heure sur l’offre gratuite du site ; sa politique de confidentialité ne donne pas de durée chiffrée pour ses autres données, gardées « le temps nécessaire ».",
            ],
            [
              "Transfert : Vercel Inc. a son siège aux États-Unis (440 N Barranca Avenue #4133, Covina, CA 91723). Sa politique de confidentialité déclare qu’il respecte le Data Privacy Framework UE–États-Unis, objet de la décision d’adéquation (UE) 2023/1795 de la Commission européenne.",
            ],
          ],
        },
      ],
    },
    {
      titre: "Les signalements",
      blocs: [
        {
          liste: [
            [
              "Une issue GitHub est publique : tout le monde peut la lire. La politique de confidentialité de GitHub s’y applique. N’y écrivez aucune donnée personnelle.",
            ],
            [
              "L’adresse e-mail viendra avec l’ouverture du site, et cette page dira alors ce qu’il advient des messages.",
            ],
          ],
        },
      ],
    },
    {
      titre: "Ce que Sovermap mesure",
      blocs: [
        {
          paragraphe: [
            "Les données mesurées concernent des organismes et des sociétés, pas des personnes. Les rares champs du DNS qui peuvent contenir une donnée personnelle (l’adresse e-mail d’un administrateur dans un enregistrement SOA, les contacts des registres) ne sont jamais gardés.",
          ],
        },
      ],
    },
    {
      titre: "Vos droits",
      blocs: [
        {
          paragraphe: [
            "Vous pouvez demander l’accès à vos données, leur rectification, leur effacement, la limitation de leur traitement, ou vous y opposer (RGPD, articles 15 à 21). Le responsable du traitement et ses coordonnées sont dans les mentions légales. Vous pouvez aussi adresser une réclamation à la CNIL (RGPD, article 77).",
          ],
        },
      ],
    },
  ],
  sources: [
    [
      "Règlement (UE) 2016/679 (RGPD) : articles 6, 13, 15 à 21, 28 et 77, et chapitre V ; décision d’exécution (UE) 2023/1795.",
    ],
    [
      "Loi n° 78-17, article 82 (cookies et traceurs) ; lignes directrices de la CNIL, délibération n° 2020-091 du 17 septembre 2020.",
    ],
    [
      "Pages de Vercel, lues le 22/11/2026 : sa politique de confidentialité (mise à jour du 1er juin 2026), ses conditions, et sa documentation des journaux (offre Hobby).",
    ],
    ["Le cadre juridique de Sovermap (docs/juridique.md, § 2.1 et § 2.2)."],
  ],
  revision: REVISION,
  relu: false,
});

/** Every text page, in the order of the site's footer. */
export const sources: PageDeTexte = soignee({
  chemin: "/sources",
  court: "Sources",
  titre: "Sources et attributions",
  description:
    "Les sources de Sovermap : leur registre public, ses décisions, les téléchargements du jour et les attributions, avec la date réelle de chaque fichier.",
  chapo:
    "Sovermap ne publie que ce que ses sources permettent de republier. Chacune a sa fiche dans un registre public, avant tout usage.",
  sections: [
    {
      titre: "Le registre",
      blocs: [
        {
          paragraphe: [
            "Chaque source a sa fiche dans le registre du projet, le fichier ",
            { valeur: "docs/sources.md" },
            " de son dépôt public : son producteur, son adresse, ce que Sovermap en tire, sa licence ou ses conditions citées mot pour mot avec leur date de lecture, son fichier robots.txt, ses limites, son attribution et la décision prise.",
          ],
        },
        {
          paragraphe: [
            "Une source nouvelle, ou un changement de décision, entre d’abord au registre, avant tout usage. Le fichier robots.txt d’un site se lit avant toute autre requête vers lui. Une protection anti-robots n’est jamais contournée : un fichier fermé aux robots est relevé à la main, dans un navigateur ordinaire, et daté.",
          ],
        },
      ],
    },
    {
      titre: "Les décisions",
      blocs: [
        {
          liste: [
            ["Retenue : la source établit des faits que Sovermap publie, dans le respect de ses conditions."],
            ["Retenue en contrôle seulement : elle sert à vérifier, jamais à classer seule ; rien n’en est republié."],
            [
              "Écartée, parfois pour l’instant : elle n’est pas employée ; sa fiche dit pourquoi, et ce qu’il faudrait pour la rouvrir.",
            ],
            ["En attente : elle demande une adresse de contact ou un relevé manuel."],
          ],
        },
      ],
    },
  ],
  sources: [["Le registre des sources de Sovermap (docs/sources.md) : ses règles et ses décisions possibles."]],
  revision: REVISION,
  relu: false,
});

/**
 * The legal notices (brief E.4; the owner's answer to point 11, Q6): built from the publisher the Production variables
 * give (lib/editeur.ts), option A by default; B and C stay here until a lawyer checks them in chantier 3.
 */
export function mentionsLegales(editeur: Editeur): PageDeTexte {
  const contact: Segment[] =
    editeur.contact === null
      ? ["L’adresse de contact du site sera donnée ici à son ouverture."]
      : ["Contact : ", { valeur: editeur.contact }, "."];
  const lEditeur: Segment[] =
    editeur.mode === "anonyme"
      ? [
          "Sovermap est édité à titre non professionnel, par une personne qui ne publie pas son identité, comme le permet l’article 1-1, II, de la loi pour la confiance dans l’économie numérique ; le site donne le nom et l’adresse de son hébergeur.",
        ]
      : editeur.mode === "identite"
        ? [
            `Éditeur et directeur de la publication : ${editeur.prenoms} ${editeur.nom}, domicilié ${editeur.domicile}, téléphone `,
            { valeur: editeur.telephone },
            ".",
          ]
        : [`Éditeur et directeur de la publication : ${editeur.nom}.`];
  return soignee({
    chemin: "/mentions-legales",
    court: "Mentions légales",
    titre: "Mentions légales",
    description:
      "L’éditeur de Sovermap, son hébergeur et le contact du site, selon l’article 1-1 de la loi pour la confiance dans l’économie numérique.",
    chapo: "Qui édite Sovermap, qui l’héberge, et comment écrire au site.",
    sections: [
      { titre: "L’éditeur", blocs: [{ paragraphe: lEditeur }, { paragraphe: contact }] },
      {
        titre: "L’hébergeur",
        blocs: [
          {
            paragraphe: [
              `${HEBERGEUR.nom}, ${HEBERGEUR.adresse}. Vercel ne publie pas de numéro de téléphone dans sa politique de confidentialité ni dans ses conditions (lues le 22/11/2026).`,
            ],
          },
        ],
      },
      {
        titre: "Les textes",
        blocs: [
          {
            paragraphe: [
              "Les textes du site ont été rédigés avec l’aide d’une intelligence artificielle (voir ",
              { lien: "Crédits", vers: "/credits" },
              ").",
            ],
          },
        ],
      },
    ],
    sources: [
      ["Loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique, articles 1-1 et 1-2."],
      ["Vercel, politique de confidentialité et conditions d’utilisation, lues le 22/11/2026."],
    ],
    revision: REVISION,
    relu: false,
  });
}

/** The legal notices with the default option (A): the footer, the plans of the site and the tests read this one. */
export const mentionsLegalesParDefaut = mentionsLegales({ mode: "anonyme", contact: null });

export const PAGES_DE_TEXTE: readonly PageDeTexte[] = [
  aPropos,
  methode,
  pourquoi,
  glossaire,
  sources,
  radiographieDeSovermap,
  corrections,
  accessibilite,
  confidentialite,
  credits,
  mentionsLegalesParDefaut,
];
