# Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the app
COPY . .

# Build the app
RUN npm run build

# Expose port (change if needed)
EXPOSE 8888

# Start the app
CMD ["node", "dist/main.js"]
