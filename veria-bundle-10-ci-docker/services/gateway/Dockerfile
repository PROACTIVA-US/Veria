FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* .npmrc* ./ || true
COPY services/gateway/package.json services/gateway/package.json
COPY packages ./packages
RUN pnpm i --frozen-lockfile || pnpm i
COPY services/gateway ./services/gateway
WORKDIR /app/services/gateway
RUN [ -f tsconfig.json ] && pnpm build || echo "no build step"
EXPOSE 3001
CMD ["pnpm","start"]
