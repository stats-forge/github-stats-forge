# syntax=docker/dockerfile:1

# The build context is the repository root: the lockfile and every workspace manifest live above.
#
# There is no build step. Node strips the types and every relative import names the `.ts` that
# exists, so the image runs the sources; `--conditions=@stats/source` points the core import at
# `packages/core/src`.

# Pinned by digest, because `24-alpine` is a moving tag; Dependabot maintains it.
# `$BUILDPLATFORM`: the install and the site build produce the same bytes on every architecture,
# so they run natively once rather than under QEMU per target; only `runtime` is multi-arch.
FROM --platform=$BUILDPLATFORM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81 AS base

WORKDIR /repo
ENV PNPM_HOME=/pnpm
RUN corepack enable && pnpm config set store-dir /pnpm/store

# manifests first, so the dependency layer survives a source-only change
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# every `pnpm install` runs the root `prepare`, which installs git hooks into a `.git`
# this context does not have — and `LEFTHOOK=0` silences the hook runner, not `lefthook install`
RUN pnpm pkg delete scripts.prepare

COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/
COPY apps/docs/package.json apps/docs/
COPY apps/server/package.json apps/server/

FROM base AS deps

# `--prod` and the filter are why the image carries zod and nothing else; the store mount is
# what keeps a lockfile change from downloading everything again
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --prod --frozen-lockfile --filter "@stats-forge/github-stats-server..."

COPY packages/core/src packages/core/src
COPY apps/server/src apps/server/src

# The documentation site, built here so it describes the code in the image rather than what is
# on Pages. Its tooling exists only in this stage: the output is static pages and their assets.
FROM base AS site

# filtered to the site and what it builds from; an unfiltered install pulls the whole workspace's tooling
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --filter "@stats-forge/github-stats-docs..."
COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY packages/cli packages/cli
COPY apps/docs apps/docs

# Pages serves the site under the repository name, the image at the root. `SITE_SERVER` tells
# the anvil there is a server under it; nothing probes for one, since on Pages there is none.
ENV SITE_BASE=/
ENV SITE_SERVER=true
RUN pnpm run docs:build

FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81 AS runtime

LABEL org.opencontainers.image.title="github-stats-forge server"
LABEL org.opencontainers.image.description="Serves the GitHub stats cards as SVG"
LABEL org.opencontainers.image.source="https://github.com/stats-forge/github-stats-forge"
LABEL org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production
ENV PORT=9000
ENV HOST=0.0.0.0
ENV SITE_DIR=/app/site

COPY --from=deps /repo /app
COPY --from=site /repo/apps/docs/build /app/site
WORKDIR /app/apps/server

USER node
EXPOSE 9000

# node itself, because this stage carries no curl and no wget
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "src/healthcheck.ts"]

CMD ["node", "--conditions=@stats/source", "src/index.ts"]
