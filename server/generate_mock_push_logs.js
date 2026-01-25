import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Offer from './models/Offer.js';
import User from './models/User.js';
import OfferPushLog from './models/OfferPushLog.js';

dotenv.config();

const generateMockData = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/telco-ipdr';
    await mongoose.connect(uri);
    console.log('MongoDB Connected to:', uri);

    // 1. Get existing Offers
    let offers = await Offer.find({});
    if (offers.length === 0) {
      console.log('No offers found. Please seed offers first.');
      return;
    }

    // 2. Get existing Users
    const users = await User.find({});
    if (users.length === 0) {
      console.log('No users found. Please seed users first.');
      return;
    }

    console.log(`Found ${offers.length} offers and ${users.length} users. Generating logs for 3 days...`);

    // 3. Generate logs for 3 days (Today, Yesterday, Day Before)
    const logs = [];
    const statuses = ['pushed', 'clicked', 'purchased'];
    
    // Clear all existing logs first for a fresh start
    await OfferPushLog.deleteMany({});
    console.log('Cleared existing push logs.');

    for (let d = 0; d < 3; d++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - d);
      
      console.log(`Generating logs for: ${targetDate.toDateString()}`);

      for (const user of users) {
        // Each user gets 1-3 random offers per day
        const numOffers = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numOffers; i++) {
          const randomOffer = offers[Math.floor(Math.random() * offers.length)];
          
          const rand = Math.random();
          let status = 'pushed';
          if (rand < 0.15) status = 'purchased';
          else if (rand < 0.45) status = 'clicked';

          // Randomize time during the day
          const logDate = new Date(targetDate);
          logDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

          logs.push({
            offerId: randomOffer._id,
            offerName: randomOffer.name,
            userId: user._id,
            msisdn: user.msisdn,
            pushedAt: logDate,
            status: status,
            actionTimestamp: status !== 'pushed' ? new Date(logDate.getTime() + Math.random() * 3600000) : undefined
          });
        }
      }
    }

    await OfferPushLog.insertMany(logs);
    console.log(`Successfully inserted ${logs.length} mock push logs across 3 days.`);

  } catch (error) {
    console.error('Error generating mock data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
};

generateMockData();
