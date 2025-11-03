# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build the NestJS app
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy only package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Optional: copy other needed files (e.g., static assets)
# COPY --from=builder /app/public ./public

# Expose application port
EXPOSE 8888

# Run the application
CMD ["node", "dist/main.js"]
