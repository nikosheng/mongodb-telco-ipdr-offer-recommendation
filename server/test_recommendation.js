
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { recommendOffers } from './services/recommendationService.js';

dotenv.config();

const testRecommendation = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // Use a known MSISDN that we seeded or generated data for
        const msisdn = '85290000000'; 
        
        console.log(`Testing recommendations for ${msisdn}...`);
        
        const recommendations = await recommendOffers(msisdn);
        
        console.log(`\nTop ${recommendations.length} Recommendations:`);
        recommendations.forEach((offer, i) => {
            console.log(`${i+1}. ${offer.name} (Score: ${offer.score.toFixed(4)})`);
            // console.log(`   Desc: ${offer.description.substring(0, 50)}...`);
        });

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
};

testRecommendation();
