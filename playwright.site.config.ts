import { defineConfig, devices } from "@playwright/test";
import { DONNEES_ESSAI } from "./e2e-site/donnees";

// The end-to-end tests of the full site (D.8): the door and indexing open (to test the robots rule of each page and the
// sitemaps, D.7), on a small made-up published state (written by scripts/donnees-essai.ts with the collection's own
// publication code) read from a local folder instead of GitHub, with a made-up account name: no network, no real data.
// Port 3100, never 3000; a production build, never deployed. The door-closed tests keep their own configuration
// (playwright.config.ts).
const PORT = 3100;
const channel = process.env["PW_CHANNEL"] ?? "msedge";

export default defineConfig({
  testDir: "./e2e-site",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  // After the tests, the made-up state leaves the machine's temporary folder.
  globalTeardown: "./e2e-site/nettoyage.ts",
  webServer: {
    // Next's data cache (.next/cache/fetch-cache) outlives a build and keeps etat.json an hour under the account's name:
    // it is emptied first, so that the server reads this run's made-up state, never an earlier one.
    command: [
      `node -e "require('node:fs').rmSync('.next/cache/fetch-cache', { recursive: true, force: true })"`,
      `npx tsx scripts/donnees-essai.ts "${DONNEES_ESSAI}"`,
      "npm run build",
      "npm run start",
    ].join(" && "),
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      SITE_PUBLIC: "open",
      SITE_INDEXING: "open",
      SOVERMAP_GITHUB_OWNER: "exemple",
      SOVERMAP_DONNEES_LOCALES: DONNEES_ESSAI,
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], channel } },
    { name: "pixel-7", use: { ...devices["Pixel 7"], channel } },
  ],
});
