import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import { updateUserProfile } from './services/autoTaggingService.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const userNames = ['User 2', 'User 3'];
    
    for (const name of userNames) {
      const user = await User.findOne({ name });
      if (!user) {
        console.log(`${name} not found`);
        continue;
      }

      console.log(`\n--- Processing ${name} (${user.msisdn}) ---`);
      await updateUserProfile(user.msisdn, { forceUpdate: true });

      const updatedUser = await User.findOne({ msisdn: user.msisdn });
      console.log(`${name} Tags:`, updatedUser.tags);
      console.log(`${name} Summary:`, updatedUser.latestActivitySummary);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
