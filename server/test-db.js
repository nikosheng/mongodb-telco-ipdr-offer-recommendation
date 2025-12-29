import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Ipdr from './models/Ipdr.js';

dotenv.config();

const testQuery = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const userName = 'User 2';
    console.log(`Searching for: "${userName}"`);

    const user = await User.findOne({
      $or: [
        { name: { $regex: userName, $options: 'i' } },
        { msisdn: userName }
      ]
    });

    if (!user) {
      console.log('User NOT found');
      const allUsers = await User.find({}).limit(5);
      console.log('Sample users in DB:', allUsers.map(u => ({ name: u.name, msisdn: u.msisdn })));
    } else {
      console.log('User found:', { name: user.name, msisdn: user.msisdn });
      const count = await Ipdr.countDocuments({ msisdn: user.msisdn });
      console.log(`IPDR count for this user: ${count}`);
      
      const activities = await Ipdr.find({ msisdn: user.msisdn }).limit(2);
      console.log('Sample activities:', activities);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

testQuery();
