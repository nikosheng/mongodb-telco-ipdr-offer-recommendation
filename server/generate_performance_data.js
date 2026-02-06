import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Offer from './models/Offer.js';
import User from './models/User.js';
import OfferPushLog from './models/OfferPushLog.js';

dotenv.config();

const generatePerformanceData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected to:', process.env.MONGODB_URI);

    // 1. Get existing Offers
    let offers = await Offer.find({});
    if (offers.length === 0) {
      console.log('No offers found. Seeding some default offers first...');
      const defaultOffers = [
        {
          name: "Japan Unlimited 5G Data",
          description: "Stay connected throughout Japan with our premium unlimited 5G data eSIM.",
          tags: ['Travel', 'Japan', 'Unlimited Data', '5G'],
          descriptionEmbedding: Array.from({ length: 1536 }, () => Math.random())
        },
        {
          name: "USA High-Speed 20GB",
          description: "Experience seamless high-speed roaming across the United States. Includes 20GB of high-speed data.",
          tags: ['Travel', 'USA', 'Roaming', 'High-Speed'],
          descriptionEmbedding: Array.from({ length: 1536 }, () => Math.random())
        },
        {
          name: "Social Media Pro Pack",
          description: "Unlimited data for all your favorite social apps including Instagram, TikTok, and Xiaohongshu.",
          tags: ['Social App', 'Hong Kong', 'Unlimited Social'],
          descriptionEmbedding: Array.from({ length: 1536 }, () => Math.random())
        },
        {
          name: "Global Gaming Turbo",
          description: "Ultra-low latency data package optimized for mobile gaming. Priority network access.",
          tags: ['Gaming', 'Hong Kong', 'Low Latency'],
          descriptionEmbedding: Array.from({ length: 1536 }, () => Math.random())
        },
        {
          name: "Business Executive Suite",
          description: "Premium connectivity bundle for professionals. Includes dedicated high-bandwidth for Teams/Slack.",
          tags: ['Business', 'Hong Kong', 'Productivity'],
          descriptionEmbedding: Array.from({ length: 1536 }, () => Math.random())
        }
      ];
      offers = await Offer.insertMany(defaultOffers);
      console.log(`${offers.length} default offers seeded.`);
    }

    // 2. Get existing Users
    let users = await User.find({});
    if (users.length === 0) {
      console.log('No users found. Seeding some default users...');
      const defaultUsers = [];
      for (let i = 0; i < 10; i++) {
        defaultUsers.push({
          msisdn: `8529000000${i}`,
          name: `User ${i}`,
          currentLocation: { 
            type: "Point", 
            coordinates: [114.1 + Math.random() * 0.1, 22.2 + Math.random() * 0.1] 
          }
        });
      }
      users = await User.insertMany(defaultUsers);
      console.log(`${users.length} default users seeded.`);
    }

    console.log(`Found ${offers.length} offers and ${users.length} users. Generating logs for 7 days...`);

    // 3. Clear existing logs for a fresh start
    await OfferPushLog.deleteMany({});
    console.log('Cleared existing push logs.');

    const logs = [];
    
    // Performance profiles for different offers to make the dashboard interesting
    const offerProfiles = offers.map(offer => {
      // Assign a random but fixed performance profile to each offer
      const rand = Math.random();
      if (rand > 0.7) {
        return { offer, clickWeight: 0.6, purchaseWeight: 0.3 }; // High performer
      } else if (rand > 0.3) {
        return { offer, clickWeight: 0.3, purchaseWeight: 0.1 }; // Average performer
      } else {
        return { offer, clickWeight: 0.15, purchaseWeight: 0.05 }; // Low performer
      }
    });

    for (let d = 0; d < 7; d++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - d);
      targetDate.setHours(0, 0, 0, 0);
      
      console.log(`Generating logs for: ${targetDate.toDateString()}`);

      for (const user of users) {
        // Each user gets 2-5 random offers per day
        const numOffers = Math.floor(Math.random() * 4) + 2;
        
        // Shuffle profiles to pick random offers
        const shuffledProfiles = [...offerProfiles].sort(() => 0.5 - Math.random());
        const selectedProfiles = shuffledProfiles.slice(0, numOffers);

        for (const profile of selectedProfiles) {
          const rand = Math.random();
          let status = 'pushed';
          
          if (rand < profile.purchaseWeight) {
            status = 'purchased';
          } else if (rand < profile.clickWeight) {
            status = 'clicked';
          }

          // Randomize time during the day
          const logDate = new Date(targetDate);
          logDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

          logs.push({
            offerId: profile.offer._id,
            offerName: profile.offer.name,
            userId: user._id,
            msisdn: user.msisdn,
            pushedAt: logDate,
            status: status,
            actionTimestamp: status !== 'pushed' ? new Date(logDate.getTime() + Math.random() * 3600000) : undefined
          });
        }
      }
    }

    // Insert in batches to avoid memory issues if logs is very large
    const batchSize = 1000;
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);
      await OfferPushLog.insertMany(batch);
    }

    console.log(`Successfully inserted ${logs.length} mock push logs across 7 days.`);

  } catch (error) {
    console.error('Error generating performance data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
};

generatePerformanceData();
