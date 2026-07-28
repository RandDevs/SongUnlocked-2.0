import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    ...devices["Desktop Chrome"],
    viewport: { width: 420, height: 900 },
  },
  webServer: {
    command: "cmd /c \"npx vite preview --port 4173\"",
    port: 4173,
    reuseExistingServer: false,
  },
});
