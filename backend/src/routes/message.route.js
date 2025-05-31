import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { getChatMessages, saveMessage } from '../controllers/message.controller.js';

const router = express.Router();

router.get('/:chatId', protectRoute, getChatMessages);
router.post('/', protectRoute, saveMessage);

export default router;
