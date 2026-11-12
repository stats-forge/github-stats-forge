/**
 * @file Compression for what is text: a card's SVG shrinks to a fifth, and so do the site's pages.
 */

import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';

type Encoding = 'br' | 'gzip';

/** Below this, the encoding's own framing costs about what it saves. */
const MIN_BYTES = 1024;

/** Brotli's default, 11, is meant for files compressed once; a card is compressed per request. */
const BROTLI_QUALITY = 5;

const COMPRESSIBLE =
  /^(?:text\/|image\/svg\+xml|application\/(?:json|xml|javascript|manifest\+json|wasm))/;

const brotli = promisify(brotliCompress);
const gzipped = promisify(gzip);

/**
 * The best encoding the caller accepts: brotli over gzip, and neither when `q=0` refuses it.
 *
 * @returns The encoding, or `undefined` to send the body as it is.
 */
const negotiate = (acceptEncoding: string | null): Encoding | undefined => {
  const accepted = new Set<string>();
  for (const part of (acceptEncoding ?? '').split(',')) {
    const [name = '', ...params] = part.split(';').map((piece) => piece.trim().toLowerCase());
    const refused = params.some((param) => /^q=0(?:\.0*)?$/.test(param));
    if (name !== '' && !refused) {
      accepted.add(name);
    }
  }

  if (accepted.has('br')) {
    return 'br';
  }
  if (accepted.has('gzip')) {
    return 'gzip';
  }
  return undefined;
};

/** @returns The bytes, encoded, in a buffer of their own as `Response` takes them. */
const encode = async (bytes: Uint8Array, encoding: Encoding): Promise<Uint8Array<ArrayBuffer>> => {
  if (encoding === 'br') {
    return new Uint8Array(
      await brotli(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY } }),
    );
  }
  return new Uint8Array(await gzipped(bytes));
};

/**
 * Every compressible answer says it varies by `Accept-Encoding`, compressed or not, so a shared
 * cache never hands a compressed body to a caller who cannot read it.
 *
 * @returns The response, compressed when the caller and the content allow it.
 */
const compress = async (request: Request, response: Response): Promise<Response> => {
  const type = response.headers.get('content-type') ?? '';
  if (
    response.body === null ||
    !COMPRESSIBLE.test(type) ||
    response.headers.has('content-encoding')
  ) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.append('vary', 'Accept-Encoding');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const encoding = negotiate(request.headers.get('accept-encoding'));

  if (encoding === undefined || bytes.byteLength < MIN_BYTES) {
    return new Response(bytes, { status: response.status, headers });
  }

  headers.set('content-encoding', encoding);
  return new Response(await encode(bytes, encoding), { status: response.status, headers });
};

export { MIN_BYTES, compress, negotiate };
