# Stage 1: Build Stage (for dependencies and potentially transpilation)
# Uses Official Images, Pins Versions
FROM node:20.11.1-alpine3.19 AS builder

# Minimizing Attack Surface: Setting working directory
WORKDIR /app

# Install pnpm globally and pin its version for deterministic builds
# This is a key change to switch from npm to pnpm
RUN npm install -g pnpm@9.1.4 --loglevel verbose

# Pin dependencies explicitly
# Change from package-lock.json to pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies for smaller final image using pnpm
# Use --frozen-lockfile for deterministic builds, similar to npm ci
RUN pnpm install --frozen-lockfile --prod

# Copy application source code
COPY . .

# Run security scanning/linting (example, typically done in CI)
# RUN npm audit --production # Note: npm audit is for npm; pnpm has its own audit
# Consider using `pnpm audit` or integrating a separate scanner
# RUN pnpm audit --production
# Consider adding a linter here if not in CI:
# RUN npx eslint . --max-warnings=0

# Stage 2: Production Stage
# Uses a minimal base image to reduce attack surface
FROM node:20.11.1-alpine3.19

# Minimizing Attack Surface: Setting working directory
WORKDIR /app

# Copy production dependencies from builder stage
# pnpm creates a .pnpm-store in the root of the volume or host,
# but node_modules contains symlinks to it. Copying node_modules is generally
# sufficient for runtime, as the symlinks will point within the copied structure.
COPY --from=builder /app/node_modules ./node_modules
# Copy compiled application code (if transpiled) or raw JS
COPY --from=builder /app .

# Use Non-Root Users in Containers
# Create a dedicated, unprivileged user for the application
# --system creates a system user/group, typically with lower UIDs (UIDs < 1000)
# This reduces the blast radius if the container is compromised.
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
# Ensure the application directory is owned by the new user
RUN chown -R appuser:appgroup /app

# Switch to the non-root user for subsequent instructions and runtime
USER appuser

# Expose the application port
EXPOSE 3000

# Include HEALTHCHECK (also defined in docker-compose for orchestration)
HEALTHCHECK CMD curl --fail http://localhost:3000/health || exit 1

# Define the command to run the application
CMD ["node", "index.js"]
