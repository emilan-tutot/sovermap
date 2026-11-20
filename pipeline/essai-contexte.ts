// A small classification context for the tests of the collection v1: documentation addresses (RFC 5737, RFC 3849),
// AS numbers (RFC 5398) and names (RFC 2606) only; made-up companies, each with two dated sources.
import { type ContexteV1, coucheReseauPubliable } from "./couches";
import { TableIpToAsn, TableRis } from "./reseau";

const deux = [
  { titre: "Registre exemple", url: "https://registre.example/fiche", lu_le: "2026-11-19" },
  { titre: "Société exemple", url: "https://societes.example/fiche", lu_le: "2026-11-19" },
];

export function contexteEssai(): ContexteV1 {
  return {
    iptoasn: new TableIpToAsn(
      [
        "192.0.2.0\t192.0.2.255\t64496\tFR\tEXEMPLE-HEBERGEUR",
        "198.51.100.0\t198.51.100.255\t64500\tUS\tEXEMPLE-CDN",
        "203.0.113.0\t203.0.113.255\t64501\tUS\tEXEMPLE-CLOUD",
        "2001:db8::\t2001:db8:ffff:ffff:ffff:ffff:ffff:ffff\t64496\tFR\tEXEMPLE-HEBERGEUR",
      ].join("\n"),
    ),
    ris: new TableRis([
      [
        "64496\t192.0.2.0/24\t300",
        "64500\t198.51.100.0/24\t250",
        "64501\t203.0.113.0/24\t200",
        "64496\t2001:db8::/32\t150",
      ].join("\n"),
    ]),
    cdn: {
      version: "essai",
      fournisseurs: [
        {
          id: "cdn-exemple",
          nom: "CDN Exemple",
          societe: "cdn-us",
          suffixes: [{ suffixe: ".cdn.example", source: "https://cdn.example/doc", lu_le: "2026-11-19" }],
          as: [{ numero: 64500, suffit_seul: true, source: "https://cdn.example/doc", lu_le: "2026-11-19" }],
        },
      ],
    },
    plages: {},
    coucheReseau: coucheReseauPubliable,
    tableAs: {
      version: "essai",
      as: {
        "64496": { societe: "hebergeur-fr", titulaire_registre: "EXEMPLE-HEBERGEUR", sources: deux },
        "64500": { societe: "cdn-us", titulaire_registre: "EXEMPLE-CDN", sources: deux },
        "64501": { societe: "cloud-us", titulaire_registre: "EXEMPLE-CLOUD", sources: deux },
      },
    },
    societes: {
      version: "essai",
      societes: {
        "hebergeur-fr": { nom: "Hébergeur Exemple SAS", pays: "FR", mere: null, sources: deux, sources_mere: deux },
        "cdn-us": { nom: "CDN Exemple, Inc.", pays: "US", mere: null, sources: deux, sources_mere: deux },
        "cloud-us": { nom: "Cloud Exemple, Inc.", pays: "US", mere: null, sources: deux, sources_mere: deux },
      },
    },
    paysAs: new Map([
      [64496, "FR"],
      [64500, "US"],
      [64501, "US"],
    ]),
    titulairesRipe: new Map([[64496, { orgName: "Hébergeur Exemple SAS", pays: "FR" }]]),
  };
}
