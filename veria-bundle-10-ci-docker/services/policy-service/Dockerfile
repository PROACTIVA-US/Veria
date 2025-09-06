FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* .npmrc* ./ || true
COPY services/policy-service/package.json services/policy-service/package.json
COPY packages ./packages
RUN pnpm i --frozen-lockfile || pnpm i
COPY services/policy-service ./services/policy-service
WORKDIR /app/services/policy-service
RUN [ -f tsconfig.json ] && pnpm build || echo "no build step"
EXPOSE 3003
CMD ["pnpm","start"]
