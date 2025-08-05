FROM node:20-alpine3.20 As build

WORKDIR /usr/src/app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Copy the project files into the working directory
COPY ./ ./

# Build the Vite application (Vite typically uses 'build' script)
RUN pnpm run build

FROM nginx:stable-alpine as serve

COPY --from=build /usr/src/app/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build output from the dist folder into the Nginx html directory
# Vite by default outputs to a 'dist' folder in the project root
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Expose port 80 to allow access to the app
EXPOSE 80

# Run Nginx in the foreground
ENTRYPOINT ["nginx", "-g", "daemon off;"]