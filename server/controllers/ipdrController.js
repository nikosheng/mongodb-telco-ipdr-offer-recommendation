import Ipdr from '../models/Ipdr.js';
import User from '../models/User.js'; // Import User model
import { processIpdr, updateUserProfile } from '../services/autoTaggingService.js';

export const ingestIpdr = async (req, res) => {
  try {
    const rawData = req.body;
    const processedData = await processIpdr(rawData);
    
    const newIpdr = new Ipdr(processedData);
    await newIpdr.save();

    // Trigger user profile update (async, don't wait for response)
    // Also update User current location based on IPDR
    const userUpdate = {
        currentLocation: processedData.location.coordinates
    };
    await User.findOneAndUpdate({ msisdn: rawData.msisdn }, { $set: userUpdate }, { upsert: true });

    updateUserProfile(rawData.msisdn);

    res.status(201).json({ success: true, data: newIpdr });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getIpdrData = async (req, res) => {
  try {
    let { userName: msisdn } = req.query;
    
    if (msisdn && msisdn.trim()) {
      const searchTerm = msisdn.trim();
      
      const user = await User.findOne({ msisdn: searchTerm });

      if (!user) {
        return res.status(200).json({ success: true, data: [], user: null });
      }

      const activities = await Ipdr.find({ msisdn: user.msisdn })
        .sort({ timestamp: -1 })
        .limit(10);

      const activitiesWithNames = activities.map(act => {
        const obj = act.toObject();
        return {
          ...obj,
          userName: user.name
        };
      });

      return res.status(200).json({ 
        success: true, 
        data: activitiesWithNames, 
        user: { 
          msisdn: user.msisdn, 
          name: user.name, 
          tags: user.tags,
          latestActivitySummary: user.latestActivitySummary 
        } 
      });
    }

    const data = await Ipdr.aggregate([
        { $sort: { timestamp: -1 } },
        { $limit: 100 },
        {
            $lookup: {
                from: 'users',
                localField: 'msisdn',
                foreignField: 'msisdn',
                as: 'userInfo'
            }
        },
        {
            $addFields: {
                userName: { $arrayElemAt: ["$userInfo.name", 0] }
            }
        },
        { $project: { userInfo: 0 } }
    ]);
    
    console.log('Returning global data, count:', data.length);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in getIpdrData:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
