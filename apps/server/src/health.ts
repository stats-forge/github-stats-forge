/**
 * @file What the health check needs to know, and nothing that imports core: `healthcheck.ts`
 * reads this every thirty seconds, and `routes.ts` behind `config.ts` costs 130ms against 35ms
 * for a bare start.
 */

const HEALTH_PATH = '/healthz';

const DEFAULT_PORT = 9000;
const DEFAULT_HOST = '0.0.0.0';

export { DEFAULT_HOST, DEFAULT_PORT, HEALTH_PATH };
