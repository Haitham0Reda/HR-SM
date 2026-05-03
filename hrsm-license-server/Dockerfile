# HR-SM License Server - Standalone Microservice
# Node 18 Alpine for minimal image size

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S licenseserver && \
    adduser -S licenseserver -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY --chown=licenseserver:licenseserver . .

# Create necessary directories with proper permissions
RUN mkdir -p logs keys && \
    chown -R licenseserver:licenseserver /app

# Switch to non-root user
USER licenseserver

# Expose port 4000
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "src/server.js"]
