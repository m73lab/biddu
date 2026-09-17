# =============================================================================
# SubastaYa Dockerfile (Debian slim, glibc for libsql)
# =============================================================================

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl wget && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm install

# `prebuild` stops right after `prisma generate`: both `builder` (Next.js
# production build) and `migrator` (one-shot migrations) start from here,
# so the migrate image never pays for a Next.js build it will not use.
FROM node:20-bookworm-slim AS prebuild
WORKDIR /app
# Which Prisma schema to generate the client from. Default (self-hosted):
# SQLite. Cloud builds override with prisma/schema.cloud.prisma (PostgreSQL).
ARG PRISMA_SCHEMA=prisma/schema.prisma
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=$PRISMA_SCHEMA

FROM prebuild AS builder
WORKDIR /app
ARG DATABASE_URL_BUILD=
# NEXT_PUBLIC_* vars are inlined by Next at BUILD time (unreadable at
# runtime), so they must arrive as build args. Empty defaults keep plain
# `docker build` working; compose passes the real values from .env.
ARG NEXT_PUBLIC_APP_URL=
ARG NEXT_PUBLIC_REALTIME_DRIVER=
ARG NEXT_PUBLIC_SOKETI_APP_KEY=
ARG NEXT_PUBLIC_SOKETI_HOST=
ARG NEXT_PUBLIC_SOKETI_PORT=
ARG NEXT_PUBLIC_SOKETI_USE_TLS=
ARG NEXT_PUBLIC_PUSHER_KEY=
ARG NEXT_PUBLIC_PUSHER_CLUSTER=
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=
ARG NEXT_PUBLIC_CONTACT_EMAIL=
ENV NEXT_TELEMETRY_DISABLED=1
# NOTE: plain `next build`, NOT `npm run build`: the latter re-runs
# `prisma generate` with the default schema and would overwrite the
# client generated above (breaks cloud PostgreSQL builds).
# DATABASE_URL_BUILD (optional): DB reached during `next build` for page
# data collection. Defaults to the runtime DATABASE_URL logic; cloud builds
# point it at an empty throwaway Postgres so builds never touch prod data.
RUN if [ -n "$DATABASE_URL_BUILD" ]; then export DATABASE_URL="$DATABASE_URL_BUILD"; fi; \
  npx next build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends wget openssl && rm -rf /var/lib/apt/lists/* && groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
# Next standalone tracing omits ESM files of @swc/helpers that Next's
# require-hook loads dynamically at runtime: copy the full package.
COPY --from=builder /app/node_modules/@swc/helpers/ ./node_modules/@swc/helpers/
# .next must be writable by the runtime user: ISR revalidation rewrites
# the prerender cache in place (EACCES otherwise).
RUN mkdir -p ./data ./public/uploads ./logs && chown -R nextjs:nodejs ./.next ./data ./public/uploads ./logs
USER nextjs
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]

# =============================================================================
# Migrator (one-shot): applies pending Prisma migrations, then exits.
# compose starts this before the app (service_completed_successfully), so a
# fresh volume always gets a migrated database instead of an empty SQLite
# file that 500s on the first DB-backed request.
# Shares every cached layer with the prebuild above (only CMD differs):
# full node_modules (prisma CLI + engines), prisma/ (schema, migrations,
# prisma.config.ts) and the generated client are all already in place.
# Uses prisma.config.ts defaults (self-host SQLite schema); DATABASE_URL
# arrives from compose environment, pointing at the persisted volume file.
# =============================================================================
FROM prebuild AS migrator
WORKDIR /app
CMD ["npx", "prisma", "migrate", "deploy"]
