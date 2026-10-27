import { defineConfig } from '@playwright/test';
import fs from 'fs';

const replitChromium = '/repl/tools/bin/chromium';
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath =
  process.env.CHROMIUM_PATH ||
  (fs.existsSync(replitChromium)
    ? replitChromium
    : fs.existsSync(macChrome)
      ? macChrome
      : undefined);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    browserName: 'chromium',
    ...(executablePath
      ? {
          launchOptions: {
            executablePath,
            args: ['--no-sandbox', '--disable-dev-shm-usage'],
          },
        }
      : {}),
  },
  projects: [
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
    },
  ],
  reporter: 'list',
});
