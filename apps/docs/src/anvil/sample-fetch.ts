import { rangeCount, sampleKey } from './sample-key.ts';

/** What the recorder wrote: the status and body GitHub answered a key with. */
interface SampleResponse {
  status: number;
  body: unknown;
}

type Samples = Record<string, SampleResponse>;

/** The `range_N` fields `aliasedRanges` asks for, in the order it asks for them. */
const rangeFields = (user: Record<string, unknown>): Array<[string, unknown]> =>
  Object.entries(user)
    .filter(([field]) => /^range_\d+$/.test(field))
    .toSorted(([a], [b]) => Number(a.slice(6)) - Number(b.slice(6)));

/**
 * Ranges are aliased by position, not by year, so one recording answers any length: a shorter
 * request takes the leading blocks and a longer one cycles them. `from` and `to` can therefore
 * move over the whole allowed span, at the cost — stated on the page — of the numbers being fixed.
 *
 * @returns The body, with its ranges re-aliased, or unchanged when neither side has any.
 */
const withRanges = (body: unknown, wanted: number): unknown => {
  if (wanted === 0 || typeof body !== 'object' || body === null) {
    return body;
  }

  const user = (body as { data?: { user?: unknown } }).data?.user;
  if (typeof user !== 'object' || user === null) {
    return body;
  }

  const recorded = rangeFields(user as Record<string, unknown>);
  if (recorded.length === 0) {
    return body;
  }

  const others = Object.fromEntries(
    Object.entries(user as Record<string, unknown>).filter(([field]) => !/^range_\d+$/.test(field)),
  );
  const ranges = Object.fromEntries(
    Array.from({ length: wanted }, (_, index) => [
      `range_${String(index)}`,
      recorded[index % recorded.length]?.[1],
    ]),
  );

  return { ...body, data: { ...(body as { data?: object }).data, user: { ...others, ...ranges } } };
};

/**
 * Nothing leaves the browser. A request with no recording is answered as a GitHub error, so the
 * card draws that failure rather than hanging.
 *
 * @returns A `fetch` core can send through.
 */
const createSampleFetch =
  (samples: Samples) =>
  (url: string, init?: RequestInit): Promise<Response> => {
    const key = sampleKey(url, init);
    const sample = key === undefined ? undefined : samples[key];

    if (sample === undefined) {
      return Promise.resolve(
        Response.json(
          { errors: [{ type: 'NOT_FOUND', message: `No sample recorded for "${key ?? url}"` }] },
          { status: 404 },
        ),
      );
    }

    const body =
      typeof init?.body === 'string' ? withRanges(sample.body, rangeCount(init.body)) : sample.body;

    return Promise.resolve(Response.json(body, { status: sample.status }));
  };

export { createSampleFetch };
export type { Samples };
