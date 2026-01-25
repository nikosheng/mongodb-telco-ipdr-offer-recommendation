import User from '../models/User.js';
import { findSimilarUsers } from '../services/recommendationService.js';

export const getSimilarUsers = async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID (msisdn) is required" });
    }

    const similarUsers = await findSimilarUsers(userId);
    res.status(200).json({ success: true, count: similarUsers.length, data: similarUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
