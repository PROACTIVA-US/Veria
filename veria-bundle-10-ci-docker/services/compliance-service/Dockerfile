FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* .npmrc* ./ || true
COPY services/compliance-service/package.json services/compliance-service/package.json
COPY packages ./packages
RUN pnpm i --frozen-lockfile || pnpm i
COPY services/compliance-service ./services/compliance-service
WORKDIR /app/services/compliance-service
RUN [ -f tsconfig.json ] && pnpm build || echo "no build step"
EXPOSE 3004
CMD ["pnpm","start"]
