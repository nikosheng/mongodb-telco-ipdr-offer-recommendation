import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  msisdn: { type: String, required: true, unique: true },
  name: String,
  currentLocation: {
    type: { type: String, default: 'Point' },
    coordinates: [Number],
    country: String
  },
  // Top 10 longest duration IPDR history
  topIpdrHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ipdr'
  }],
  // Summary of activity and preference
  latestActivitySummary: String,
  latestActivitySummaryEmbedding: [Number],
  lastSummaryUpdate: Date,
  // Generated tags based on history
  tags: [{type: String}],
  // Customer Journey / Purchase History
  customerJourney: [{
    action: { type: String, enum: ['pushed', 'viewed', 'purchased'], required: true },
    offerId: { type: String },
    offerName: String,
    timestamp: { type: Date, default: Date.now },
    details: String
  }],
  // Roaming Plan Usage
  roaming_plan_usage: [{
    planName: String,
    totalUsageMB: Number // in MB
  }]
});

UserSchema.index({ currentLocation: "2dsphere" });

export default mongoose.models.User || mongoose.model('User', UserSchema);
