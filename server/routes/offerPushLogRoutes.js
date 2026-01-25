import express from 'express';
import { logOfferPush, updatePushStatus, getDailySummary } from '../controllers/offerPushLogController.js';

const router = express.Router();

router.post('/', logOfferPush);
router.get('/summary', getDailySummary);
router.put('/:id', updatePushStatus);

export default router;
