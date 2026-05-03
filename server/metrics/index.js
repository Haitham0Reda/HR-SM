const promClient = require('prom-client');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metric 1: HTTP request duration histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

// Custom metric 2: Active users per tenant gauge
const tenantActiveUsers = new promClient.Gauge({
  name: 'tenant_active_users',
  help: 'Number of active users per tenant',
  labelNames: ['tenant_id']
});

// Custom metric 3: License validation errors counter
const licenseValidationErrors = new promClient.Counter({
  name: 'license_validation_errors_total',
  help: 'Total number of license validation errors',
  labelNames: ['error_type']
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(tenantActiveUsers);
register.registerMetric(licenseValidationErrors);

module.exports = {
  register,
  httpRequestDuration,
  tenantActiveUsers,
  licenseValidationErrors
};
