/**
 * @file Loaded with `node --import` ahead of the CLI, so the previews are drawn from the fictional
 * account and nothing reaches the network. Core reads the global `fetch` at call time, so
 * replacing it here leaves the CLI itself untouched. The clock is held still too, since the
 * organization calendar prints the dates it covers.
 */

import { fixtureFetch } from '../src/anvil/fixtures.ts';

globalThis.fetch = async (input, init): Promise<Response> =>
  fixtureFetch(input instanceof Request ? input.url : String(input), init);

/** Today, for every preview: the calendar's weeks end on it. */
const FROZEN_AT = Date.parse('2026-11-03T12:00:00Z');

const RealDate = Date;

globalThis.Date = class FrozenDate extends RealDate {
  constructor(...args: Array<number | string | Date>) {
    if (args.length === 0) {
      super(FROZEN_AT);
      return;
    }
    super(...(args as [number]));
  }

  static override now(): number {
    return FROZEN_AT;
  }
} as DateConstructor;
