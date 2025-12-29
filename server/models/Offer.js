import mongoose from 'mongoose';

const OfferSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  descriptionEmbedding: [Number], // Embedding for natural language matching
  tags: [{type: String}]
});

export default mongoose.model('Offer', OfferSchema);
