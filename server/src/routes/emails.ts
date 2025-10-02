import { Router } from 'express';
import { EmailController } from '../controllers/EmailController';

const router = Router();
const emailController = new EmailController();

// Email routes
router.get('/search/:userId', emailController.searchEmails);
router.get('/recent/:userId', emailController.getRecentEmails);
router.get('/:userId/:emailId', emailController.getEmailById);
router.get('/stats/:userId', emailController.getEmailStats);

// Email actions
router.patch('/:userId/:emailId/read', emailController.markEmailStatus);
router.patch('/:userId/:emailId/star', emailController.starEmail);
router.delete('/:userId/:emailId', emailController.deleteEmail);

export default router;
