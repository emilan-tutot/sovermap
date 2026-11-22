# Cadre juridique de Sovermap

**Ce n'est pas un avis juridique.** C'est un relevé de textes primaires, lus et datés, à faire relire par un juriste avant l'ouverture du site.

Version du 18/11/2026 (chantier T1, partie A.4). Toutes les sources ont été lues le **18/11/2026**. Ce qui n'a pas pu être lu à la source est marqué **non vérifié**, avec la raison.

**Mise à jour du 22/11/2026** (chantier 2, E.2) : les points du § 4 qui pouvaient l'être ont été relus ce jour-là, par un agent de recherche, sur les pages officielles citées (§ 1.11, § 2.1, § 2.6 et § 4). Pages refusées ou illisibles ce jour-là : congress.gov (403), EUR-Lex (pages vides), InfoCuria et dataprivacyframework.gov (contenu chargé par script), uscode.house.gov (404).

**Accès aux sources**
- **Légifrance** a refusé les robots (protection Cloudflare). Les textes français ont donc été lus dans les bases officielles de la DILA qui l'alimentent (LEGI, JORF, CNIL, sur echanges.dila.gouv.fr), dans leur version applicable au 18/11/2026. Les liens Légifrance donnés ci-dessous reprennent les identifiants officiels, mais n'ont pas pu être ouverts.
- **cyber.gouv.fr** (ANSSI) et **congress.gov** ont refusé les robots. **cnil.fr** était en maintenance.
- **Replis** : messervices.cyber.gouv.fr (ANSSI), govinfo.gov et uscode.house.gov (textes américains), EUR-Lex (droit et arrêts européens).

## 1. Textes à citer sur le site (« Pourquoi ça compte », Méthode)

### 1.1 La doctrine « Cloud au centre »
- **Références** :
  - circulaire n° 6282/SG du 5 juillet 2021, relative à la doctrine d'utilisation de l'informatique en nuage par l'État ;
  - circulaire n° 6404/SG du 31 mai 2023, qui l'actualise.
  - Numéros et intitulés relevés dans le rapport du Sénat n° 199 (2025-2026) et dans une décision de l'ANSSI du 31/07/2026. Texte des circulaires sur Légifrance : **non vérifié**.
