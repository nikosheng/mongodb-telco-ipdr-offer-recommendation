
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { findSimilarUsers } from './services/recommendationService.js';

dotenv.config();

const testSimilarUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const msisdn = '85290000000'; 
        
        console.log(`Testing similar users for ${msisdn}...`);
        
        const similarUsers = await findSimilarUsers(msisdn);
        
        console.log(`\nFound ${similarUsers.length} Similar Users:`);
        similarUsers.forEach((user, i) => {
            console.log(`${i+1}. ${user.name} (MSISDN: ${user.msisdn}, Score: ${user.score.toFixed(4)})`);
        });

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
};

testSimilarUsers();
