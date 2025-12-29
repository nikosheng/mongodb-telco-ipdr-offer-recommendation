import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ipdr from './models/Ipdr.js';
import { updateUserProfile } from './services/autoTaggingService.js';

dotenv.config();

const generateDailyIpdr = async () => {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error("Usage: node generate_daily_ipdr.js <msisdn> <serviceType> <date> [location]");
    console.error("Available serviceTypes: 'Social App', 'Gaming', 'Business', 'Travel'");
    console.error("Date format: YYYY-MM-DD");
    console.error("Location (optional for Travel): 'Japan' or 'USA'");
    console.error("Example: node generate_daily_ipdr.js 85290000000 'Social App' 2025-12-25");
    process.exit(1);
  }

  const [msisdn, serviceType, dateStr, requestedLocation] = args;
  
  // Set to start of the day in UTC
  const baseDate = new Date(`${dateStr}T00:00:00Z`);

  if (isNaN(baseDate.getTime())) {
    console.error("Invalid date format. Please use YYYY-MM-DD.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const districts = ["Central", "Wan Chai", "Tsim Sha Tsui", "Mong Kok"];
    
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

    // Determine specific travel location for the entire day (consistent per execution)
    let travelLocation = null;
    if (serviceType === 'Travel') {
        if (requestedLocation && locations[requestedLocation]) {
            travelLocation = locations[requestedLocation];
        } else {
            travelLocation = Math.random() > 0.5 ? locations['Japan'] : locations['USA'];
        }
        console.log(`Selected Travel Destination for this day: ${travelLocation.country}`);
    }

    const dailyRecords = [];

    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(baseDate);
      timestamp.setUTCHours(hour);
      // Randomize minutes and seconds slightly for natural feel
      timestamp.setUTCMinutes(Math.floor(Math.random() * 60));
      timestamp.setUTCSeconds(Math.floor(Math.random() * 60));

      let urlKey = serviceType;
      if (serviceType === 'Travel') {
        urlKey = `Travel-${travelLocation.country}`;
      }
      
      const serviceUrls = urls[urlKey] || [`https://example.com/activity`];
      const url = serviceUrls[Math.floor(Math.random() * serviceUrls.length)];

      let locInfo;
      if (serviceType === 'Travel') {
        locInfo = travelLocation;
      } else {
        locInfo = locations['Hong Kong'];
      }

      dailyRecords.push({
        msisdn,
        timestamp,
        serviceType,
        url,
        sourceIp: `192.168.1.${10 + hour}`,
        destinationIp: `10.0.0.${100 + hour}`,
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
    }

    await Ipdr.insertMany(dailyRecords);
    console.log(`Successfully generated 24 IPDR records for ${msisdn} on ${dateStr}`);

    // Trigger user profile update
    console.log("Updating User Profile...");
    await updateUserProfile(msisdn, { forceUpdate: true });
    console.log("User Profile Updated with new summary and embedding.");

    process.exit(0);
  } catch (error) {
    console.error("Error generating daily IPDRs:", error);
    process.exit(1);
  }
};

generateDailyIpdr();
