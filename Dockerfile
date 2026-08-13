# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json bun.lock* ./
RUN npm ci

# Copy source code and build
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8518
ENV HOST=0.0.0.0

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.output ./.output 2>/dev/null || true
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8518

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8518"]
