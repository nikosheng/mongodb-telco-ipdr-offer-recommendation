import mongoose from 'mongoose';

const OfferPushLogSchema = new mongoose.Schema({
  offerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Offer', 
    required: true 
  },
  offerName: { type: String }, // Store name for easier aggregation if offer deleted
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  msisdn: { type: String }, // Backup if User model isn't always used or for quick lookup
  pushedAt: { 
    type: Date, 
    default: Date.now,
    required: true
  },
  status: {
    type: String,
    enum: ['pushed', 'clicked', 'purchased'],
    default: 'pushed'
  },
  actionTimestamp: {
    type: Date
  }
}, { timestamps: true });

// Index for efficient querying of today's logs
OfferPushLogSchema.index({ pushedAt: 1 });

export default mongoose.model('OfferPushLog', OfferPushLogSchema);
