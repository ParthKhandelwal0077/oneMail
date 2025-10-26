import { Router } from 'express';
import authRoutes from './auth';
import emailRoutes from './emails';
import syncRoutes from './sync';
import aiRoutes from './ai';
import userAuthRoutes from './userAuth';
import websocketRoutes from './websocket';

const router = Router();

// API routes
router.use('/auth', authRoutes); // Gmail OAuth routes
router.use('/user', userAuthRoutes); // User authentication routes
router.use('/emails', emailRoutes);
router.use('/sync', syncRoutes);
router.use('/ai', aiRoutes);
router.use('/websocket', websocketRoutes); // WebSocket management routes

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'OneBox Email Aggregator API',
    version: '1.0.0',
    description: 'Real-time email synchronization and search with AI-powered features',
    endpoints: {
      auth: '/api/auth', // Gmail OAuth
      user: '/api/user', // User authentication
      emails: '/api/emails',
      sync: '/api/sync',
      ai: '/api/ai',
      websocket: '/api/websocket' // WebSocket management
    },
    features: [
      'User authentication with JWT',
      'OAuth Gmail authentication',
      'Real-time IMAP synchronization',
      'Elasticsearch-powered search',
      'Multi-account email aggregation',
      'AI-powered email categorization',
      'Smart email filtering and tagging',
      'Real-time WebSocket notifications'
    ]
  });
});

export default router;
