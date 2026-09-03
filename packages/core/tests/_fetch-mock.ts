import type { FetchLike } from '../src/common/http.js';

/** A request the mock was asked to send, as the assertions read it back. */
interface MockRequest {
  url: string;
  method: string;
  /** Request body, `undefined` for a GET. */
  data: string | undefined;
}

/** Status and body a handler answers with, in the order `[status, body]`. */
type ReplyResult = [number, unknown?];

type ReplyFn = (request: MockRequest) => ReplyResult | Promise<ReplyResult>;

/** A string matches the whole URL; a regexp is tested against it; `undefined` matches anything. */
type Matcher = string | RegExp | undefined;

interface Handler {
  method: string | undefined;
  matcher: Matcher;
  reply: ReplyFn;
  once: boolean;
}

const matches = (handler: Handler, request: MockRequest): boolean => {
  if (handler.method !== undefined && handler.method !== request.method) {
    return false;
  }
  if (handler.matcher === undefined) {
    return true;
  }
  return typeof handler.matcher === 'string'
    ? handler.matcher === request.url
    : handler.matcher.test(request.url);
};

/** Registers what one matcher answers with. Every method returns the mock, so calls chain. */
interface Registrar {
  reply: {
    (status: number, body?: unknown): FetchMock;
    (fn: ReplyFn): FetchMock;
  };
  replyOnce: {
    (status: number, body?: unknown): FetchMock;
    (fn: ReplyFn): FetchMock;
  };
  networkError: () => FetchMock;
}

/** Turns either `reply` form — a status plus a body, or a function — into one reply function. */
const asReplyFn =
  (statusOrFn: number | ReplyFn, body: unknown): ReplyFn =>
  (request) =>
    typeof statusOrFn === 'function' ? statusOrFn(request) : [statusOrFn, body];

/**
 * Stands in for the transport a `CardConfig` carries, with the surface
 * `axios-mock-adapter` offered: `onPost`/`onGet`/`onAny`, `reply`/`replyOnce`/`networkError`,
 * a `history` of what was sent, and `reset`.
 *
 * Pass {@link FetchMock.fetch} to `CardConfig` — tests substitute the transport the same way a host does.
 */
class FetchMock {
  private handlers: Array<Handler> = [];

  readonly history: { get: Array<MockRequest>; post: Array<MockRequest> } = {
    get: [],
    post: [],
  };

  /**
   * The transport to hand `CardConfig`.
   * Bound to the instance so it can be passed on its own.
   */
  readonly fetch: FetchLike = async (url, init) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const request: MockRequest = {
      url,
      method,
      data: typeof init?.body === 'string' ? init.body : undefined,
    };

    if (method === 'GET') {
      this.history.get.push(request);
    } else if (method === 'POST') {
      this.history.post.push(request);
    }

    const index = this.handlers.findIndex((h) => matches(h, request));
    const handler = this.handlers[index];
    if (!handler) {
      throw new TypeError(`No mock handler for ${method} ${url}`);
    }
    if (handler.once) {
      this.handlers.splice(index, 1);
    }

    const [status, body] = await handler.reply(request);
    return new Response(body === undefined ? '' : JSON.stringify(body), {
      status,
    });
  };

  /**
   * @param method HTTP method to match, or `undefined` for any.
   * @param matcher URL to match.
   * @returns The registrar for this matcher.
   */
  private on(method: string | undefined, matcher: Matcher): Registrar {
    const add = (reply: ReplyFn, once: boolean): FetchMock => {
      const handler: Handler = { method, matcher, reply, once };
      // a persistent handler replaces the one it repeats, the way axios-mock-adapter did,
      // so a test can re-answer a matcher its `beforeEach` already registered.
      const existing = once
        ? -1
        : this.handlers.findIndex((h) => !h.once && h.method === method && h.matcher === matcher);
      if (existing > -1) {
        this.handlers.splice(existing, 1, handler);
      } else {
        this.handlers.push(handler);
      }
      return this;
    };

    return {
      reply: (statusOrFn: number | ReplyFn, body?: unknown) =>
        add(asReplyFn(statusOrFn, body), false),
      replyOnce: (statusOrFn: number | ReplyFn, body?: unknown) =>
        add(asReplyFn(statusOrFn, body), true),
      networkError: () =>
        add(() => {
          throw new TypeError('Network Error');
        }, false),
    };
  }

  onGet(matcher?: Matcher): Registrar {
    return this.on('GET', matcher);
  }

  onPost(matcher?: Matcher): Registrar {
    return this.on('POST', matcher);
  }

  onAny(matcher?: Matcher): Registrar {
    return this.on(undefined, matcher);
  }

  /** Drops every handler and everything recorded. */
  reset(): void {
    this.handlers = [];
    this.history.get.length = 0;
    this.history.post.length = 0;
  }
}

export { FetchMock };
