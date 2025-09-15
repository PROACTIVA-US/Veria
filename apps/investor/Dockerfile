# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types-investor/package.json ./packages/types-investor/
COPY apps/investor/package.json ./apps/investor/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types-investor ./packages/types-investor
COPY apps/investor ./apps/investor

# Build types package first
RUN pnpm --filter @veria/types-investor build

# Build the app
ARG FEATURE_INVESTOR_PORTAL=false
ENV FEATURE_INVESTOR_PORTAL=${FEATURE_INVESTOR_PORTAL}
RUN pnpm --filter @veria/investor build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/investor/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/investor/.next/static ./apps/investor/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/investor/public ./apps/investor/public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start the application
CMD ["node", "apps/investor/server.js"]