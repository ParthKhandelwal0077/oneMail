import { Router } from 'express';
import { EmailController } from '../controllers/EmailController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validateUserAccess, validateEmailAccess } from '../middleware/userAccessMiddleware';

const router = Router();
const emailController = new EmailController();

// All email routes require authentication
router.use(authenticateToken);

// Email routes with user access validation
router.get('/search/:userId', validateUserAccess, emailController.searchEmails);
router.get('/recent/:userId', validateUserAccess, emailController.getRecentEmails);
router.get('/stats/:userId', validateUserAccess, emailController.getEmailStats);
router.get('/:userId/:emailId', validateEmailAccess, emailController.getEmailById);

// Email actions with user access validation
router.patch('/:userId/:emailId/read', validateEmailAccess, emailController.markEmailStatus);
router.patch('/:userId/:emailId/star', validateEmailAccess, emailController.starEmail);
router.delete('/:userId/:emailId', validateEmailAccess, emailController.deleteEmail);

export default router;
