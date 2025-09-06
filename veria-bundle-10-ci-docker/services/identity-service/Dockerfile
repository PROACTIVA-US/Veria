FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* .npmrc* ./ || true
COPY services/identity-service/package.json services/identity-service/package.json
COPY packages ./packages
RUN pnpm i --frozen-lockfile || pnpm i
COPY services/identity-service ./services/identity-service
WORKDIR /app/services/identity-service
RUN [ -f tsconfig.json ] && pnpm build || echo "no build step"
EXPOSE 3002
CMD ["pnpm","start"]
