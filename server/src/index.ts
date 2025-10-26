import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import apiRoutes from './routes';
import { setupElasticsearch, closeElasticsearch } from './services/elasticsearchService';
import { gracefulShutdown } from './services/emailSyncService';
import { checkDatabaseConnection, closePrismaConnection } from './config/prisma';
import { initializeWebSocketService } from './services/webSocketService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Create HTTP server for WebSocket support
const server = createServer(app);

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

// CORS configuration with multiple origins support
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  // Add network IP patterns for development
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
  /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/
];

// Add custom CLIENT_URL if provided
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
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
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await checkDatabaseConnection();
    
    res.status(200).json({
      status: 'OK',
      service: 'OneBox Email Aggregator',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbConnected ? 'connected' : 'disconnected',
      elasticsearch: 'checking...' // Will be updated by Elasticsearch setup
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      service: 'OneBox Email Aggregator',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Quick start endpoint for testing
app.get('/start', (req, res) => {
  res.json({
    message: 'OneBox Email Aggregator is running!',
    quickStart: {
      steps: [
        '1. Register: POST /api/user-auth/register { "phoneNumber": "+1234567890", "password": "yourPassword" }',
        '2. Login: POST /api/user-auth/login { "phoneNumber": "+1234567890", "password": "yourPassword" }',
        '3. Get Gmail auth URL: GET /api/auth/gmail (with Authorization header)',
        '4. Complete OAuth callback: GET /api/auth/gmail/callback?code=...&state=...',
        '5. Check auth status: GET /api/auth/status/{userId} (with Authorization header)',
        '6. Start sync: POST /api/sync/start/{userId}/{email} (with Authorization header)',
        '7. Search emails: GET /api/emails/search/{userId}?query=your-search (with Authorization header)',
        '8. Get stats: GET /api/emails/stats/{userId} (with Authorization header)'
      ],
      note: 'All API endpoints (except registration/login) require Authorization header with Bearer token'
    }
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
    console.log('✅ Database connected successfully');

    // Initialize Elasticsearch
    await setupElasticsearch();
    console.log('✅ Elasticsearch initialized successfully');

    // Initialize WebSocket service
    initializeWebSocketService(server);
    console.log('✅ WebSocket service initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
}

// Initialize services
initializeServices();

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
  await gracefulShutdown();
  await closeElasticsearch();
  await closePrismaConnection();
  console.log('✅ Shutdown complete.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
  await gracefulShutdown();
  await closeElasticsearch();
  await closePrismaConnection();
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
server.listen(PORT, () => {
  console.log('\n🚀 OneBox Email Aggregator Server');
  console.log('================================');
  console.log(`📧 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`🔍 Elasticsearch: ${process.env.ELASTICSEARCH_URL || 'http://localhost:9200'}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  console.log('\n📋 Quick Start:');
  console.log(`   GET http://localhost:${PORT}/start`);
  console.log(`   GET http://localhost:${PORT}/health`);
  console.log('\n🔗 API Endpoints:');
  console.log(`   Authentication: http://localhost:${PORT}/api/auth`);
  console.log(`   Emails: http://localhost:${PORT}/api/emails`);
  console.log(`   Sync: http://localhost:${PORT}/api/sync`);
  console.log('\n🔌 WebSocket:');
  console.log(`   Connect: ws://localhost:${PORT}/ws?token=<jwt-token>`);
  console.log('\n✨ Ready to aggregate emails with real-time notifications!');
});

export default app;
