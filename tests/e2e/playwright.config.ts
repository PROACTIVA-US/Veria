import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  use: { headless: true, baseURL: 'http://localhost:3000' },
  reporter: [['list']]
});
