import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import apiRoutes from './routes';
import { setupElasticsearch, closeElasticsearch } from './services/elasticsearchService';
import { gracefulShutdown } from './services/emailSyncService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static('public'));

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'OneBox Email Aggregator',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Quick start endpoint for testing
app.get('/start', (req, res) => {
  const userId = "e2e8e515-b404-4048-97bb-51eb545f9f8a";
  res.json({
    message: 'OneBox Email Aggregator is running!',
    quickStart: {
      userId,
      steps: [
        `1. Authenticate: GET /api/auth/gmail?userId=${userId}`,
        `2. Check auth status: GET /api/auth/status/${userId}`,
        `3. Start sync: POST /api/sync/start/${userId}`,
        `4. Search emails: GET /api/emails/search/${userId}?query=your-search`,
        `5. Get stats: GET /api/emails/stats/${userId}`
      ]
    }
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize Elasticsearch
setupElasticsearch()
  .then(() => {
    console.log('✅ Elasticsearch initialized successfully');
  })
  .catch(err => {
    console.error('❌ Failed to initialize Elasticsearch:', err);
    console.log('⚠️  Server will start without Elasticsearch functionality');
  });

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
  await gracefulShutdown();
  await closeElasticsearch();
  console.log('✅ Shutdown complete.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
  await gracefulShutdown();
  await closeElasticsearch();
  console.log('✅ Shutdown complete.');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 OneBox Email Aggregator Server');
  console.log('================================');
  console.log(`📧 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`🔍 Elasticsearch: ${process.env.ELASTICSEARCH_URL || 'http://localhost:9200'}`);
  console.log('\n📋 Quick Start:');
  console.log(`   GET http://localhost:${PORT}/start`);
  console.log(`   GET http://localhost:${PORT}/health`);
  console.log('\n🔗 API Endpoints:');
  console.log(`   Authentication: http://localhost:${PORT}/api/auth`);
  console.log(`   Emails: http://localhost:${PORT}/api/emails`);
  console.log(`   Sync: http://localhost:${PORT}/api/sync`);
  console.log('\n✨ Ready to aggregate emails!');
});

export default app;
