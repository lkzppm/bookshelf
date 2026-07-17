FROM node:22-alpine
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter "@bookshelf/api..."

COPY packages/core packages/core
COPY apps/api apps/api
RUN pnpm --filter @bookshelf/core build && pnpm --filter @bookshelf/api build

ENV DATA_DIR=/data
ENV PORT=9300
EXPOSE 9300
VOLUME /data
CMD ["node", "apps/api/dist/server.js"]
