import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  msisdn: { type: String, required: true, unique: true },
  name: String,
  currentLocation: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  // Top 10 longest duration IPDR history
  topIpdrHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ipdr'
  }],
  // Summary of activity and preference
  latestAcvititySummary: String,
  latestAcvititySummaryEmbedding: [Number],
  lastSummaryUpdate: Date,
  // Generated tags based on history
  tags: [{type: String}]
});

UserSchema.index({ currentLocation: "2dsphere" });

export default mongoose.model('User', UserSchema);
