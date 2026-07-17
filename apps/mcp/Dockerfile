FROM node:22-alpine
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/mcp/package.json apps/mcp/
RUN pnpm install --frozen-lockfile --filter "@bookshelf/mcp..."

COPY apps/mcp apps/mcp
RUN pnpm --filter @bookshelf/mcp build

ENV PORT=9400
EXPOSE 9400
CMD ["node", "apps/mcp/dist/server.js"]
