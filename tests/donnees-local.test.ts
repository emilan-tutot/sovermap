// Tests of the local reader of published data (D.8: the full site's end-to-end tests): it reads a file of its folder,
// and never a path that leaves it. A temporary folder, no network.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { fetchLocal } from "@/lib/donnees/lecture";

const racine = mkdtempSync(path.join(tmpdir(), "sovermap-local-"));
const dossier = path.join(racine, "donnees");
mkdirSync(path.join(dossier, "index"), { recursive: true });
writeFileSync(path.join(dossier, "index", "as.json"), '{"64496":{}}');
writeFileSync(path.join(racine, "secret.json"), '{"secret":true}');
afterAll(() => rmSync(racine, { recursive: true, force: true }));

const adresse = (chemin: string) => `https://raw.githubusercontent.com/exemple/sovermap/donnees/${chemin}`;

describe("the local reader of published data (D.8)", () => {
  const lire = fetchLocal(dossier);

  it("reads a file of its folder by the address the reader builds", async () => {
    const r = await lire(adresse("index/as.json"));
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('{"64496":{}}');
    expect((await lire(adresse("index/absent.json"))).status).toBe(404);
  });

  it("never reads outside its folder, whatever the address", async () => {
    for (const chemin of [
      "../secret.json",
      "index/../../secret.json",
      "%2e%2e/secret.json",
      "index/%2e%2e/%2e%2e/secret.json",
    ]) {
      expect((await lire(adresse(chemin))).status).toBe(404);
    }
    expect((await lire("https://raw.githubusercontent.com/exemple/autre/chose.json")).status).toBe(404);
  });
});
