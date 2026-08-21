
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { VoyageAIClient } from 'voyageai';
import User from './models/User.js';

dotenv.config();

// Voyage AI client — voyage-4 embeddings (1024-dim) via MongoDB AI endpoint
const voyageClient = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY,
  baseUrl: process.env.VOYAGE_API_BASE_URL || 'https://ai.mongodb.com/v1',
});

async function getEmbedding(text) {
  try {
    if (!process.env.VOYAGE_API_KEY || process.env.VOYAGE_API_KEY === 'your-voyage-api-key') {
      console.warn('Voyage AI API Key not set, using mock embedding');
      return Array.from({ length: 1024 }, () => Math.random());
    }
    const response = await voyageClient.embed({
      input: text,
      model: 'voyage-4',
    });
    return response.embeddings[0];
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

const reEmbedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for Re-embedding');

    const users = await User.find({ latestActivitySummary: { $exists: true, $ne: "" } });
    console.log(`Found ${users.length} users to re-embed.`);

    for (const user of users) {
      console.log(`Processing user: ${user.msisdn} (${user.name})`);
      const embedding = await getEmbedding(user.latestActivitySummary);
      
      if (embedding) {
        await User.updateOne(
          { _id: user._id },
          { $set: { latestActivitySummaryEmbedding: embedding } }
        );
        console.log(`Updated embedding for ${user.msisdn}`);
      } else {
        console.warn(`Skipped ${user.msisdn} due to embedding error.`);
      }
    }

    console.log('Re-embedding complete.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Re-embedding script failed:', error);
    process.exit(1);
  }
};

reEmbedUsers();
