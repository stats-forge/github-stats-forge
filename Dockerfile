# syntax=docker/dockerfile:1

# The deployable image: the express server, core and the built docs/wizard.
# CI builds it and publishes it to GHCR; `Dockerfile.vercel` is how it reaches
# Vercel. It is a plain OCI image, so it runs on any other container host too.

# Keep in step with the `engines.node` of apps/backend.
ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS builder
# HUSKY=0: the root `prepare` script installs git hooks, and the image has no repo.
ENV CI=1 HUSKY=0
RUN corepack enable
WORKDIR /repo

# Manifests first: the install layer is then cached until a dependency changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
# Scripts run here: `onlyBuiltDependencies` (esbuild, @swc/core) build what the
# frontend build needs.
RUN pnpm install --frozen-lockfile

COPY . .
# The backend runs its sources; only core and the frontend are built.
RUN pnpm build:packages && pnpm build:frontend

FROM node:${NODE_VERSION} AS runtime
ENV CI=1 HUSKY=0 NODE_ENV=production
RUN corepack enable
WORKDIR /repo

# A second install rather than a copy of the builder's `node_modules`: this one
# resolves production dependencies only, without astro, vitest and playwright.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
# `--ignore-scripts` is safe here: every `onlyBuiltDependencies` entry is a dev
# dependency, and none of them is installed.
RUN pnpm install --frozen-lockfile --ignore-scripts --prod \
  --filter "@stats-forge/github-stats-forge-backend..."

COPY apps/backend apps/backend
COPY --from=builder /repo/packages/core/build packages/core/build
COPY --from=builder /repo/apps/frontend/build apps/frontend/build

# `PORT` is what Vercel routes to; 80 is its default for a container image.
ENV PORT=80
# Serving the built site from the same origin is what makes this one deployment.
ENV FRONTEND_DIR=/repo/apps/frontend/build
EXPOSE 80

# Directly, not through pnpm: the server has to receive Vercel's SIGTERM itself.
CMD ["node", "apps/backend/express.js"]
