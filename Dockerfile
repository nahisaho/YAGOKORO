# YAGOKORO Dockerfile
#
# Multi-stage build for the YAGOKORO GraphRAG MCP System.

# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/domain/package.json ./libs/domain/
COPY libs/graphrag/package.json ./libs/graphrag/
COPY libs/neo4j/package.json ./libs/neo4j/
COPY libs/vector/package.json ./libs/vector/
COPY libs/mcp/package.json ./libs/mcp/
COPY libs/cli/package.json ./libs/cli/
COPY apps/yagokoro/package.json ./apps/yagokoro/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY tsconfig.json biome.json ./
COPY libs/ ./libs/
COPY apps/ ./apps/

# Build
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S yagokoro && \
    adduser -S yagokoro -u 1001 -G yagokoro

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/domain/package.json ./libs/domain/
COPY libs/graphrag/package.json ./libs/graphrag/
COPY libs/neo4j/package.json ./libs/neo4j/
COPY libs/vector/package.json ./libs/vector/
COPY libs/mcp/package.json ./libs/mcp/
COPY libs/cli/package.json ./libs/cli/
COPY apps/yagokoro/package.json ./apps/yagokoro/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/libs/domain/dist ./libs/domain/dist
COPY --from=builder /app/libs/graphrag/dist ./libs/graphrag/dist
COPY --from=builder /app/libs/neo4j/dist ./libs/neo4j/dist
COPY --from=builder /app/libs/vector/dist ./libs/vector/dist
COPY --from=builder /app/libs/mcp/dist ./libs/mcp/dist
COPY --from=builder /app/libs/cli/dist ./libs/cli/dist
COPY --from=builder /app/apps/yagokoro/dist ./apps/yagokoro/dist

# Set ownership
RUN chown -R yagokoro:yagokoro /app

USER yagokoro

# Environment
ENV NODE_ENV=production

# Expose MCP server port
EXPOSE 3000

# Default command: run MCP server
CMD ["node", "apps/yagokoro/dist/mcp-server.js"]
