/**
 * @file The process: read the environment, listen, and stop when told to.
 */

import { loadCache, saveCache } from './cache-file.ts';
import { readSettings } from './config.ts';
import { createHandler } from './handler.ts';
import { closeGracefully, createNodeServer } from './node.ts';

const settings = readSettings(process.env);
const { cache } = settings.options;
const { cacheDir } = settings;
const restored = cacheDir === undefined ? 0 : await loadCache(cache, cacheDir);
const server = createNodeServer(createHandler(settings.options), settings.logRequests);

server.listen(settings.port, settings.host, () => {
  const tokens = settings.options.config.pats.length;
  process.stdout.write(
    `${JSON.stringify({
      event: 'listening',
      host: settings.host,
      port: settings.port,
      // the count only: a token's value never reaches a log line
      tokens,
      restored,
    })}\n`,
  );

  if (tokens === 0) {
    process.stderr.write(
      'No PAT_* variable is set, so every card but wakatime will draw the "no_tokens" error.\n',
    );
  }
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    // inline, because `unicorn/no-process-exit` allows an exit inside a signal listener alone
    void (async (): Promise<void> => {
      await closeGracefully(server, settings.shutdownTimeoutMs);
      if (cacheDir !== undefined) {
        await saveCache(cache, cacheDir);
      }
      process.exit(0);
    })();
  });
}
