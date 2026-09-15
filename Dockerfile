# =============================================================================
# SubastaYa Dockerfile (Debian slim, glibc for libsql)
# =============================================================================

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl wget && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm install

FROM node:20-bookworm-slim AS builder
WORKDIR /app
# Which Prisma schema to generate the client from. Default (self-hosted):
# SQLite. Cloud builds override with prisma/schema.cloud.prisma (PostgreSQL).
ARG PRISMA_SCHEMA=prisma/schema.prisma
ARG DATABASE_URL_BUILD=
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=$PRISMA_SCHEMA
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
RUN mkdir -p ./data ./public/uploads ./logs && chown -R nextjs:nodejs ./data ./public/uploads ./logs
USER nextjs
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
