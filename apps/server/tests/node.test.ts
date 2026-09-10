import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, expect, test, vi } from 'vitest';

import { createHandler } from '../src/handler.ts';
import { closeGracefully, createNodeServer } from '../src/node.ts';

import { testOptions } from './_fake-github.ts';

/** @returns The server, listening on a free port. */
const listen = (server: Server): Promise<number> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve((server.address() as AddressInfo).port);
    });
  });

afterEach(() => {
  vi.restoreAllMocks();
});

// the adapter's tests: everything else worth asserting is in `handler.ts`, tested without a socket
test('answers the health check over a real listener', async () => {
  const server = createNodeServer(createHandler(testOptions()), false);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/healthz`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ status: 'ok' });
  } finally {
    await closeGracefully(server, 1000);
  }
});

test('answers 500 rather than dying when the handler throws', async () => {
  // the failure is reported on stderr; nothing here asserts on that
  vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  const server = createNodeServer(() => Promise.reject(new Error('boom')), false);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/gist`);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: 'internal' });
  } finally {
    await closeGracefully(server, 1000);
  }
});
