import { defineConfig } from "@playwright/test"

// Tests de bout en bout : le backend ET le site doivent déjà tourner, sur une base
// alimentée par le script de démonstration (voir le README à la racine).
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.STOREFRONT_URL ?? "http://localhost:8000",
    viewport: { width: 1440, height: 900 },
    // CHROMIUM_PATH : navigateur déjà installé (facultatif ; sinon « npx playwright install chromium »).
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
})
