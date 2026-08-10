# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy all source code first (needed for quasar prepare in postinstall)
COPY . .

# Install dependencies
RUN npm install

# Build the project
RUN npx quasar build -m spa

# Production stage
FROM node:22-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist/spa ./dist

RUN touch .env.local

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["serve", "-s", "dist", "-l", "3000"]