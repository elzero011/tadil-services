# Standalone build for Tadil Admin Web Client (Bypassing Nx)
FROM node:22-alpine AS build

# Set working directory to the app folder inside the container
WORKDIR /app

# Copy the specific app's package file
COPY apps/tadil-admin-web-client/package.json ./

# Install dependencies
RUN npm install

# Copy the app's source code
COPY apps/tadil-admin-web-client/ .

# Inject environment variables
ARG VITE_TADIL_API_URL
ENV VITE_TADIL_API_URL=${VITE_TADIL_API_URL}

# Run the local build script
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production
COPY apps/tadil-admin-web-client/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
