import { expect, test } from "@playwright/test";
import { ADRESSES_PORTE } from "../lib/porte";
import { sitePublic } from "../lib/site";
import { ecartsPorte } from "../scripts/lib/porte-controle";

test.skip(sitePublic(), "la porte est ouverte pour ce build (SITE_PUBLIC=open)");

// The production door, closed (brief of chantier 2, A.6): the local build answers each address of the list exactly as
// `npm run probe:prod` requires from the production. playwright.config.ts builds with SITE_PUBLIC=closed unless the
// shell says otherwise: these tests then check the closed door.
for (const adresse of ADRESSES_PORTE) {
  const entetes = adresse.entetes === undefined ? "" : ` [${Object.keys(adresse.entetes).join(", ")}]`;
  test(`porte fermée : ${adresse.chemin}${entetes} (${adresse.famille})`, async ({ request, baseURL }) => {
    // An internal navigation without its `_rsc` check is first redirected by `next start` (Vercel answers at once).
    const response = await request.get(adresse.chemin, {
      maxRedirects: adresse.entetes === undefined ? 0 : 3,
      headers: { ...adresse.entetes },
    });
    const ecarts = ecartsPorte(adresse, {
      status: response.status(),
      contentType: response.headers()["content-type"] ?? "",
      texte: await response.text(),
      origine: new URL(baseURL ?? "http://127.0.0.1:3100").origin,
    });
    expect(ecarts).toEqual([]);
  });
}
