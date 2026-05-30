FROM node:26-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY tsconfig.base.json ./
COPY server/ server/
COPY client/ client/
RUN npm run build -w client
RUN npm run build -w server

FROM node:26-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci -w server --omit=dev

COPY --from=builder /app/server/dist server/dist
COPY --from=builder /app/server/src/db/migrations server/dist/db/migrations
COPY --from=builder /app/client/dist client/dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3040
ENV DATA_DIR=/app/data

EXPOSE 3040

HEALTHCHECK --interval=5m --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:3040/api/health || exit 1

CMD ["node", "server/dist/index.js"]
