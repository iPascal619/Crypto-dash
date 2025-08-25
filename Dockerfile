# Use Node.js 18 LTS for Google Cloud Run
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl git

# Copy package files first for better caching
COPY backend/package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy backend application code
COPY backend/ ./

# Copy frontend files to public directory
RUN mkdir -p public
COPY *.html ./public/
COPY *.css ./public/
COPY *.js ./public/
COPY *.json ./public/

# Create necessary directories
RUN mkdir -p logs uploads

# Set proper permissions
RUN addgroup -g 1001 -S nodejs
RUN adduser -S appuser -u 1001
RUN chown -R appuser:nodejs /app
USER appuser

# Expose port 8080 (required by Cloud Run)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/auth/status || exit 1

# Start the application
CMD ["node", "server.js"]
