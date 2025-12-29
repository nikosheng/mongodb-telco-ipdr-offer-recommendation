import express from 'express';
import { createOffer, getRecommendations, getOffers } from '../controllers/offerController.js';

const router = express.Router();

router.post('/', createOffer);
router.get('/', getOffers);
router.get('/recommend', getRecommendations);

export default router;
