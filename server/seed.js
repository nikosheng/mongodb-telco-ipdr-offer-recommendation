import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ipdr from './models/Ipdr.js';
import Offer from './models/Offer.js';
import User from './models/User.js';
import { updateUserProfile } from './services/autoTaggingService.js';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for Seeding');

    await Ipdr.deleteMany({});
    await Offer.deleteMany({});
    await User.deleteMany({});

    // 1. Create 5 different offers
    const offers = [
      {
        name: "Japan Travel eSIM",
        description: "Unlimited data for your trip to Tokyo, Osaka, and beyond.",
        descriptionEmbedding: Array.from({length: 5}, () => Math.random()),
        targetTags: { category: "Travel", intent: "Japan" }
      },
      {
        name: "US Roaming Pack",
        description: "Stay connected across the USA with high-speed 5G data.",
        descriptionEmbedding: Array.from({length: 5}, () => Math.random()),
        targetTags: { category: "Travel", intent: "USA" }
      },
      {
        name: "Greater China Data Pro",
        description: "Seamless connectivity in Mainland China, HK, and Macau.",
        descriptionEmbedding: Array.from({length: 5}, () => Math.random()),
        targetTags: { category: "Travel", intent: "Greater China" }
      },
      {
        name: "Global Gamer Bundle",
        description: "Low-latency priority for gaming and streaming anywhere.",
        descriptionEmbedding: Array.from({length: 5}, () => Math.random()),
        targetTags: { category: "Gaming", intent: "Performance" }
      },
      {
        name: "Business Executive Pack",
        description: "Premium security and unlimited conferencing data.",
        descriptionEmbedding: Array.from({length: 5}, () => Math.random()),
        targetTags: { category: "Business", intent: "Productivity" }
      }
    ];
    await Offer.insertMany(offers);
    console.log("5 Offers Created");

    // 2. Create 10 different users and 10 IPDR records per user
    const users = [];
    const ipdrRecords = [];

    for (let i = 0; i < 10; i++) {
      const msisdn = `8529000000${i}`;
      const name = `User ${i}`;
      
      users.push({
        msisdn,
        name,
        currentLocation: { 
          type: "Point", 
          coordinates: [114.1 + Math.random() * 0.1, 22.2 + Math.random() * 0.1] 
        }
      });

      // 10 IPDR records for this user
      for (let j = 0; j < 10; j++) {
        const serviceType = ["Streaming", "Gaming", "Browsing", "Business", "Travel"][Math.floor(Math.random() * 5)];
        
        let url = `https://example.com/activity-${j}`;
        let location = {
          country: "Hong Kong",
          city: "Hong Kong",
          district: ["Central", "Wan Chai", "Tsim Sha Tsui", "Mong Kok"][Math.floor(Math.random() * 4)],
          coordinates: { 
            type: "Point", 
            coordinates: [114.1 + Math.random() * 0.1, 22.2 + Math.random() * 0.1] 
          }
        };

        if (serviceType === 'Travel') {
          const isJapan = Math.random() > 0.5;
          const travelUrls = isJapan 
            ? ['klook.com/activity/japan', 'trip.com/hotels/japan', 'agoda.com/destinations/japan']
            : ['klook.com/activity/us', 'trip.com/hotels/us', 'agoda.com/destinations/us'];
          
          url = travelUrls[Math.floor(Math.random() * travelUrls.length)];
          location = {
            country: isJapan ? "Japan" : "USA",
            city: isJapan ? "Tokyo" : "New York",
            district: isJapan ? "Tokyo" : "New York",
            coordinates: {
              type: "Point",
              coordinates: isJapan 
                ? [139.6917 + (Math.random() - 0.5) * 0.1, 35.6895 + (Math.random() - 0.5) * 0.1]
                : [-74.0060 + (Math.random() - 0.5) * 0.1, 40.7128 + (Math.random() - 0.5) * 0.1]
            }
          };
        }

        ipdrRecords.push({
          msisdn,
          url,
          sourceIp: `192.168.1.${10 + i}`,
          destinationIp: `10.0.0.${100 + j}`,
          sourcePort: 10000 + Math.floor(Math.random() * 50000),
          destinationPort: 443,
          protocol: j % 2 === 0 ? "TCP" : "UDP",
          serviceType,
          duration: 300 + Math.floor(Math.random() * 3000),
          uploadVolume: 1000000 + Math.floor(Math.random() * 10000000),
          downloadVolume: 5000000 + Math.floor(Math.random() * 500000000),
          timestamp: new Date(Date.now() - (j * 3600000)), // Spread activities over 10 hours
          location
        });
      }
    }

    await User.insertMany(users);
    await Ipdr.insertMany(ipdrRecords);
    console.log("10 Users and 100 IPDR Records Created");

    // 3. Trigger User Profiling
    console.log("Updating User Profiles...");
    for (const user of users) {
      await updateUserProfile(user.msisdn, { forceUpdate: true });
    }

    console.log("Seeding Completed");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedData();
