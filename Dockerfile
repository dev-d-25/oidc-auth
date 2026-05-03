FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate RSA keys for JWT signing
RUN node scripts/gen-keys.js

# Build TypeScript
RUN pnpm build

EXPOSE 8000

CMD ["node", "build/server.js"]
