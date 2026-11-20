import { expect, test } from "@playwright/test";
import { ADRESSES_PORTE } from "../lib/porte";
import { ecartsPorte } from "../scripts/lib/porte-controle";

// The production door, closed (brief of chantier 2, A.6): the local build answers each address of the list exactly as
// `npm run probe:prod` requires from the production. The build of these tests has no SITE_PUBLIC: the door is closed.
for (const adresse of ADRESSES_PORTE) {
  test(`porte fermée : ${adresse.chemin} (${adresse.famille})`, async ({ request }) => {
    const response = await request.get(adresse.chemin, { maxRedirects: 0 });
    const ecarts = ecartsPorte(adresse, {
      status: response.status(),
      contentType: response.headers()["content-type"] ?? "",
      texte: await response.text(),
    });
    expect(ecarts).toEqual([]);
  });
}
