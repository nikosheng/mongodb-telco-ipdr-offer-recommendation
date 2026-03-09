
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Offer from '../models/Offer.js';

dotenv.config({ path: '../.env' }); // Adjust path assuming script is run from server/scripts/ or similar

// If running from server root with `node scripts/generate_roaming_mock_data.js`, path might need adjustment.
// Let's assume running from `server/` root, so path should be just `.env` or check where we are.
// Actually, standard is to run from project root or server root.
// If I run `cd server && node scripts/generate_roaming_mock_data.js`, then cwd is `server`.
// So `.env` is in `server/.env`.
// But `dotenv.config()` looks in cwd by default.
// Let's try to be robust.

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assume .env is in server root (parent of scripts)
dotenv.config({ path: path.join(__dirname, '../.env') });

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function generateMockData() {
  try {
    console.log('Connecting to MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Fetch existing roaming offers from DB
    const roamingOffers = await Offer.find({ tags: 'Roaming' });
    
    // Fallback: If no offers are tagged as 'Roaming', use any offer that looks like a pass/roaming plan
    let offersToUse = roamingOffers;
    if (offersToUse.length === 0) {
        console.warn("No offers with 'Roaming' tag found. Searching by name...");
        offersToUse = await Offer.find({ 
            $or: [
                { name: { $regex: /roaming/i } },
                { name: { $regex: /pass/i } },
                { name: { $regex: /travel/i } }
            ]
        });
    }

    if (offersToUse.length === 0) {
        console.error("No suitable roaming offers found in DB. Please populate offers first.");
        return;
    }
    
    console.log(`Found ${offersToUse.length} existing offers to use for mock data.`);

    const users = await User.find({});
    console.log(`Found ${users.length} users.`);

    let updatedCount = 0;

    for (const user of users) {
      // 100% chance to have a roaming plan
      if (true) {
        const numPlans = Math.random() < 0.2 ? 2 : 1; // 20% chance of 2 plans
        const userPlans = [];

        for (let i = 0; i < numPlans; i++) {
          const plan = offersToUse[getRandomInt(0, offersToUse.length - 1)];
          // Avoid duplicate plans
          if (!userPlans.find(p => p.planName === plan.name)) {
            const limitMB = (plan.limitGB || 1) * 1024;
            // Updated logic: Ensure usage is > 50% for testing purposes as requested
            // Random usage between 51% and 95% of the limit
            const minUsage = Math.floor(limitMB * 0.51);
            const maxUsage = Math.floor(limitMB * 0.95);
            const usage = getRandomInt(minUsage, maxUsage); 
            
            userPlans.push({
              planName: plan.name,
              totalUsageMB: usage
            });
          }
        }

        user.roaming_plan_usage = userPlans;
        await user.save();
        updatedCount++;
        // console.log(`Updated user ${user.msisdn} with ${userPlans.length} roaming plans.`);
      } else {
        // Clear existing if any (optional, but good for reset)
        user.roaming_plan_usage = [];
        await user.save();
      }
    }

    console.log(`Successfully updated ${updatedCount} users with roaming plan usage data.`);

  } catch (error) {
    console.error('Error generating mock data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

generateMockData();
