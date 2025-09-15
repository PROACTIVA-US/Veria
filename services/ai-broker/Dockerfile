FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy ai-broker package.json
COPY services/ai-broker/package.json ./services/ai-broker/

# Install ALL dependencies (needed for workspace)
RUN pnpm install --frozen-lockfile

# Copy ai-broker source
COPY services/ai-broker/ ./services/ai-broker/

# Build ai-broker
RUN pnpm --filter=ai-broker build

# Production stage
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/services/ai-broker/package.json ./services/ai-broker/

# Install production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/services/ai-broker/dist ./services/ai-broker/dist

# Set working directory to service
WORKDIR /app/services/ai-broker

ENV NODE_ENV=production
ENV PORT=4001

EXPOSE 4001

CMD ["node", "dist/index.js"]
