import WebSocket from 'ws';
import { Server as HttpServer } from 'http';
import { EmailMessage } from '../types';
import { getUserTokens } from './authService';
import { startSync, stopSync } from './emailSyncService';

export interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  isAlive: boolean;
  lastPing: Date;
}

export interface EmailNotification {
  type: 'new_email';
  data: {
    email: EmailMessage;
    userId: string;
    timestamp: Date;
  };
}

export interface SyncNotification {
  type: 'sync_status';
  data: {
    userId: string;
    status: 'idle' | 'syncing' | 'error' | 'stopped';
    email?: string;
    error?: string;
    timestamp: Date;
  };
}

export type NotificationMessage = EmailNotification | SyncNotification;

export class WebSocketService {
  private wss: WebSocket.Server;
  //userId to WebSocketClient map
  private clients: Map<string, WebSocketClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.setupWebSocketServer();
    this.startHeartbeat();
    
    console.log('🔌 WebSocket server initialized');
  }
//token verification 1
  private verifyClient(info: any): boolean {
    const url = new URL(info.req.url, `http://${info.req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.log('❌ WebSocket connection rejected: No token provided');
      return false;
    }

    // We'll verify the token in the connection handler
    return true;
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.log('❌ WebSocket connection rejected: No token');
        ws.close(1008, 'Authentication token required');
        return;
      }

      // Verify JWT token
      this.authenticateConnection(ws, token);
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });
  }

  private async authenticateConnection(ws: WebSocket, token: string): Promise<void> {
    try {
      // Import here to avoid circular dependency
      const { verifyToken, getUserById } = await import('../services/userAuthService');
      
      const decoded = verifyToken(token);
      if (!decoded) {
        console.log('❌ WebSocket connection rejected: Invalid token');
        ws.close(1008, 'Invalid authentication token');
        return;
      }

      // Verify user exists
      const user = await getUserById(decoded.userId);
      if (!user) {
        console.log('❌ WebSocket connection rejected: User not found');
        ws.close(1008, 'User not found');
        return;
      }

      // Store client connection
      const client: WebSocketClient = {
        ws,
        userId: user.id,
        isAlive: true,
        lastPing: new Date()
      };

      this.clients.set(user.id, client);
      console.log(`🔌 WebSocket connected for user: ${user.id} (${user.phoneNumber})`);

      // Auto-start email sync for all user's email accounts
      await this.startAutoSync(user.id);

      // Send welcome message
      this.sendToClient(user.id, {
        type: 'connection',
        data: {
          message: 'Connected to OneBox Email Aggregator',
          userId: user.id,
          timestamp: new Date()
        }
      });

      // Setup client event handlers
      this.setupClientHandlers(client);

    } catch (error) {
      console.error('❌ WebSocket authentication error:', error);
      ws.close(1008, 'Authentication failed');
    }
  }

  private setupClientHandlers(client: WebSocketClient): void {
    const { ws, userId } = client;

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(userId, message);
      } catch (error) {
        console.error(`❌ Error parsing message from user ${userId}:`, error);
      }
    });

    ws.on('pong', () => {
      client.isAlive = true;
      client.lastPing = new Date();
    });

    ws.on('close', (code: number, reason: string) => {
      console.log(`🔌 WebSocket disconnected for user ${userId}: ${code} - ${reason}`);
      
      // Auto-stop email sync when client disconnects
      this.stopAutoSync(userId);
      
      this.clients.delete(userId);
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for user ${userId}:`, error);
      
      // Auto-stop email sync on error
      this.stopAutoSync(userId);
      
      this.clients.delete(userId);
    });
  }

  private handleClientMessage(userId: string, message: any): void {
    console.log(`📨 Message from user ${userId}:`, message);
    
    // Handle different message types
    switch (message.type) {
      case 'ping':
        this.sendToClient(userId, {
          type: 'pong',
          data: {
            timestamp: new Date()
          }
        });
        break;
      
      case 'subscribe':
        // User wants to subscribe to specific notifications
        console.log(`📡 User ${userId} subscribed to:`, message.data?.topics);
        break;
      
      default:
        console.log(`❓ Unknown message type from user ${userId}:`, message.type);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, userId) => {
        if (!client.isAlive) {
          console.log(`💔 Terminating inactive WebSocket connection for user ${userId}`);
          client.ws.terminate();
          this.clients.delete(userId);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // Ping every 30 seconds
  }

  // Public methods for sending notifications

  public sendNewEmailNotification(userId: string, email: EmailMessage): void {
    const notification: EmailNotification = {
      type: 'new_email',
      data: {
        email,
        userId,
        timestamp: new Date()
      }
    };

    this.sendToClient(userId, notification);
    console.log(`📧 Sent new email notification to user ${userId}: ${email.subject}`);
  }

  public sendSyncStatusNotification(userId: string, status: 'idle' | 'syncing' | 'error' | 'stopped', email?: string, error?: string): void {
    const notification: SyncNotification = {
      type: 'sync_status',
      data: {
        userId,
        status,
        email,
        error,
        timestamp: new Date()
      }
    };

    this.sendToClient(userId, notification);
    console.log(`🔄 Sent sync status notification to user ${userId}: ${status}`);
  }

  public sendToClient(userId: string, message: any): void {
    const client = this.clients.get(userId);
    
    if (!client) {
      console.log(`⚠️  No WebSocket connection found for user ${userId}`);
      return;
    }

    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Error sending message to user ${userId}:`, error);
        this.clients.delete(userId);
      }
    } else {
      console.log(`⚠️  WebSocket connection for user ${userId} is not open`);
      this.clients.delete(userId);
    }
  }

  public sendToAllClients(message: any): void {
    this.clients.forEach((client, userId) => {
      this.sendToClient(userId, message);
    });
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  public getConnectionCount(): number {
    return this.clients.size;
  }

  public isUserConnected(userId: string): boolean {
    return this.clients.has(userId);
  }

  public disconnectUser(userId: string): void {
    const client = this.clients.get(userId);
    if (client) {
      // Auto-stop email sync when manually disconnecting
      this.stopAutoSync(userId);
      
      client.ws.close(1000, 'User disconnected');
      this.clients.delete(userId);
      console.log(`🔌 Disconnected user ${userId}`);
    }
  }

  // Auto-sync methods
  private async startAutoSync(userId: string): Promise<void> {
    try {
      console.log(`🚀 Starting auto-sync for user ${userId}`);
      
      // Get all user's email accounts
      const tokens = await getUserTokens(userId);
      if (!tokens || tokens.length === 0) {
        console.log(`⚠️  No email accounts found for user ${userId}`);
        return;
      }

      // Start sync for each email account
      for (const token of tokens) {
        try {
          await startSync(userId, token.email);
          console.log(`✅ Auto-started sync for ${userId} (${token.email})`);
        } catch (error) {
          console.error(`❌ Failed to auto-start sync for ${userId} (${token.email}):`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Auto-sync start failed for user ${userId}:`, error);
    }
  }

  private async stopAutoSync(userId: string): Promise<void> {
    try {
      console.log(`🛑 Stopping auto-sync for user ${userId}`);
      
      // Stop all email syncs for this user
      await stopSync(userId);
      
      console.log(`✅ Auto-stopped all syncs for user ${userId}`);
    } catch (error) {
      console.error(`❌ Auto-sync stop failed for user ${userId}:`, error);
    }
  }

  public close(): void {
    console.log('🛑 Closing WebSocket server...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Stop all auto-syncs before closing connections
    this.clients.forEach((client, userId) => {
      this.stopAutoSync(userId);
      client.ws.close(1001, 'Server shutting down');
    });

    this.clients.clear();
    this.wss.close();
    console.log('✅ WebSocket server closed');
  }
}

// Singleton instance
let wsService: WebSocketService | null = null;

export function initializeWebSocketService(server: HttpServer): WebSocketService {
  if (!wsService) {
    wsService = new WebSocketService(server);
  }
  return wsService;
}

export function getWebSocketService(): WebSocketService | null {
  return wsService;
}


export default WebSocketService;