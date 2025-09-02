# Use Node.js Alpine
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Build the app
RUN npm run build

# Expose ports (adjust if needed)
EXPOSE 1000

# Serve the app using a static file server
CMD ["npx", "serve", "-s", "dist", "-l", "1000"]
