import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['send_offer'] // Can be expanded later
  },
  msisdn: {
    type: String,
    required: true
  },
  offerId: {
    type: String,
    required: true
  },
  offerName: {
    type: String
  },
  agent: {
    type: String,
    default: 'fulfillment_agent'
  },
  status: {
    type: String,
    default: 'success'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed // For any extra details
  }
}, { collection: 'audit-logs' }); // Explicit collection name as requested

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
