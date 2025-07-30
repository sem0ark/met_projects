# Stage 1: Build Stage
# Uses Official Images, Pins Versions
FROM node:20.11.1-alpine3.19 AS builder

WORKDIR /app

# Install pnpm globally and pin its version for deterministic builds
# This is a key change to switch from npm to pnpm
RUN npm install -g pnpm@9.1.4 --loglevel verbose

# Pin dependencies explicitly
# Change from package-lock.json to pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install development dependencies for build using pnpm
# Use --frozen-lockfile for deterministic builds
RUN pnpm install --frozen-lockfile

# Copy application source code
COPY . .

# Build the React application for production using pnpm
RUN pnpm run build

CMD ["pnpm", "dev"]
