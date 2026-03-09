
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { AzureOpenAI } from 'openai';
import User from './models/User.js';

dotenv.config();

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2023-05-15',
});

async function getEmbedding(text) {
  try {
    if (!process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY === 'your_api_key_here') {
      console.warn('Azure OpenAI API Key not set, using mock embedding');
      return Array.from({ length: 1536 }, () => Math.random());
    }
    const response = await client.embeddings.create({
      input: text,
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'text-embedding-3-small',
    });
    return response.data[0].embedding;
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
