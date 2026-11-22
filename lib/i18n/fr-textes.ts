// The words of the text pages (part E), page by page: the one source of what they say, with their sources and the day
// of their last revision. Not read again by the publisher yet (relu: false), until the review of brief E.5. French
// typography: a non-breaking space before « : ; ! ? » and inside « » (DESIGN.md §6).
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
  titre: "À propos de Sovermap",
  description: `Sovermap est un site indépendant${NBSP}: chaque jour, il mesure par le DNS qui sert les sites publics français, avec ses sources et sa méthode.`,
  chapo: "Un site indépendant, sans lien avec l’État ni avec les sociétés qu’il décrit.",
  sections: [
    {
      blocs: [
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
        { paragraphe: ["Le site n’a ni compte, ni cookie, ni traceur, ni publicité."] },
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
  titre: "Déclaration d’accessibilité",
  description: `Sovermap publie volontairement sa déclaration d’accessibilité${NBSP}: le niveau visé (WCAG${NBSP}2.2 AA), ce qui est vérifié, et les contenus qui ont une alternative.`,
  chapo: `Sovermap n’est pas tenu par la loi de publier cette déclaration${NBSP}: il la publie volontairement, et vise le niveau AA des règles WCAG${NBSP}2.2.`,
  sections: [
    {
      titre: "État de conformité",
      blocs: [{ paragraphe: ["Partiellement conforme. Aucun audit indépendant n’a encore été fait."] }],
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

/** Every text page, in the order of the site's footer. */
export const PAGES_DE_TEXTE: readonly PageDeTexte[] = [aPropos, glossaire, corrections, accessibilite];
