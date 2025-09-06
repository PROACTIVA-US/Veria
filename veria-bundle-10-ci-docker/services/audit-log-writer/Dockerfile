FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* .npmrc* ./ || true
COPY services/audit-log-writer/package.json services/audit-log-writer/package.json
COPY packages ./packages
RUN pnpm i --frozen-lockfile || pnpm i
COPY services/audit-log-writer ./services/audit-log-writer
WORKDIR /app/services/audit-log-writer
RUN [ -f tsconfig.json ] && pnpm build || echo "no build step"
EXPOSE 3005
CMD ["pnpm","start"]
