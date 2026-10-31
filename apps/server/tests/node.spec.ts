import type { Server } from 'node:http';
import { connect } from 'node:net';
import type { AddressInfo } from 'node:net';

import { afterEach, expect, test, vi } from 'vitest';

import { createHandler } from '../src/handler.ts';
import { closeGracefully, createNodeServer } from '../src/node.ts';

import { testOptions } from './_fake-github.ts';

/** @returns The server, listening on a free port. */
const listen = async (server: Server): Promise<number> =>
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

test.each([
  { logging: true, lines: 1 },
  { logging: false, lines: 0 },
])('writes $lines log lines for a request when logging is $logging', async ({ logging, lines }) => {
  const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const server = createNodeServer(createHandler(testOptions()), logging);
  const port = await listen(server);

  try {
    await fetch(`http://127.0.0.1:${port}/healthz`);

    const logged = write.mock.calls.filter(([chunk]) => String(chunk).includes('"/healthz"'));
    expect(logged).toHaveLength(lines);
  } finally {
    await closeGracefully(server, 1000);
  }
});

test('answers 500 rather than dying when the handler throws', async () => {
  // the failure is reported on stderr; nothing here asserts on that
  vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  const server = createNodeServer(async () => Promise.reject(new Error('boom')), false);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/gist`);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: 'internal' });
  } finally {
    await closeGracefully(server, 1000);
  }
});

test('answers 400 to a Host header no URL can be built from', async () => {
  const server = createNodeServer(createHandler(testOptions()), false);
  const port = await listen(server);

  try {
    // fetch cannot send this header, so the request goes over a bare socket
    const reply = await new Promise<string>((resolve, reject) => {
      let received = '';
      const socket = connect(port, '127.0.0.1', () => {
        socket.end('GET /healthz HTTP/1.1\r\nHost: not a host\r\nConnection: close\r\n\r\n');
      });
      socket.on('data', (chunk) => {
        received += String(chunk);
      });
      socket.on('end', () => {
        resolve(received);
      });
      socket.on('error', reject);
    });

    expect(reply).toMatch(/^HTTP\/1\.1 400 /u);
    expect(reply).toContain('"bad_request"');
  } finally {
    await closeGracefully(server, 1000);
  }
});

test('drops the connection rather than dying when a body cannot be read', async () => {
  const unreadable = new ReadableStream({
    pull(controller): void {
      controller.error(new Error('boom'));
    },
  });
  const server = createNodeServer(async (request) => {
    if (new URL(request.url).pathname === '/broken') {
      return Promise.resolve(new Response(unreadable));
    }
    return Promise.resolve(new Response('ok'));
  }, false);
  const port = await listen(server);

  try {
    await expect(fetch(`http://127.0.0.1:${port}/broken`)).rejects.toThrow(TypeError);
    // the process, and the listener, are still serving
    const response = await fetch(`http://127.0.0.1:${port}/`);
    await expect(response.text()).resolves.toBe('ok');
  } finally {
    await closeGracefully(server, 1000);
  }
});

test('cuts a request still in flight once the shutdown timeout runs out', async () => {
  const server = createNodeServer(async () => new Promise<Response>(() => {}), false);
  const port = await listen(server);

  const inFlight = fetch(`http://127.0.0.1:${port}/healthz`);
  // wait for the request to reach the handler, so the connection is not idle
  await new Promise<void>((resolve) => {
    server.once('request', () => {
      resolve();
    });
  });

  await closeGracefully(server, 50);

  await expect(inFlight).rejects.toThrow(TypeError);
  expect(server.listening).toBe(false);
});
