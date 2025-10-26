import { Router } from 'express';
import { SyncController } from '../controllers/SyncController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validateUserAccess, requireAdminAccess } from '../middleware/userAccessMiddleware';

const router = Router();
const syncController = new SyncController();

// All sync routes require authentication
router.use(authenticateToken);

// Synchronization routes with user access validation
router.post('/start/:userId/:email', validateUserAccess, syncController.startSync);
router.post('/stop/:userId', validateUserAccess, syncController.stopSync);
router.get('/status/:userId', validateUserAccess, syncController.getSyncStatus);

// Admin-only routes
router.get('/statuses', requireAdminAccess, syncController.getAllSyncStatuses);
router.get('/clients', requireAdminAccess, syncController.getActiveClients);
router.post('/restart-all', requireAdminAccess, syncController.restartAllSyncs);

// Health check (no user validation needed)
router.get('/health', syncController.healthCheck);

export default router;
