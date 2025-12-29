import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ipdr from './models/Ipdr.js';
import { updateUserProfile } from './services/autoTaggingService.js';

dotenv.config();

const generateSingleIpdr = async () => {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error("Usage: node generate_single_ipdr.js <msisdn> <serviceType> <timestamp>");
    console.error("Available serviceTypes: 'Social App', 'Gaming', 'Business', 'Travel'");
    console.error("Example: node generate_single_ipdr.js 85290000000 'Social App' 2023-12-25T10:00:00Z");
    process.exit(1);
  }

  const [msisdn, serviceType, timestampStr] = args;
  const timestamp = new Date(timestampStr);

  if (isNaN(timestamp.getTime())) {
    console.error("Invalid timestamp format.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const districts = ["Central", "Wan Chai", "Tsim Sha Tsui", "Mong Kok"];
    
    const urls = {
      'Social App': ['instagram.com/p/reel1', 'tiktok.com/@user/video1', 'xiaohongshu.com/explore/item1'],
      'Gaming': ['playstation.com/network', 'xbox.com/live', 'gaming.tencent.com/play'],
      'Business': ['linkedin.com/feed', 'slack.com/workspace', 'teams.microsoft.com/l/meetup'],
      'Travel': ['klook.com/activity/japan', 'trip.com/hotels/us', 'agoda.com/destinations']
    };

    const locations = {
      'Hong Kong': { country: "Hong Kong", city: "Hong Kong", coords: [114.1, 22.2] },
      'Japan': { country: "Japan", city: "Tokyo", coords: [139.6917, 35.6895] },
      'USA': { country: "USA", city: "New York", coords: [-74.0060, 40.7128] }
    };

    const serviceUrls = urls[serviceType] || [`https://example.com/activity`];
    const url = serviceUrls[Math.floor(Math.random() * serviceUrls.length)];

    let locInfo;
    if (serviceType === 'Travel') {
      locInfo = Math.random() > 0.5 ? locations['Japan'] : locations['USA'];
    } else {
      locInfo = locations['Hong Kong'];
    }

    const newIpdr = new Ipdr({
      msisdn,
      timestamp,
      serviceType,
      url,
      sourceIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
      destinationIp: `10.0.0.${Math.floor(Math.random() * 255)}`,
      sourcePort: 10000 + Math.floor(Math.random() * 50000),
      destinationPort: 443,
      protocol: "TCP",
      duration: 300 + Math.floor(Math.random() * 3000),
      uploadVolume: 1000000 + Math.floor(Math.random() * 10000000),
      downloadVolume: 5000000 + Math.floor(Math.random() * 500000000),
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

    await newIpdr.save();
    console.log(`Generated IPDR for ${msisdn} at ${timestamp.toISOString()} with service ${serviceType}`);

    // Trigger user profile update
    await updateUserProfile(msisdn, { forceUpdate: true });
    console.log("User Profile Updated");

    process.exit();
  } catch (error) {
    console.error("Error generating IPDR:", error);
    process.exit(1);
  }
};

generateSingleIpdr();
