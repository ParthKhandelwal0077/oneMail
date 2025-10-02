import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();
const authController = new AuthController();

// Authentication routes
router.get('/gmail', authController.getAuthUrl);
router.get('/gmail/callback', authController.handleCallback);
router.get('/status/:userId', authController.getAuthStatus);
router.delete('/revoke/:userId', authController.revokeAuth);
router.get('/users', authController.getAllUsers);

export default router;
