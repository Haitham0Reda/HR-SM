import mongoose from 'mongoose';

const securityEventsSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'failed_login',
      'successful_login',
      'password_change',
      'account_locked',
      'suspicious_activity',
      'unauthorized_access',
      'privilege_escalation',
      'data_breach_attempt',
      'malicious_request',
      'sql_injection_attempt',
      'xss_attempt',
      'csrf_attempt',
      'brute_force_attack',
      'session_hijack',
      'token_manipulation',
      'rate_limit_exceeded',
      'ip_blocked',
      'security_policy_violation'
    ]
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  description: {
    type: String,
    required: true
  },
  userId: {
    type: String
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  requestPath: {
    type: String
  },
  requestMethod: {
    type: String
  },
  requestHeaders: {
    type: mongoose.Schema.Types.Mixed
  },
  requestBody: {
    type: mongoose.Schema.Types.Mixed
  },
  responseStatus: {
    type: Number
  },
  sessionId: {
    type: String
  },
  correlationId: {
    type: String
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: String
  },
  resolutionNotes: {
    type: String
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  geolocation: {
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 31536000 // 1 year TTL
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'securityevents'
});

// Compound indexes for better query performance
securityEventsSchema.index({ tenantId: 1, timestamp: -1 });
securityEventsSchema.index({ eventType: 1, severity: 1 });
securityEventsSchema.index({ ipAddress: 1, timestamp: -1 });
securityEventsSchema.index({ resolved: 1, severity: 1 });
securityEventsSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
securityEventsSchema.index({ riskScore: -1, timestamp: -1 });

const SecurityEvents = mongoose.model('SecurityEvents', securityEventsSchema);

export default SecurityEvents;