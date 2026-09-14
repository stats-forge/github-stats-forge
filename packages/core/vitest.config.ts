import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    // jsdom costs more than the tests it hosts; vmThreads builds it once per worker, isolation intact
    pool: 'vmThreads',
    environment: 'jsdom',
    include: ['./tests/*.test.{ts,js}'],
    setupFiles: ['./tests/_setup.ts'],
  },
});
