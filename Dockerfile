# HR-SM API Server - Production Build
# Node 18 Alpine for minimal image size

FROM node:18-alpine

# Install curl and wget for health checks
RUN apk add --no-cache curl wget

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S hrms && \
    adduser -S hrms -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY --chown=hrms:hrms . .

# Create necessary directories with proper permissions
RUN mkdir -p uploads logs backups && \
    chown -R hrms:hrms /app

# Switch to non-root user
USER hrms

# Expose port 5000
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the server
CMD ["node", "server.js"]
