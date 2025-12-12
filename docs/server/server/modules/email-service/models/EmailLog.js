import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  to: {
    type: String,
    required: true
  },
  from: String,
  subject: {
    type: String,
    required: true
  },
  template: String,
  provider: {
    type: String,
    enum: ['smtp', 'sendgrid', 'ses']
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'queued'],
    required: true
  },
  error: String,
  messageId: String,
  metadata: mongoose.Schema.Types.Mixed,
  sentAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient querying
emailLogSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

export default EmailLog;
