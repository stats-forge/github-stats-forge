/**
 * @file Loaded with `node --import` ahead of the CLI, so the previews are drawn from the fictional
 * account and nothing reaches the network. Core reads the global `fetch` at call time, so
 * replacing it here leaves the CLI itself untouched.
 */

import { fixtureFetch } from '../src/anvil/fixtures.ts';

globalThis.fetch = async (input, init): Promise<Response> =>
  fixtureFetch(input instanceof Request ? input.url : String(input), init);
