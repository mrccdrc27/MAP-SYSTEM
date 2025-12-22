# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

ARG VITE_REACT_APP_API_URL
ARG VITE_MEDIA_URL
ARG VITE_OPENROUTER_API_KEY

ENV VITE_REACT_APP_API_URL=$VITE_REACT_APP_API_URL
ENV VITE_MEDIA_URL=$VITE_MEDIA_URL
ENV VITE_OPENROUTER_API_KEY=$VITE_OPENROUTER_API_KEY

# Debug: Print the environment variable (will be empty unless set as ARG)
RUN echo "🔧 Building with API URL: $VITE_REACT_APP_API_URL"
RUN echo "🔑 Building with OpenRouter Key: $VITE_OPENROUTER_API_KEY"

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create a simple nginx config for React SPA
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]