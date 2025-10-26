import { Router } from 'express';
import { WebSocketController } from '../controllers/WebSocketController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const wsController = new WebSocketController();

// All WebSocket routes require authentication
router.use(authenticateToken);

// WebSocket management routes
router.get('/status', wsController.getConnectionStatus);
router.post('/test', wsController.sendTestMessage);
router.get('/stats', wsController.getServiceStats);
router.delete('/disconnect', wsController.disconnectUser);
router.post('/broadcast', wsController.broadcastMessage);

export default router;
