import { Router } from 'express';
import authRoutes from './auth';
import emailRoutes from './emails';
import syncRoutes from './sync';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);
router.use('/sync', syncRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'OneBox Email Aggregator API',
    version: '1.0.0',
    description: 'Real-time email synchronization and search with AI-powered features',
    endpoints: {
      auth: '/api/auth',
      emails: '/api/emails',
      sync: '/api/sync'
    },
    features: [
      'OAuth Gmail authentication',
      'Real-time IMAP synchronization',
      'Elasticsearch-powered search',
      'Multi-account email aggregation',
      'AI-powered email processing'
    ]
  });
});

export default router;
