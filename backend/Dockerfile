# syntax=docker/dockerfile:1

# ---------- Base: Node + OpenSSL (exigido pelos engines do Prisma no Alpine) ----------
FROM node:24-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# ---------- Build: dependências completas, Prisma Client, TypeScript ----------
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate \
 && npm run build \
 && npm run build:seed

# ---------- Runtime: só dependências de produção ----------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3333
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Prisma Client gerado no build (com o engine para Alpine)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-seed ./dist-seed
COPY prisma ./prisma

USER node
EXPOSE 3333

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3333/health || exit 1

# Aplica as migrations pendentes e sobe a API
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/server.js"]
