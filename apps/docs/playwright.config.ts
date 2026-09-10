/**
 * @file End-to-end tests for the anvil, which is the only page here that ships JavaScript.
 *
 * Nothing else checks it. The unit checks prove each card *can* be drawn from the recorded samples
 * (`check-anvil-samples`), and the build proves the page compiles — but only a browser proves that
 * picking a card rebuilds the controls, that an option reaches the renderer, and that a rejected
 * one draws core's own error card instead of breaking the page.
 *
 * It runs against the built site rather than the dev server, so the bundle is what is tested — the
 * `samples.json` import and core's api both reach the browser through it. `e2e/serve.ts` is what
 * serves it, because `astro preview` daemonizes and so cannot be a `webServer`.
 */

import { defineConfig, devices } from '@playwright/test';

import { BASE } from './src/constants.ts';

const PORT = 4329;

export default defineConfig({
  testDir: './e2e',
  // The suite asserts on what the page requests, so nothing may share a browser context.
  fullyParallel: true,
  forbidOnly: process.env['CI'] !== undefined,
  retries: process.env['CI'] === undefined ? 0 : 2,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${String(PORT)}${BASE}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node e2e/serve.ts ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}${BASE}/anvil/`,
    // Never reused: a server left over from an earlier run serves the build from *then*, which is
    // how a green suite turned red inside `check-all` right after a rebuild. Starting one costs ~0.2s.
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
