# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
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
ENV NITRO_PORT=8518
ENV NITRO_HOST=0.0.0.0

COPY --from=builder /app/.output ./.output

EXPOSE 8518

CMD ["node", ".output/server/index.mjs"]
