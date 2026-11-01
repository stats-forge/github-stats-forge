/**
 * @file The one way a generator downloads what it regenerates from, so a failed request stops it
 * before anything is written.
 */

/**
 * @throws {Error} When the response is not a 2xx, naming the status and the URL.
 *
 * @returns The response, to read as text or JSON.
 */
const fetchOk = async (url: string): Promise<Response> => {
  const response = await fetch(url);
  if (!response.ok) {
    // no statusText: HTTP/2 carries no reason phrase
    throw new Error(`${String(response.status)} for ${url}`);
  }
  return response;
};

export { fetchOk };
