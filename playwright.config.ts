import { defineConfig, devices } from "@playwright/test";

// The site is served on port 3100, never 3000 (another project of the owner may use it). The build is the production
// one: `npm run build` then `npm run start`.
// Browsers: locally, Edge (`msedge`), the owner's Firefox (`moz-firefox`) and WebKit; in the CI, a browser already on the
// runner (`PW_CHANNEL=chrome`), so nothing is downloaded and no system package is installed.
const PORT = 3100;
const channel = process.env["PW_CHANNEL"] ?? "msedge";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  webServer: {
    command: "npm run build && npm run start",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    // The production door and indexing stay closed unless the shell opens them: a local .env file never decides.
    env: {
      SITE_PUBLIC: process.env["SITE_PUBLIC"] ?? "closed",
      SITE_INDEXING: process.env["SITE_INDEXING"] ?? "closed",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], channel } },
    { name: "pixel-7", use: { ...devices["Pixel 7"], channel } },
    { name: "firefox", use: { ...devices["Desktop Firefox"], channel: "moz-firefox" } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
