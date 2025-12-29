import express from 'express';
import { ingestIpdr, getIpdrData } from '../controllers/ipdrController.js';

const router = express.Router();

router.post('/', ingestIpdr);
router.get('/', getIpdrData);

export default router;
