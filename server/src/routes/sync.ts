import { Router } from 'express';
import { SyncController } from '../controllers/SyncController';

const router = Router();
const syncController = new SyncController();

// Synchronization routes
router.post('/start/:userId', syncController.startSync);
router.post('/stop/:userId', syncController.stopSync);
router.get('/status/:userId', syncController.getSyncStatus);
router.get('/statuses', syncController.getAllSyncStatuses);
router.get('/clients', syncController.getActiveClients);
router.post('/restart-all', syncController.restartAllSyncs);
router.get('/health', syncController.healthCheck);

export default router;