- **Règle R9**, page de la DINUM (https://www.numerique.gouv.fr/offre-accompagnement/cloud-administrations/programme/) : « Si le système ou l’application informatique traite des données, à caractère personnel ou non, d’une sensibilité particulière et dont la violation est susceptible d’engendrer une atteinte à l’ordre public, à la sécurité publique, à la santé et la vie des personnes ou à la protection de la propriété intellectuelle, l’offre de cloud commerciale retenue devra impérativement respecter la qualification SecNumCloud (ou une qualification européenne garantissant un niveau au moins équivalent, notamment de cybersécurité) et être immunisée contre tout accès non autorisé par des autorités publiques d’État tiers »
- **Qui est visé** (communiqué de la DINUM du 6 octobre 2021) : « Les services de l’État et les organismes placés sous sa tutelle ».
- **Vade-mecum de la DINUM sur l'article 31 de la loi SREN** (https://numerique.gouv.fr/documents/244/20260204_Vademecum_donnees_sensibles_.pdf) : « le recours à une offre dite « de confiance » n’est pas systématiquement obligatoire ».
- **Pour Sovermap** :
  - la doctrine vise l'État et ses organismes, pas les collectivités ;
  - l'exigence SecNumCloud ne vaut que pour les données d'une sensibilité particulière ;
  - Sovermap ne voit pas les données d'un site : il ne peut donc **jamais** conclure qu'un site est « non conforme ».

### 1.2 La loi SREN, article 31, et ses textes d'application
- **Loi** : loi n° 2024-449 du 21 mai 2024 visant à sécuriser et à réguler l'espace numérique, article 31. En vigueur depuis le 23/05/2024, sans modification (https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000049563368).
  - I, alinéa 2 : quand l'État, ses opérateurs et certains groupements recourent à un cloud privé pour des « données d'une sensibilité particulière », ils « veillent à ce que le service d'informatique en nuage fourni par le prestataire privé mette en œuvre des critères de sécurité et de protection des données garantissant notamment la protection des données traitées ou stockées contre tout accès par des autorités publiques d'Etats tiers non autorisé par le droit de l'Union européenne ou d'un Etat membre. »
  - II : ces données sont celles qui relèvent de secrets protégés par la loi, et celles « nécessaires à l'accomplissement des missions essentielles de l'Etat ».
- **Décret d'application** : décret n° 2026-272 du 14 avril 2026, JO du 16/04/2026 (https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053900789).
  - Article 2, 9° : le référentiel porte notamment sur « la localisation du lieu du siège ou du principal établissement du prestataire et les modalités de son contrôle, au travers notamment de la détention, directe ou indirecte, de son capital social et de ses droits de vote ».
- **Arrêtés d'application** :
  - arrêté du 14 avril 2026 sur les dérogations ;
  - arrêté du 12 août 2026 portant approbation du référentiel d'exigences relatif aux prestataires de services d'informatique en nuage (JO du 14/08/2026). Son annexe n'est publiée qu'en image : sa version est **non vérifiée**.
- **Article 27 de la loi SREN** (frais de changement de fournisseur) : l'arrêté du 17 novembre 2025 fixe leur montant maximal à « zéro euro », jusqu'au 12 janvier 2027.
- **Pour Sovermap** :
  - l'article 31 **ne vise pas les collectivités territoriales** ;
  - une proposition de loi pour les y inclure (un « article 31-1 ») doit être examinée en séance à l'Assemblée nationale le 10/12/2026 (rapport AN n° 2522) ;
  - au 18/11/2026, elle n'est pas adoptée.

### 1.3 Le référentiel SecNumCloud de l'ANSSI
- **Version utilisée en 2026** : la décision de qualification ANSSI n° 3395/ANSSI/SDE/NP du 31 juillet 2026 (https://messervices.cyber.gouv.fr/visas/2026_3395_np.pdf) vise le « référentiel d'exigences applicables aux prestataires de services d’informatique en nuage (SecNumCloud), version 3.2 du 8 mars 2022 ».
  - Elle « atteste que le service permet de répondre à la recommandation R9 de la doctrine d’utilisation de l’informatique en nuage par l’État et notamment qu’il offre une protection vis-à-vis du droit extra-européen » ;
  - elle « est valable trois ans ».
- **Non vérifiés** (cyber.gouv.fr protégé contre les robots) :
  - le numéro de la section sur le droit extra-européen (la piste « 19.6 » ne sera pas publiée avant lecture) ;
  - les critères de détention du capital, cités par un rapport parlementaire (AN n° 3054) ;
  - la version du référentiel approuvé en août 2026.
- **Guide de l'ANSSI** sur l'hébergement des systèmes d'information sensibles : « l’hébergement d’un site web sur une offre qualifiée n’enlève pas la nécessité de sécuriser le site web en lui-même. »
- **Formulation obligatoire sur le site** : une qualification porte sur un service désigné, pas sur une société. On écrit « Cette société a au moins une offre qualifiée SecNumCloud. Cela ne veut pas dire que ce site l'utilise. » Jamais « X est SecNumCloud ».

### 1.4 RGPD, chapitre V (articles 44 à 50) : transferts hors de l'UE
- **Référence** : règlement (UE) 2016/679 (https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32016R0679).
- **L'essentiel** :
  - des données personnelles ne quittent l'UE que vers un pays jugé « adéquat » (art. 45), avec des garanties appropriées (art. 46), ou dans les cas de l'article 49 ;
  - art. 48 : « Toute décision d'une juridiction ou d'une autorité administrative d'un pays tiers exigeant d'un responsable du traitement ou d'un sous-traitant qu'il transfère ou divulgue des données à caractère personnel ne peut être reconnue ou rendue exécutoire de quelque manière que ce soit qu'à la condition qu'elle soit fondée sur un accord international […] ».

### 1.5 L'arrêt « Schrems II »
- **Référence** : CJUE, grande chambre, 16 juillet 2020, C-311/18, ECLI:EU:C:2020:559 (https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:62018CJ0311).
- **Dispositif, point 5** : la décision « bouclier de protection des données UE-États-Unis » (2016/1250) « est invalide ».
- **Point 184** : « ni l’article 702 du FISA ni l’E.O. 12333, lus en combinaison avec la PPD-28, ne correspondent aux exigences minimales attachées, en droit de l’Union, au principe de proportionnalité ».

### 1.6 Le cadre UE–États-Unis (Data Privacy Framework) et ses recours
- **Décision d'adéquation** : décision d'exécution (UE) 2023/1795 du 10 juillet 2023 (https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32023D1795). Elle ne couvre que les organisations américaines inscrites sur la « liste du cadre de protection des données ».
- **Tribunal de l'UE** : arrêt du 3 septembre 2025, *Latombe / Commission*, T-553/23 : « Le recours est rejeté. »
- **Pourvoi** : affaire C-703/25 P, formé le 31 octobre 2025.
  - Au 18/11/2026, EUR-Lex ne montre ni arrêt ni conclusions : l'affaire paraît **pendante**.
  - Son état sur le site de la Cour : **non vérifié** (application JavaScript).

### 1.7 Le CLOUD Act (États-Unis, 2018)
- **Référence** : Consolidated Appropriations Act, 2018, Pub. L. 115-141, division V (« Clarifying Lawful Overseas Use of Data Act »). Il crée 18 U.S.C. § 2713 et § 2523 (https://www.govinfo.gov/content/pkg/PLAW-115publ141/html/PLAW-115publ141.htm).
- **18 U.S.C. § 2713** (https://uscode.house.gov/us/usc/t18/s2713/) : « A provider of electronic communication service or remote computing service shall comply with the obligations of this chapter to preserve, backup, or disclose the contents of a wire or electronic communication and any record or other information pertaining to a customer or subscriber within such provider’s possession, custody, or control, regardless of whether such communication, record, or other information is located within or outside of the United States. »

### 1.8 La section 702 du FISA
- **Référence** : 50 U.S.C. § 1881a (https://uscode.house.gov/us/usc/t50/s1881a/).
- **Chronologie relevée** :
  - la loi RISAA (Pub. L. 118-49, 20 avril 2024) l'avait prolongée de deux ans ;
  - la Pub. L. 119-84 (18 avril 2026) la prolonge jusqu'au 30 avril 2026 ;
  - la Pub. L. 119-87 (30 avril 2026) remplace cette date par le 12 juin 2026.
  - Note du code des États-Unis, à jour au 10/11/2026 : « the repeals made by section 403(b)(1) are effective June 12, 2026. »
- **Procédures transitoires** : les autorisations en cours « shall continue in effect until the date of the expiration of such order, authorization, or directive. »
- **Formulation prudente** : d'après le code des États-Unis à jour au 10/11/2026, la base légale de la section 702 a pris fin le 12 juin 2026, et les autorisations en cours restent valables jusqu'à leur échéance.
- **Non vérifié** : une loi adoptée après le 10/11/2026, et l'état réel des certifications.

### 1.9 Le Data Act : changer de fournisseur de cloud
- **Référence** : règlement (UE) 2023/2854 du 13 décembre 2023, chapitre VI, articles 23 à 31 (https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32023R2854). Applicable depuis le 12 septembre 2025.
- **Art. 29, § 1** : « À compter du 12 janvier 2027, les fournisseurs de services de traitement de données ne peuvent imposer aucun frais de changement de fournisseur au client pour le processus de changement de fournisseur. »
- **Art. 28, § 1, a)** : les fournisseurs publient « les juridictions dont dépend l'infrastructure TIC déployée pour le traitement des données de leurs différents services ».

### 1.10 Travaux parlementaires (2025-2026)
- **Sénat, rapport n° 830 (2024-2025)** de la commission d'enquête sur la commande publique, 8 juillet 2025 (https://www.senat.fr/rap/r24-830-1/r24-830-11.html). Recommandations n° 24 et 25 : une clause de non-soumission aux lois extraterritoriales, et le recours à SecNumCloud pour les données sensibles.
- **Sénat, audition du 10 juin 2025** (https://www.senat.fr/compte-rendu-commissions/20250609/ce_commande_publique.html). À la question d'une garantie que des données ne seront jamais transmises au gouvernement américain sans l'accord des autorités françaises, un représentant de Microsoft France répond : « Non, je ne peux pas le garantir, mais, encore une fois, cela ne s'est encore jamais produit. »
- **Proposition de loi relative à la sécurisation des marchés publics numériques** :
  - Sénat, n° 8 (2025-2026), adoptée le 17 décembre 2025 (https://www.senat.fr/dossierleg/ppl25-008.html) ;
  - Assemblée nationale, rapport n° 2522 du 25 février 2026 (création d'un article 31-1 de la loi SREN pour les collectivités) ;
  - séance prévue le 10/12/2026 (https://www.assemblee-nationale.fr/dyn/17/dossiers/DLR5L17N52900).
- **Assemblée nationale, rapport d'enquête n° 3054** du 8 juillet 2026, sur les dépendances structurelles et les vulnérabilités systémiques dans le secteur du numérique (https://www.assemblee-nationale.fr/dyn/docs/RAPPANR5L17B3054-t1.raw).

### 1.11 Phrases proposées pour « Pourquoi ça compte » (ton neutre, une source par phrase)
1. « Une loi des États-Unis prévoit que les fournisseurs soumis à ce droit communiquent, sur demande légale, les données qu'ils détiennent, même stockées hors des États-Unis (18 U.S.C. § 2713, issu du CLOUD Act de 2018). »
2. « En droit européen, une demande d'un juge ou d'une autorité d'un pays tiers n'est reconnue que si elle repose sur un accord international (RGPD, art. 48). »
3. « Depuis 2024, quand l'État, ses opérateurs et certains groupements confient à un cloud privé des données d'une sensibilité particulière, ils doivent veiller à leur protection contre tout accès d'autorités d'États tiers non autorisé par le droit européen (loi n° 2024-449, art. 31 ; décret n° 2026-272). »
4. « Ces règles dépendent de la sensibilité des données, que Sovermap ne voit pas : un site public peut légalement passer par un réseau de diffusion non européen. »
5. « La Cour de justice de l'UE a invalidé en 2020 le précédent cadre de transfert UE–États-Unis (C-311/18). Le cadre actuel (décision 2023/1795) a fait l'objet d'un recours rejeté par le Tribunal de l'UE le 3 septembre 2025 (T-553/23) ; un pourvoi a été formé devant la Cour de justice (C-703/25 P). » (22/11/2026 : « est en cours » devient « a été formé », l'état du pourvoi n'ayant pas pu être lu sur le site de la Cour ; voir le § 4.)

## 2. Les obligations du site lui-même

### 2.1 RGPD : ce qui reste comme données personnelles
- **Le site n'est pas une activité « domestique »**. CJCE, 6 novembre 2003, *Lindqvist*, C-101/01, point 47 : l'exception ne couvre pas une publication sur Internet « rendues accessibles à un nombre indéfini de personnes ».
- **Les données mesurées ne sont pas, en principe, personnelles** : le RGPD « ne couvre pas le traitement des données à caractère personnel qui concernent les personnes morales » (considérant 14).
  - Mais certains champs DNS peuvent en contenir : le champ RNAME du SOA (souvent l'adresse e-mail d'un administrateur), certains noms inverses (PTR).
  - Règle : ne pas les conserver, comme les contacts des registres.
- **Ce qui reste** :
  1. les journaux techniques de l'hébergeur : adresse IP des visiteurs, agent utilisateur, heure. L'éditeur est responsable du traitement, et Vercel est son sous-traitant, une société américaine (chapitre V). Lu le 22/11/2026 sur les pages de Vercel :
     - sa politique de confidentialité (« Last Updated June 1, 2026 », https://vercel.com/legal/privacy-policy) dit que Vercel respecte le Data Privacy Framework UE–États-Unis, son extension britannique et le cadre Suisse–États-Unis ; sa certification est annoncée le 04/06/2024 (https://vercel.com/changelog/vercel-is-now-certified-under-the-eu-us-data-privacy-framework-dpf). Sa fiche sur la liste officielle (dataprivacyframework.gov) reste **non vérifiée** : elle n'a pas pu être lue ;
     - ses journaux d'exécution sont gardés **une heure** sur l'offre Hobby (https://vercel.com/docs/logs/runtime ; https://vercel.com/docs/plans/hobby). Sa politique ne donne aucune durée chiffrée : les données sont gardées « for the minimum necessary period », puis supprimées ou anonymisées. Pour les visiteurs des sites de ses clients, Vercel agit en sous-traitant, sous son accord de traitement (DPA) ;
     - son adresse : 440 N Barranca Avenue #4133, Covina, CA 91723, United States (politique, et conditions, § 23.3.4 : https://vercel.com/legal/terms). **Aucun numéro de téléphone** sur ces deux pages ;
  2. les e-mails reçus pour une correction ;
  3. les issues GitHub publiques. Il faut prévenir qu'elles sont publiques, et proposer l'e-mail comme autre voie.
- **Informations à donner (art. 13)** dans la page Confidentialité :
  - responsable et coordonnées, finalités et base juridique, destinataires (hébergeur, messagerie) ;
  - transfert hors UE, et « l'existence ou l'absence d'une décision d'adéquation » ;
  - durée de conservation, droits, et droit de réclamation auprès de la CNIL.
- **Registre des traitements** : les journaux sont produits en continu, ce qui n'est pas « occasionnel » (art. 30, § 5). Il faut donc tenir un registre très court : journaux, e-mails, issues.

### 2.2 Cookies et traceurs
- **Article 82 de la loi n° 78-17** : le consentement est exigé pour lire ou écrire dans le terminal, sauf si cela « a pour finalité exclusive de permettre ou faciliter la communication par voie électronique » ou « est strictement nécessaire à la fourniture d'un service de communication en ligne à la demande expresse de l'utilisateur ».
- **Lignes directrices de la CNIL** (délibération n° 2020-091 du 17 septembre 2020, lue dans la base CNIL de la DILA) :
  - le stockage local du navigateur (« local storage ») est un traceur au sens de l'article 82 ;
  - sont exemptés « les traceurs de personnalisation de l'interface utilisateur (par exemple, pour le choix de la langue ou de la présentation d'un service), lorsqu'une telle personnalisation constitue un élément intrinsèque et attendu du service ».
- **Recommandation de la CNIL** (délibération n° 2020-092) : l'article 82 « n'impose pas d'informer les utilisateurs sur l'existence d'opérations de lecture et écriture non soumises au consentement préalable ». La CNIL recommande quand même de les mentionner dans la politique de confidentialité.
- **Conclusion, par déduction des textes** :
  - sans traceur, ou avec les seuls traceurs exemptés, aucun bandeau de consentement n'est exigé ;
  - une préférence d'affichage gardée en stockage local se mentionne dans la page Confidentialité ;
  - la FAQ de la CNIL qui le dirait en ces termes n'a pas pu être lue (site en maintenance) : **non vérifié**.

### 2.3 Mentions légales (LCEN)
- **Numérotation** : la loi SREN a créé les **articles 1-1 et 1-2** de la loi n° 2004-575 (LCEN), en vigueur depuis le 23/05/2024 (https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049568614).
- **Art. 1-1, I** : l'éditeur publie, s'il est une personne physique, « leurs nom, prénoms, domicile et numéro de téléphone ». Il publie aussi le nom du directeur de la publication, et le nom, l'adresse et le téléphone de l'hébergeur.
- **Art. 1-1, II : l'éditeur non professionnel** : « Les personnes éditant à titre non professionnel un service de communication au public en ligne peuvent ne tenir à la disposition du public, pour préserver leur anonymat, que le nom, la dénomination ou la raison sociale et l'adresse du fournisseur de services d'hébergement, sous réserve d'avoir communiqué à ce fournisseur les éléments d'identification personnelle mentionnés au I du présent article. »
- **Art. 1-2 : la sanction** : « un an d'emprisonnement et de 75 000 euros d'amende ».
- **Pour Sovermap** : l'identité de l'éditeur sera décidée plus tard par le propriétaire. L'anonymat est possible, à condition que l'hébergeur ait son identité.

### 2.4 Accessibilité
- **Qui est obligé** : article 47 de la loi n° 2005-102, dans sa version issue de l'ordonnance n° 2023-859.
  - Les personnes morales de droit public, certaines personnes morales de droit privé (mission de service public, financement public), et les entreprises dont le chiffre d'affaires dépasse 250 millions d'euros (décret n° 2019-768, art. 2).
  - L'article « ne s'applique pas aux services de communication au public en ligne des organismes de droit privé à but non lucratif qui ne fournissent ni des services essentiels pour le public, ni des services répondant spécifiquement aux besoins des personnes handicapées ».
- **Pour Sovermap** : un site édité par un particulier, gratuit, n'entre dans aucune de ces catégories. **Il n'a pas d'obligation légale.**
- **Recommandation** :
  - viser WCAG 2.2 niveau AA (constitution, principe 6) ;
  - publier une déclaration d'accessibilité volontaire, dite volontaire, avec l'état de conformité, les contenus non accessibles et un moyen de signaler un problème.
- **Non vérifié** : la norme harmonisée visée depuis le décret du 24 août 2026, et son lien avec WCAG 2.2.

### 2.5 Licences des données republiées
- **Licence Ouverte 2.0** :
  - une seule obligation : « mentionner la paternité de l’ « Information » : sa source (au moins le nom du « Concédant ») et la date de dernière mise à jour de l’ « Information » réutilisée » ;
  - et un interdit : la mention « ne doit pas suggérer une quelconque reconnaissance ou caution par le « Concédant » ».
- **Code des relations entre le public et l'administration, art. L322-1** : les informations publiques ne doivent pas être « altérées », ni leur « sens » « dénaturé », et « leurs sources et la date de leur dernière mise à jour » doivent être mentionnées.
- **ODbL 1.0** : une base dérivée publiée doit rester sous ODbL ou sous une licence compatible (4.4 a). Aucune source retenue n'est sous ODbL.
- **PDDL 1.0 et CC0 1.0** : aucune obligation juridique. L'attribution reste une bonne pratique. La CC0 ne cède aucun droit de marque.
- **Effet sur D4** : publier les données de Sovermap sous Licence Ouverte 2.0 est compatible avec toutes les sources retenues (Licence Ouverte, PDDL, CC0), à condition d'afficher les attributions (`docs/sources.md`).

### 2.6 Les textes et visuels faits avec une IA (règlement (UE) 2024/1689, article 50)
- **Référence** : version consolidée au 27/07/2026, qui intègre le règlement (UE) 2026/1744 (https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:02024R1689-20260727).
- **Art. 50, § 4, 2e alinéa** : « Les déployeurs d’un système d’IA qui génère ou manipule des textes publiés dans le but d’informer le public sur des questions d’intérêt public indiquent que le texte a été généré ou manipulé par une IA. »
- **Exception** : « Cette obligation ne s’applique pas […] lorsque le contenu généré par l’IA a fait l’objet d’un processus d’examen humain ou de contrôle éditorial et lorsqu’une personne physique ou morale assume la responsabilité éditoriale de la publication du contenu. »
- **Visuels** (§ 4, 1er alinéa) : l'obligation vise les « hypertrucages », c'est-à-dire des contenus qui ressemblent à des personnes, objets, lieux ou événements existants et peuvent passer pour authentiques. Un logo ou une illustration non réaliste n'en est pas un.
- **Dates** : l'article 50 s'applique depuis le **2 août 2026** (art. 113). L'« omnibus numérique sur l'IA », adopté (règlement (UE) 2026/1744 du 8 juillet 2026), ne reporte pas le § 4. Il ne touche, pour l'article 50, que le § 7 et un délai pour les fournisseurs (§ 2).
- **Lignes directrices de la Commission** (lues le 22/11/2026) : « Guidelines on the implementation of the transparency obligations for certain AI systems », publiées le 20/07/2026 (https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems ; leur référence C(2026) est **non vérifiée**). Points 130 à 143 :
  - « publié » veut dire accessible à un nombre indéterminé de personnes ; l'intérêt public couvre l'administration et les services publics ;
  - l'exception exige les deux conditions à la fois ;
  - l'examen humain porte sur le fond, avec au minimum une vérification des faits : une correction de l'orthographe, ou une simple politique éditoriale, ne suffit pas ;
  - une retouche par une IA après la validation fait perdre l'exception ;
  - la responsabilité éditoriale est la responsabilité juridique ultime ; l'identité et les coordonnées de la personne, ou de « the function », responsable devraient être publiées à un endroit facile à trouver, par exemple les mentions légales ;
  - l'information ne doit pas être cachée dans des conditions d'utilisation (point 142).
- **Code de bonnes pratiques** : « Code of Practice on Transparency of AI-Generated Content », version finale du 10/06/2026, volontaire (https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content). Pour l'exception, il demande une politique interne qui nomme le responsable, et la publication des coordonnées « of the function, the natural persons or the legal persons ».
- **Sanction** : jusqu'à 15 000 000 € d'amende (art. 99, § 4, g). L'autorité française compétente est **non vérifiée**.
- **Solution proposée pour Sovermap, les deux à la fois** :
  1. **Relecture éditoriale.** Chaque texte est relu et validé par le propriétaire, qui en assume la responsabilité comme directeur de la publication. Les textes entrent ainsi dans l'exception, à trois conditions venues des lignes directrices (22/11/2026) : une relecture du fond, faits vérifiés ; aucune retouche par une IA après la validation (sinon, relire de nouveau) ; et des coordonnées publiées pour la personne ou la fonction responsable (le choix E.4 en décide). Tant qu'un texte n'est pas relu, la mention se place près de lui, sur sa page, dès la première lecture (c'est ce que fait le site).
  2. **Mention volontaire** dans la page Crédits : « Textes rédigés avec l'aide d'un outil d'IA, relus et validés par l'éditeur, qui en assume la responsabilité. »
  - Pour les visuels : jamais d'image réaliste d'un lieu, d'une personne ou d'une entité existants. L'outil est cité dans les Crédits.

## 3. Risques et parades

### 3.1 Diffamation (loi du 29 juillet 1881)
- **Les textes** :
  - **art. 29** : « Toute allégation ou imputation d'un fait qui porte atteinte à l'honneur ou à la considération de la personne ou du corps auquel le fait est imputé est une diffamation. » ;
  - **art. 30** (administrations publiques) : 45 000 € d'amende ;
  - **art. 35** : « La vérité des faits diffamatoires peut toujours être prouvée » ;
  - **art. 65** : prescription de trois mois, applicable en ligne (LCEN, art. 1-1, V).
- **Le risque** :
  - un fait technique daté et sourcé ne porte pas, en lui-même, atteinte à l'honneur ;
  - le risque naît d'une **qualification** : « non conforme », « illégal », « viole la loi SREN ».
- **Parades** :
  - ne jamais qualifier juridiquement un site (cahier, § 2) ;
  - un vocabulaire neutre ;
  - garder les preuves datées, qui prouvent la vérité des faits ;
  - une page Corrections.
- **Non vérifié** : la jurisprudence sur la bonne foi, et sur la diffamation d'une société.

### 3.2 Droit de réponse en ligne
- **LCEN, art. 1-1, III** : « Toute personne nommée ou désignée dans un service de communication au public en ligne dispose d'un droit de réponse ». La réponse s'insère « dans les trois jours de leur réception », sous peine d'une amende de 3 750 €. Elle est gratuite.
- **Décret n° 2007-1527** : la réponse fait 200 lignes au plus, et se publie à la suite du contenu en cause.
- **Parade** : une procédure écrite dans la page Corrections, avec une adresse dédiée, un délai de trois jours et la publication à côté de la fiche concernée.

### 3.3 Marques
- **Le principe** : le Code de la propriété intellectuelle interdit l'usage d'une marque « dans la vie des affaires » sans autorisation (art. L713-2).
- **L'exception** : il permet de l'utiliser « pour désigner ou mentionner des produits ou des services comme étant ceux du titulaire de cette marque » (art. L713-6, I, 3°).
- **Parade** : des noms de sociétés en texte simple, jamais de logo, et rien qui suggère un partenariat (cahier, § 5.3).

### 3.4 Le droit des bases de données
- **CPI, art. L342-1** : le producteur d'une base peut interdire l'extraction ou la réutilisation d'une partie « qualitativement ou quantitativement substantielle ».
- **CPI, art. L342-2** : il peut aussi interdire « l'extraction ou la réutilisation répétée et systématique de parties qualitativement ou quantitativement non substantielles […] lorsque ces opérations excèdent manifestement les conditions d'utilisation normale ». Une collecte quotidienne automatisée peut relever de ce cas.
- **CPI, art. L342-3, 1°** : l'extraction d'une partie non substantielle par une personne qui y a licitement accès reste permise.
- **Parades** :
  - ne republier que ce qu'une licence explicite permet (`docs/sources.md`), ou des faits obtenus par notre propre mesure (les réponses DNS), ou des extraits non substantiels ;
  - les conditions contractuelles des sources s'appliquent en plus. Exemples : l'art. 3.3 de RIPEstat interdit toute redistribution ; l'art. 4.5 de la base du RIPE n'admet qu'une « insubstantial part ».
  - **Une relecture juridique de ces deux points est conseillée avant l'ouverture.**

### 3.5 Mesure DNS et « accès frauduleux » à un système
- **Code pénal, art. 323-1** : « Le fait d'accéder ou de se maintenir, frauduleusement, dans tout ou partie d'un système de traitement automatisé de données est puni de trois ans d'emprisonnement et de 100 000 € d'amende. »
- **Analyse** : poser à un serveur DNS une question publique, à laquelle il est fait pour répondre à tous, n'est pas un accès frauduleux.
- **Parades**, pour rester dans l'usage normal du DNS :
  - aucun balayage de ports ;
  - aucune demande de transfert de zone (AXFR) ;
  - un débit limité ;
  - aucune requête vers les sites en V1 ;
  - une page Méthode qui décrit la collecte.

### 3.6 Autres risques
1. **Présenter une donnée comme officielle.** Parade : ne reprendre aucun signe de l'État, dire « site indépendant », citer la source et la date de chaque liste (Licence Ouverte ; CRPA, L322-1).
2. **Conclure à une non-conformité.** L'article 31 ne vise que des données sensibles de l'État, et pas les collectivités. Parade : ne jamais afficher « conforme » ou « non conforme ».
3. **Données personnelles dans la collecte** : RNAME du SOA, PTR, contacts des registres. Parade : ne pas les conserver.
4. **L'hébergement du site chez une société américaine** : 18 U.S.C. § 2713 s'applique à Vercel.
   - Le risque juridique est faible : pas de compte, pas de formulaire, pas de cookie.
   - Parade : le dire en clair dans Confidentialité et sur la page « Sovermap passé à sa propre radiographie ».
5. **Les conditions des offres gratuites** :
   - Vercel Hobby est réservé à un « personal or non-commercial use » (https://vercel.com/legal/terms) ;
   - les Actions de GitHub excluent « any other activity unrelated to the production, testing, deployment, or publication of the software project associated with the repository » (https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features).
   - Notre lecture : Sovermap est non commercial, et sa collecte produit et publie les données du projet lui-même. Ce n'est qu'une lecture, et le fournisseur reste seul juge.
   - Parade : le plan de migration (décision D2).

### 3.7 Tableau des risques
| Risque | Gravité | Probabilité | Parade principale |
|---|---|---|---|
| Diffamation (qualifier un site ou une société) | Haute | Faible si l'on s'en tient aux faits | Faits datés et sourcés, aucune qualification, page Corrections |
| Droit de réponse non inséré sous 3 jours | Moyenne (3 750 €) | Moyenne | Procédure écrite, adresse dédiée |
| Mentions légales incomplètes | Haute (pénal) | Faible | LCEN, art. 1-1 ; option de l'éditeur anonyme |
| Base tierce republiée sans droit | Moyenne | Moyenne | Registre des sources, extraits non substantiels, relecture juridique |
| Texte fait avec une IA, non relu ou non signalé | Moyenne | Faible | Relecture éditoriale et mention dans les Crédits |
| Conditions d'une offre gratuite | Moyenne | Faible | Usage non commercial ; plan de migration (D2) |
| Marque (logo, confusion) | Faible | Faible | Noms seuls, sans logo |
| Accès « frauduleux » à un système | Faible | Très faible | DNS seul, sans AXFR, débit limité |
| RGPD : information incomplète | Faible | Moyenne | Page Confidentialité (art. 13), registre court |

## 4. Points non vérifiés

1. **Les circulaires 6282/SG et 6404/SG** : texte non lu sur Légifrance. Leur contenu a été lu sur le site de la DINUM.
2. **Légifrance** : aucune page n'a pu être ouverte. Les textes français viennent des bases officielles de la DILA.
3. **SecNumCloud** : le référentiel lui-même, le numéro de sa section sur le droit extra-européen, les critères de capital, et la version approuvée par l'arrêté du 12 août 2026.
4. **FISA 702** : relu le 22/11/2026. La loi publique 119-84 (18/04/2026) fixait la fin du titre VII au 30/04/2026 ; la loi 119-87 (30/04/2026) l'a reportée au 12/06/2026 (https://www.govinfo.gov/content/pkg/PLAW-119publ84/html/PLAW-119publ84.htm ; https://www.govinfo.gov/content/pkg/PLAW-119publ87/html/PLAW-119publ87.htm). Aucune loi postérieure sur la FISA dans la liste officielle des lois, à jour au 13/11/2026 (dernière loi : 119-142 du 10/11/2026 ; https://www.archives.gov/federal-register/laws/current.html). Restent **non vérifiés** : les lois signées après le 13/11/2026 et pas encore publiées ; la validité des certifications de la FISC « through March of 2027 », lue seulement dans le communiqué d'une élue (https://adams.house.gov/media-center/press-releases/rep-adams-statement-expiration-fisa).
5. **Le pourvoi C-703/25 P** : toujours **non vérifié** le 22/11/2026 (le site de la Cour renvoie vers InfoCuria, illisible pour un robot ; EUR-Lex vide). Une source secondaire, non officielle, le dit pendant, sans audience ni conclusions annoncées : elle n'est pas citée sur le site.
6. **CNIL** : la formulation « pas de bandeau sans traceur » ; les modifications de la recommandation n° 2020-092.
7. **Vercel** : relu le 22/11/2026 (§ 2.1). Reste **non vérifiée** sa fiche sur la liste officielle du Data Privacy Framework. Sa politique et ses conditions ne donnent aucun téléphone, ni aucun moyen de lui confier l'identité d'un éditeur (question E.4).
8. **IA** : les lignes directrices de la Commission ont été lues le 22/11/2026 (§ 2.6). L'autorité française reste **non vérifiée** : la liste de la Commission (09/11/2026) donne la DGCCRF comme point de contact unique pour la France, désignation « still pending final adoption » (https://digital-strategy.ec.europa.eu/en/policies/market-surveillance-authorities-under-ai-act) ; le projet de loi DDADUE, adopté au Sénat le 18/02/2026, est en première lecture à l'Assemblée, et son amendement 442 ne confierait à la CNIL que l'article 50, § 3 (https://www.senat.fr/enseance/2025-2026/348/Amdt_442.html).
9. **Accessibilité** : la norme harmonisée en vigueur, et sa version par rapport à WCAG 2.2.
10. **Jurisprudence** : la bonne foi en diffamation, la diffamation d'une société, le « maintien frauduleux ».
11. **Proposition de loi sur les collectivités** : son issue après la séance du 10/12/2026 (date pas encore passée le 22/11/2026).

## 5. Le droit en cinq points (pour l'ARRÊT 1)

1. **Sovermap décrit des faits, il ne juge pas.** La loi SREN (art. 31) ne vise que les données sensibles de l'État, et pas les collectivités. Le site n'affiche donc jamais « conforme » ou « non conforme ». C'est aussi la parade contre la diffamation.
2. **Les données de Sovermap peuvent être publiées sous Licence Ouverte 2.0**, avec les attributions de chaque source. Les sources aux conditions restrictives (RIPEstat, registres) ne servent qu'à vérifier ; la reprise limitée du RIPE est à faire relire par un juriste.
3. **Le site n'a ni cookie ni traceur, donc pas de bandeau.** Les journaux de l'hébergeur restent des données personnelles : la page Confidentialité doit le dire, avec le transfert vers les États-Unis.
4. **Mentions légales** (LCEN, art. 1-1) : un éditeur non professionnel peut rester anonyme, à condition que l'hébergeur ait son identité. Un droit de réponse doit pouvoir être inséré sous trois jours.
5. **Les textes faits avec une IA** sont relus et validés par le propriétaire, qui en assume la responsabilité (règlement sur l'IA, art. 50, § 4, applicable depuis le 2 août 2026). Une mention le dit dans les Crédits.
