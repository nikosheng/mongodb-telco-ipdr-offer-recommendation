import express from 'express';
import { chatWithAgent } from '../controllers/chatController.js';

const router = express.Router();

router.post('/', chatWithAgent);

export default router;
