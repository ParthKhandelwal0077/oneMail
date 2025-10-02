import { Request, Response } from 'express';
import { 
  startSync, 
  stopSync, 
  getSyncStatus, 
  getAllSyncStatuses,
  getActiveClients,
  restartAllSyncs
} from '../services/emailSyncService';
import { getUserTokens } from '../services/authService';
import { asyncHandler } from '../middleware/errorHandler';

export class SyncController {
  // Start email synchronization for a user
  startSync = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    try {
      // Check if user has valid authentication tokens
      const tokens = getUserTokens(userId);
      if (!tokens) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
          message: 'User needs to authenticate with Gmail first'
        });
      }

      // Start synchronization
      await startSync(userId, tokens.email);
      
      res.status(200).json({
        success: true,
        message: 'Email synchronization started successfully',
        data: {
          userId,
          email: tokens.email,
          status: 'syncing',
          startedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Start sync error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start email synchronization',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Stop email synchronization for a user
  stopSync = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    try {
      await stopSync(userId);
      
      res.status(200).json({
        success: true,
        message: 'Email synchronization stopped successfully',
        data: {
          userId,
          status: 'stopped',
          stoppedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Stop sync error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop email synchronization',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get synchronization status for a user
  getSyncStatus = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    try {
      const status = await getSyncStatus(userId);
      
      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'No sync status found',
          message: 'User has not started email synchronization'
        });
      }

      res.status(200).json({
        success: true,
        data: { status }
      });
    } catch (error) {
      console.error('Get sync status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve sync status',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get all synchronization statuses
  getAllSyncStatuses = asyncHandler(async (req: Request, res: Response) => {
    try {
      const statuses = await getAllSyncStatuses();
      
      res.status(200).json({
        success: true,
        data: {
          statuses,
          count: statuses.length,
          active: statuses.filter(s => s.status === 'idle' || s.status === 'syncing').length,
          errors: statuses.filter(s => s.status === 'error').length
        }
      });
    } catch (error) {
      console.error('Get all sync statuses error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve sync statuses',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get list of active clients
  getActiveClients = asyncHandler(async (req: Request, res: Response) => {
    try {
      const activeClients = await getActiveClients();
      
      res.status(200).json({
        success: true,
        data: {
          activeClients,
          count: activeClients.length
        }
      });
    } catch (error) {
      console.error('Get active clients error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active clients',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Restart all synchronizations
  restartAllSyncs = asyncHandler(async (req: Request, res: Response) => {
    try {
      await restartAllSyncs();
      
      res.status(200).json({
        success: true,
        message: 'All email synchronizations restarted',
        data: {
          restartedAt: new Date(),
          note: 'Synchronizations will restart with a 2-second delay'
        }
      });
    } catch (error) {
      console.error('Restart all syncs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restart synchronizations',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Health check for sync services
  healthCheck = asyncHandler(async (req: Request, res: Response) => {
    try {
      const statuses = await getAllSyncStatuses();
      const activeClients = await getActiveClients();
      
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          sync: {
            total: statuses.length,
            active: statuses.filter(s => s.status === 'idle' || s.status === 'syncing').length,
            errors: statuses.filter(s => s.status === 'error').length,
            stopped: statuses.filter(s => s.status === 'stopped').length
          },
          clients: {
            connected: activeClients.length
          }
        }
      };

      res.status(200).json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
}
