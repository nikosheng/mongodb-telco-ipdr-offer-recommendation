import mongoose from 'mongoose';

const IpdrSchema = new mongoose.Schema({
  msisdn: { type: String, required: true }, // Mobile number or user ID
  timestamp: { type: Date, default: Date.now },
  sourceIp: String,
  destinationIp: String,
  sourcePort: Number,
  destinationPort: Number,
  protocol: String, // TCP, UDP, etc.
  serviceType: String, // VoIP, Web Browsing, Streaming, etc.
  url: String,
  duration: Number, // Duration in seconds
  uploadVolume: Number, // Bytes
  downloadVolume: Number, // Bytes
  // Processed fields
  location: {
    country: String,
    city: String,
    district: String,
    coordinates: {
      type: { type: String, default: 'Point' },
      coordinates: [Number] // [longitude, latitude]
    }
  }
});

IpdrSchema.index({ "location.coordinates": "2dsphere" });
IpdrSchema.index({ msisdn: 1, duration: -1 }); // Index for querying top duration by user

export default mongoose.model('Ipdr', IpdrSchema);
