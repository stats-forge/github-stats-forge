#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { styleText } from 'node:util';

/**
 * @file Every check CI runs, cheapest failure first.
 *
 * It was one `&&` chain in `package.json` until it reached eleven links and stopped being
 * readable. Keep it in step with `.github/workflows/ci.yml`: a check that runs there and not
 * here is a check that fails after the push instead of before it.
 */

/** Each check's name, and the pnpm arguments that run it. */
const CHECKS: Record<string, Array<string>> = {
  // `astro:content` has no types until sync writes them, and the type-aware lint rules read them.
  'docs types': ['run', 'docs:sync'],
  format: ['run', 'format:check'],
  lint: ['run', 'lint'],
  typecheck: ['run', 'typecheck'],
  publish: ['run', 'lint:publish'],
  'graphql types': ['--filter', './packages/core', 'run', 'check-graphql-types'],
  'themes page': ['--filter', './apps/docs', 'run', 'check-themes-page'],
  'docs site': ['run', 'docs:build'],
  knip: ['run', 'lint:knip'],
  deps: ['run', 'lint:deps'],
  tests: ['exec', 'vitest', '--run'],
};

/** Runs the rest after a failure, for when the whole list is more useful than the first one. */
const keepGoing = process.argv.includes('-k') || process.argv.includes('--keep-going');

/**
 * @returns Seconds since `start`, to one decimal.
 */
const since = (start: number): string => `${((performance.now() - start) / 1000).toFixed(1)}s`;

const entries = Object.entries(CHECKS);
const failed: Array<string> = [];
const started = performance.now();

for (const [index, [name, args]] of entries.entries()) {
  console.log(styleText('bold', `\n> ${index + 1}/${entries.length} ${name}`));

  const at = performance.now();
  const { status } = spawnSync('pnpm', args, {
    stdio: 'inherit',
    // `pnpm` is a shell script on Windows, which `spawn` will not run on its own.
    shell: process.platform === 'win32',
  });

  const passed = status === 0;
  console.log(
    `${styleText(passed ? 'green' : 'red', passed ? 'PASS' : 'FAIL')} ${name} (${since(at)})`,
  );

  if (!passed) {
    failed.push(name);
    if (!keepGoing) {
      break;
    }
  }
}

console.log(
  failed.length === 0
    ? styleText('green', `\nAll ${entries.length} checks passed in ${since(started)}`)
    : `\n${styleText('red', 'Failed')}: ${failed.join(', ')} (${since(started)})`,
);

process.exitCode = failed.length === 0 ? 0 : 1;
