# syntax=docker/dockerfile:1.7

# ---------- base: Node + pnpm (usado no build e em runtime para instalar os bots) ----------
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN npm install -g pnpm@11.5.0 && pnpm --version

# ---------- build: compila o painel Nuxt ----------
FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --dangerously-allow-all-builds
COPY . .
RUN pnpm build

# ---------- runtime ----------
FROM base AS runtime

# git: clonar o bot · chromium: whatsapp-web.js · ffmpeg: figurinhas animadas
# dumb-init: repassa sinais e recolhe processos zumbis do Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl git dumb-init \
      chromium ffmpeg \
      fonts-liberation fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_PORT=3000 \
    DEADBYTE_DATA_DIR=/data \
    DEADBYTE_REPOS_DIR=/data/repos \
    DEADBYTE_INSTANCES_DIR=/data/instances \
    DEADBYTE_SESSIONS_DIR=/data/sessions \
    DEADBYTE_LOGS_DIR=/data/logs \
    DEADBYTE_MIGRATIONS_DIR=/app/server/db/migrations \
    DEADBYTE_CHROME_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    FFPROBE_PATH=/usr/bin/ffprobe \
    npm_config_store_dir=/data/pnpm-store

WORKDIR /app
COPY --from=build /app/.output ./.output
COPY --from=build /app/server/db/migrations ./server/db/migrations

VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]
