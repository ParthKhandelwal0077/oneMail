import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validateUserAccess, requireAdminAccess } from '../middleware/userAccessMiddleware';

const router = Router();
const authController = new AuthController();

// Public routes (no authentication required)
router.get('/gmail/callback', authController.handleCallback);

// Protected routes (authentication required)
router.use(authenticateToken);

router.get('/gmail', authController.getAuthUrl);

router.get('/status/:userId', validateUserAccess, authController.getAuthStatus);
router.delete('/revoke/:userId', validateUserAccess, authController.revokeAuth);
router.get('/users', requireAdminAccess, authController.getAllUsers);
router.get('/emails/:userId', validateUserAccess, authController.getUserEmails);
router.delete('/revoke/:userId/:email', validateUserAccess, authController.revokeEmailAuth);

export default router;
