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

# Stage 2: Production Stage (using Nginx to serve static files)
# Uses a minimal, official Nginx image
# Pin Docker Image Versions
FROM nginx:1.29-alpine

# Copy the built React app from the builder stage to Nginx's web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a custom Nginx configuration to disable directory listing and
# ensure proper routing for SPAs (e.g., fallback to index.html for React Router)
# Ensure this file (nginx.conf) is created in the 'frontend' directory
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Use Non-Root Users in Containers
# Nginx typically runs as a non-root user (e.g., 'nginx' user in alpine images)
# We can explicitly switch to that user if desired, or let the image default.
# For Nginx alpine, the default user is often 'nginx' with proper permissions.
# USER nginx # Uncomment if you want to explicitly set the user

# Expose the standard HTTP port
EXPOSE 80

# Include HEALTHCHECK for the Nginx server
HEALTHCHECK CMD wget --quiet --tries=1 --timeout=5 http://localhost/ || exit 1

# Command to run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
