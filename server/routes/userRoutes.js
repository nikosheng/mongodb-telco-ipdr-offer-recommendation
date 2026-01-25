import express from 'express';
import { getSimilarUsers } from '../controllers/userController.js';

const router = express.Router();

router.get('/similar', getSimilarUsers);

export default router;
