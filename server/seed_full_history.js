import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { AzureOpenAI } from 'openai';
import Ipdr from './models/Ipdr.js';
import Offer from './models/Offer.js';
import User from './models/User.js';
import { updateUserProfile } from './services/autoTaggingService.js';

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
    return Array.from({ length: 1536 }, () => Math.random());
  }
}

const seedFullHistory = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for Seeding Full History');

    // Clear existing data
    // await Ipdr.deleteMany({});
    // await Offer.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing data');

    // 1. Create Offers with expanded descriptions and Azure Embeddings
    // const offerData = [
    //   {
    //     name: "Japan Unlimited Data Pass",
    //     description: "Stay connected throughout Japan with our premium unlimited 5G data eSIM. Perfect for navigating Tokyo's subways, sharing photos from Kyoto's temples, or streaming in Osaka. This pass offers high-speed connectivity across all major Japanese cities and rural areas without any throttling.",
    //     tags: ['Travel', 'Japan', 'Unlimited Data', '5G']
    //   },
    //   {
    //     name: "USA High-Speed Roaming",
    //     description: "Experience seamless high-speed roaming across the United States. Whether you are on a business trip in New York, exploring the Grand Canyon, or visiting Silicon Valley, this pack provides reliable 4G/5G coverage. Includes 20GB of high-speed data with free incoming calls.",
    //     tags: ['Travel', 'USA', 'Roaming', 'High-Speed']
    //   },
    //   {
    //     name: "Social Media Pro Pack",
    //     description: "Unlimited data for all your favorite social apps including Instagram, TikTok, and Xiaohongshu. Specifically designed for content creators and social media enthusiasts in Hong Kong. Upload high-quality reels and stream live without worrying about data consumption.",
    //     tags: ['Social App', 'Hong Kong', 'Unlimited Social', 'Content Creator']
    //   },
    //   {
    //     name: "Global Gaming Turbo",
    //     description: "Ultra-low latency data package optimized for mobile gaming. Provides priority network access for Sony PlayStation Network, Xbox Live, and Tencent Gaming titles. Ideal for competitive gamers in Hong Kong who need a stable and fast connection for lag-free gameplay.",
    //     tags: ['Gaming', 'Hong Kong', 'Low Latency', 'Priority']
    //   },
    //   {
    //     name: "Executive Business Suite",
    //     description: "Premium connectivity bundle for professionals. Includes dedicated high-bandwidth data for LinkedIn, Slack, and Microsoft Teams. Ensure crystal-clear video conferencing and instant messaging responsiveness for your business needs in Hong Kong's fast-paced environment.",
    //     tags: ['Business', 'Hong Kong', 'Productivity', 'Professional']
    //   }
    // ];

    // const offers = [];
    // for (const data of offerData) {
    //   console.log(`Generating embedding for offer: ${data.name}`);
    //   const embedding = await getEmbedding(data.description);
    //   offers.push({
    //     ...data,
    //     descriptionEmbedding: embedding
    //   });
    // }

    // await Offer.insertMany(offers);
    // console.log(`${offers.length} Offers Created with Embeddings`);

    // 2. Create Users and IPDR History
    const users = [];
    const ipdrRecords = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 3);

    const serviceTypes = ['Social App', 'Gaming', 'Business', 'Travel'];
    const districts = ["Central", "Wan Chai", "Tsim Sha Tsui", "Mong Kok"];

    const userPreferences = {
      '85290000000': 'Business',
      '85290000001': 'Travel',
      '85290000002': 'Social App',
      '85290000003': 'Gaming',
      '85290000004': 'Business',
      '85290000005': 'Business',
      '85290000006': 'Travel',
      '85290000007': 'Travel',
      '85290000008': 'Social App',
      '85290000009': 'Gaming'
    };

    const urls = {
      'Social App': ['instagram.com/p/reel1', 'tiktok.com/@user/video1', 'xiaohongshu.com/explore/item1'],
      'Gaming': ['playstation.com/network', 'xbox.com/live', 'gaming.tencent.com/play'],
      'Business': ['linkedin.com/feed', 'slack.com/workspace', 'teams.microsoft.com/l/meetup'],
      'Travel-Japan': ['klook.com/activity/japan', 'trip.com/hotels/japan', 'agoda.com/destinations/japan'],
      'Travel-USA': ['klook.com/activity/us', 'trip.com/hotels/us', 'agoda.com/destinations/us']
    };

    const locations = {
      'Hong Kong': { country: "Hong Kong", city: "Hong Kong", coords: [114.1, 22.2] },
      'Japan': { country: "Japan", city: "Tokyo", coords: [139.6917, 35.6895] },
      'USA': { country: "USA", city: "New York", coords: [-74.0060, 40.7128] }
    };

    for (let i = 0; i < 10; i++) {
      const msisdn = `8529000000${i}`;
      const name = `User ${i}`;
      const preference = userPreferences[msisdn];
      
      users.push({
        msisdn,
        name,
        currentLocation: { 
          type: "Point", 
          coordinates: [114.1 + Math.random() * 0.1, 22.2 + Math.random() * 0.1] 
        }
      });

      // Generate 72 hours of data (3 days)
      for (let day = 0; day < 3; day++) {
        // For each day, if travel is picked, pick one location for the whole day
        const dailyTravelDest = Math.random() > 0.5 ? 'Japan' : 'USA';

        for (let hour = 0; hour < 24; hour++) {
          const eventDate = new Date(startDate);
          eventDate.setDate(eventDate.getDate() + day);
          eventDate.setHours(hour, 0, 0, 0);

          // 80% chance to use the preferred service type, 20% for random
          let serviceType;
          if (Math.random() < 0.8) {
            serviceType = preference;
          } else {
            serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
          }

          let urlKey = serviceType;
          let locInfo;
          if (serviceType === 'Travel') {
            urlKey = `Travel-${dailyTravelDest}`;
            locInfo = locations[dailyTravelDest];
          } else {
            locInfo = locations['Hong Kong'];
          }

          const serviceUrls = urls[urlKey];
          const url = serviceUrls[Math.floor(Math.random() * serviceUrls.length)];

          ipdrRecords.push({
            msisdn,
            url,
            sourceIp: `192.168.1.${10 + i}`,
            destinationIp: `10.0.0.${100 + hour}`,
            sourcePort: 10000 + Math.floor(Math.random() * 50000),
            destinationPort: 443,
            protocol: hour % 2 === 0 ? "TCP" : "UDP",
            serviceType,
            duration: 300 + Math.floor(Math.random() * 3000),
            uploadVolume: 1000000 + Math.floor(Math.random() * 10000000),
            downloadVolume: 5000000 + Math.floor(Math.random() * 500000000),
            timestamp: eventDate,
            location: {
              country: locInfo.country,
              city: locInfo.city,
              district: locInfo.country === 'Hong Kong' ? districts[Math.floor(Math.random() * districts.length)] : locInfo.city,
              coordinates: { 
                type: "Point", 
                coordinates: [locInfo.coords[0] + (Math.random() - 0.5) * 0.1, locInfo.coords[1] + (Math.random() - 0.5) * 0.1] 
              }
            }
          });
        }
      }
    }

    await User.insertMany(users);
    console.log(`Created ${users.length} Users`);
    
    await Ipdr.insertMany(ipdrRecords);
    console.log(`Created ${ipdrRecords.length} IPDR Records (72 per user)`);

    // 3. Trigger User Profiling
    console.log("Updating User Profiles...");
    for (const user of users) {
      await updateUserProfile(user.msisdn, { forceUpdate: true });
    }

    console.log("Seeding Full History Completed");
    process.exit();
  } catch (error) {
    console.error("Seeding Failed:", error);
    process.exit(1);
  }
};

seedFullHistory();
