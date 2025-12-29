import Offer from '../models/Offer.js';
import { recommendOffers } from '../services/recommendationService.js';

export const createOffer = async (req, res) => {
  try {
    const offer = new Offer(req.body);
    await offer.save();
    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find({});
    res.status(200).json({ success: true, count: offers.length, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const { userId } = req.query; // Changed from lat/lng to userId
    
    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID (msisdn) is required" });
    }

    const recommendations = await recommendOffers(userId);
    res.status(200).json({ success: true, count: recommendations.length, data: recommendations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
