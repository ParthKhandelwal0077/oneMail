import { Router } from 'express';
import { AIController } from '../controllers/AIController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validateUserAccess, useAuthenticatedUserId } from '../middleware/userAccessMiddleware';

const router = Router();
const aiController = new AIController();

// All AI routes require authentication
router.use(authenticateToken);

// AI categorization routes with user access validation
router.post('/categorize', aiController.categorizeEmail);
router.post('/categorize/batch', aiController.categorizeEmailsBatch);
router.post('/recategorize/:userId', validateUserAccess, aiController.recategorizeUserEmails);
router.get('/categories', aiController.getCategories);
router.get('/stats/:userId', validateUserAccess, aiController.getCategoryStats);
router.get('/status', aiController.getServiceStatus);

export default router;
