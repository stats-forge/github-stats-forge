/**
 * @file What the image's `HEALTHCHECK` runs: exits `0` when the server answered, `1` otherwise.
 * `node:http` rather than `fetch`, which would spin up undici for one request every thirty seconds.
 */

import { get } from 'node:http';

import { DEFAULT_HOST, DEFAULT_PORT, HEALTH_PATH } from './health.ts';

/** A wildcard bind is reachable on loopback; a concrete address only on itself. */
const ANY_ADDRESS = new Set(['0.0.0.0', '::']);

// `||`: an empty variable is an unset one, as `config.ts` reads it
const host = process.env['HOST'] || DEFAULT_HOST;
const port = process.env['PORT'] || DEFAULT_PORT;

const request = get(
  {
    host: ANY_ADDRESS.has(host) ? '127.0.0.1' : host,
    port,
    path: HEALTH_PATH,
    // the global agent keeps the socket alive past the check's own three-second timeout
    agent: false,
  },
  (response) => {
    // an unconsumed response never ends
    response.resume();
    process.exitCode = response.statusCode === 200 ? 0 : 1;
  },
);

request.on('error', () => {
  process.exitCode = 1;
});
