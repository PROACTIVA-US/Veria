# Multi-stage build for production
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy everything first (we'll optimize with .dockerignore if needed)
COPY . .

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Build all services
RUN pnpm build

# Production image
FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-lock.yaml ./
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages
COPY --from=builder --chown=nodejs:nodejs /app/services ./services
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default to gateway service
ENV SERVICE=gateway
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start the specified service
CMD ["sh", "-c", "cd services/${SERVICE} && node dist/index.js"]