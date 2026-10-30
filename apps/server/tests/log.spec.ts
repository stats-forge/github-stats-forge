import { afterEach, expect, test, vi } from 'vitest';

import { createHandler } from '../src/handler.ts';
import { logRequest } from '../src/log.ts';

import { GIST_ID, GIST_NOT_FOUND_REPLY, optionsAnswering, testOptions } from './_fake-github.ts';

/**
 * @returns What `logRequest` wrote for the handler's answer to `url`, taken 250ms after it began.
 */
const logLineFor = async (
  url: string,
  options = testOptions(),
): Promise<{ written: string; line: unknown }> => {
  const request = new Request(url);
  const response = await createHandler(options)(request);
  const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  vi.spyOn(performance, 'now').mockReturnValue(1250);

  logRequest(request, response, 1000);

  expect(write).toHaveBeenCalledTimes(1);
  const written = String(write.mock.calls[0]?.[0]);
  return { written, line: JSON.parse(written) };
};

afterEach(() => {
  vi.restoreAllMocks();
});

test('records a card from the headers the handler answered with', async () => {
  const { options } = optionsAnswering(GIST_NOT_FOUND_REPLY);
  const { written, line } = await logLineFor(`http://localhost/api/gist/?id=${GIST_ID}`, options);

  expect(written.endsWith('}\n')).toBe(true);
  expect(line).toStrictEqual({
    method: 'GET',
    path: '/api/gist',
    card: 'gist',
    status: 200,
    card_status: 'error',
    error_code: 'not_found',
    cache: 'miss',
    duration_ms: 250,
  });
});

test('never records a query value', async () => {
  const { options } = optionsAnswering(GIST_NOT_FOUND_REPLY);
  const { written } = await logLineFor(`http://localhost/api/gist?id=${GIST_ID}`, options);

  expect(written).not.toContain(GIST_ID);
});

test('leaves the card fields out for a path that draws no card', async () => {
  const { line } = await logLineFor('http://localhost/healthz');

  expect(line).toStrictEqual({ method: 'GET', path: '/healthz', status: 200, duration_ms: 250 });
});
