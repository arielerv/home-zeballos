import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Concurrent work in this checkout must not delete another run's traces.
  outputDir: `/tmp/t3-designer-i18n-results-${process.pid}`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Exercise the documented fallback without depending on a host GPU.
    launchOptions: { args: ['--disable-webgl'] },
  },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
})
