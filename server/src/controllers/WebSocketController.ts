import { Request, Response } from 'express';
import { getWebSocketService } from '../services/webSocketService';
import { asyncHandler } from '../middleware/errorHandler';

export class WebSocketController {
  // Get WebSocket connection status for authenticated user
  getConnectionStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const wsService = getWebSocketService();
    if (!wsService) {
      return res.status(503).json({
        success: false,
        error: 'WebSocket service not available'
      });
    }

    const isConnected = wsService.isUserConnected(userId);
    const connectionCount = wsService.getConnectionCount();
    const connectedUsers = wsService.getConnectedUsers();

    res.status(200).json({
      success: true,
      data: {
        userId,
        isConnected,
        connectionCount,
        connectedUsers: connectedUsers.length,
        websocketUrl: `ws://localhost:${process.env.PORT || 5001}/ws?token=<jwt-token>`,
        timestamp: new Date()
      }
    });
  });

  // Send test message to user's WebSocket connection
  sendTestMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { message } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const wsService = getWebSocketService();
    if (!wsService) {
      return res.status(503).json({
        success: false,
        error: 'WebSocket service not available'
      });
    }

    if (!wsService.isUserConnected(userId)) {
      return res.status(404).json({
        success: false,
        error: 'WebSocket connection not found',
        message: 'Please establish a WebSocket connection first'
      });
    }

    // Send test message
    wsService.sendToClient(userId, {
      type: 'test_message',
      data: {
        message,
        userId,
        timestamp: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Test message sent successfully',
      data: {
        userId,
        message,
        timestamp: new Date()
      }
    });
  });

  // Get WebSocket service statistics
  getServiceStats = asyncHandler(async (req: Request, res: Response) => {
    const wsService = getWebSocketService();
    if (!wsService) {
      return res.status(503).json({
        success: false,
        error: 'WebSocket service not available'
      });
    }

    const connectionCount = wsService.getConnectionCount();
    const connectedUsers = wsService.getConnectedUsers();

    res.status(200).json({
      success: true,
      data: {
        connectionCount,
        connectedUsers,
        websocketUrl: `ws://localhost:${process.env.PORT || 5001}/ws?token=<jwt-token>`,
        features: [
          'Real-time email notifications',
          'Sync status updates',
          'Heartbeat monitoring',
          'JWT authentication'
        ],
        timestamp: new Date()
      }
    });
  });

  // Disconnect user's WebSocket connection
  disconnectUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const wsService = getWebSocketService();
    if (!wsService) {
      return res.status(503).json({
        success: false,
        error: 'WebSocket service not available'
      });
    }

    if (!wsService.isUserConnected(userId)) {
      return res.status(404).json({
        success: false,
        error: 'WebSocket connection not found'
      });
    }

    wsService.disconnectUser(userId);

    res.status(200).json({
      success: true,
      message: 'WebSocket connection disconnected successfully',
      data: {
        userId,
        timestamp: new Date()
      }
    });
  });

  // Broadcast message to all connected users (admin only)
  broadcastMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { message, type = 'broadcast' } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Check if user is admin (you can implement proper admin check here)
    const adminUsers = process.env.ADMIN_USER_IDS?.split(',') || [];
    if (!adminUsers.includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const wsService = getWebSocketService();
    if (!wsService) {
      return res.status(503).json({
        success: false,
        error: 'WebSocket service not available'
      });
    }

    // Broadcast to all connected users
    wsService.sendToAllClients({
      type,
      data: {
        message,
        from: 'admin',
        timestamp: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Broadcast message sent successfully',
      data: {
        message,
        type,
        recipients: wsService.getConnectionCount(),
        timestamp: new Date()
      }
    });
  });
}
