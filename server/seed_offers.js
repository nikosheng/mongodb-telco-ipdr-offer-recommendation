import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { VoyageAIClient } from 'voyageai';
import Offer from './models/Offer.js';

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
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return Array.from({ length: 1024 }, () => Math.random());
  }
}

const offerData = [
  {
    name: "Japan Unlimited Data Pass",
    description: "Stay connected throughout Japan with our premium unlimited 5G data eSIM. Perfect for navigating Tokyo's subways, sharing photos from Kyoto's temples, or streaming in Osaka. This pass offers high-speed connectivity across all major Japanese cities and rural areas without any throttling.",
    tags: ['Travel', 'Japan', 'Unlimited Data', '5G'],
    limitGB: null
  },
  {
    name: "USA High-Speed Roaming 5GB",
    description: "Experience seamless high-speed roaming across the United States. Whether you are on a business trip in New York, exploring the Grand Canyon, or visiting Silicon Valley, this pack provides reliable 4G/5G coverage. Includes 5GB of high-speed data with free incoming calls.",
    tags: ['Travel', 'USA', 'Roaming', 'High-Speed'],
    limitGB: 5
  },
  {
    name: "Social Media Pro Pack",
    description: "Unlimited data for all your favorite social apps including Instagram, TikTok, and Xiaohongshu. Specifically designed for content creators and social media enthusiasts in Hong Kong. Upload high-quality reels and stream live without worrying about data consumption.",
    tags: ['Social App', 'Hong Kong', 'Unlimited Social', 'Content Creator'],
    limitGB: null
  },
  {
    name: "Global Gaming Turbo 10GB",
    description: "Ultra-low latency data package optimized for mobile gaming. Provides priority network access for Sony PlayStation Network, Xbox Live, and Tencent Gaming titles. Ideal for competitive gamers in Hong Kong who need a stable and fast connection for lag-free gameplay.",
    tags: ['Gaming', 'Hong Kong', 'Low Latency', 'Priority'],
    limitGB: 10
  },
  {
    name: "Executive Business Suite",
    description: "Premium connectivity bundle for professionals. Includes dedicated high-bandwidth data for LinkedIn, Slack, and Microsoft Teams. Ensure crystal-clear video conferencing and instant messaging responsiveness for your business needs in Hong Kong's fast-paced environment.",
    tags: ['Business', 'Hong Kong', 'Productivity', 'Professional'],
    limitGB: null
  }
];

const seedOffers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing offers
    await Offer.deleteMany({});
    console.log('Cleared existing offers');

    const offers = [];
    for (const data of offerData) {
      console.log(`Generating voyage-4 embedding for offer: ${data.name}`);
      const embedding = await getEmbedding(data.description);
      offers.push({
        ...data,
        descriptionEmbedding: embedding
      });
    }

    await Offer.insertMany(offers);
    console.log(`\nSuccessfully seeded ${offers.length} offers with voyage-4 embeddings (1024-dim):`);
    offers.forEach(o => console.log(`  - ${o.name}`));

    process.exit(0);
  } catch (error) {
    console.error('Offer seeding failed:', error);
    process.exit(1);
  }
};

seedOffers();
