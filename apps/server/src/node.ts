/**
 * @file The node adapter: the only file here that knows what an `IncomingMessage` is.
 */

import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';

import { problem } from './handler.ts';
import { logRequest } from './log.ts';

type FetchHandler = (request: Request) => Promise<Response>;

/**
 * Node's request as the handler takes it. Only `GET` and `HEAD` are served, so no body crosses,
 * and nothing routes on a header, so none is copied.
 *
 * @returns The request.
 */
const toRequest = (incoming: IncomingMessage): Request => {
  const origin = `http://${incoming.headers.host ?? 'localhost'}`;
  return new Request(new URL(incoming.url ?? '/', origin), { method: incoming.method ?? 'GET' });
};

/**
 * Buffered rather than streamed, the largest thing served being the site's search index.
 * Bytes rather than text, because the site carries fonts and images.
 */
const send = async (response: Response, outgoing: ServerResponse): Promise<void> => {
  for (const [name, value] of response.headers) {
    outgoing.setHeader(name, value);
  }
  outgoing.writeHead(response.status);
  outgoing.end(new Uint8Array(await response.arrayBuffer()));
};

/**
 * A listener over the handler. Nothing escapes it: a bad request is an answer, and so is a
 * handler that threw, because an unhandled rejection is a dead process.
 *
 * @returns The server, not yet listening.
 */
const createNodeServer = (handler: FetchHandler, logging: boolean): Server => {
  const answer = async (incoming: IncomingMessage): Promise<Response> => {
    let request: Request;
    try {
      request = toRequest(incoming);
    } catch {
      // an unparseable request line or Host header
      return problem(400, 'bad_request', 'Malformed request');
    }

    const startedAt = performance.now();
    let response: Response;
    try {
      response = await handler(request);
    } catch (error) {
      process.stderr.write(
        `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
      );
      response = problem(500, 'internal', 'The server could not answer');
    }

    if (logging) {
      logRequest(request, response, startedAt);
    }
    return response;
  };

  const serve = async (incoming: IncomingMessage, outgoing: ServerResponse): Promise<void> => {
    try {
      await send(await answer(incoming), outgoing);
    } catch {
      outgoing.destroy();
    }
  };

  return createServer((incoming, outgoing): void => {
    void serve(incoming, outgoing);
  });
};

/**
 * Stops accepting connections and lets what is in flight finish, so `docker stop` is not a
 * dropped response.
 *
 * @returns Resolves once the listener is closed, or once `timeoutMs` has run out.
 */
const closeGracefully = (server: Server, timeoutMs: number): Promise<void> =>
  new Promise((resolve) => {
    const forced = setTimeout(() => {
      server.closeAllConnections();
      resolve();
    }, timeoutMs);
    forced.unref();

    server.close(() => {
      clearTimeout(forced);
      resolve();
    });
    server.closeIdleConnections();
  });

export { closeGracefully, createNodeServer };
