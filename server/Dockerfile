# Build stage
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Install system dependencies needed for native builds (if any)
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package files and install all deps (including dev deps)
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
# Ensure prisma schema is present in build context and generate client
RUN npx prisma generate --schema ./prisma/schema.prisma
RUN npm run build

# Runtime stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy only package files and install production deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built artifacts and any needed static assets
COPY --from=build /app/dist ./dist
# Copy prisma directory for runtime (for migrations if needed)
COPY --from=build /app/prisma ./prisma
# Copy the generated Prisma client
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
