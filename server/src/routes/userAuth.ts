import { Router } from 'express';
import { UserAuthController } from '../controllers/UserAuthController';
import {
  authenticateToken,
  validateAuthRequest,
  validateSignupRequest,
  validateRefreshTokenRequest,
  validatePasswordChangeRequest,
  requireAuth
} from '../middleware/authMiddleware';

const router = Router();
const userAuthController = new UserAuthController();

// Public routes (no authentication required)
router.post('/register', validateSignupRequest, userAuthController.register);
router.post('/login', validateAuthRequest, userAuthController.login);
router.post('/refresh', validateRefreshTokenRequest, userAuthController.refreshToken);

// Protected routes (authentication required)
router.use(authenticateToken); // All routes below require authentication

router.get('/profile', userAuthController.getProfile);
router.put('/profile', userAuthController.updateProfile);
router.post('/change-password', validatePasswordChangeRequest, userAuthController.changePassword);
router.delete('/account', userAuthController.deleteAccount);
router.post('/logout', userAuthController.logout);
router.get('/verify', userAuthController.verifyToken);
router.get('/stats', userAuthController.getUserStats);

export default router;
