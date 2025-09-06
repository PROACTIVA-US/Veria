FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* .npmrc* ./ || true
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages ./packages
RUN pnpm i --frozen-lockfile || pnpm i

FROM node:20-alpine AS run
WORKDIR /app
RUN corepack enable
COPY --from=deps /app /app
COPY apps/frontend ./apps/frontend
EXPOSE 3000
WORKDIR /app/apps/frontend
CMD ["pnpm","dev"]
