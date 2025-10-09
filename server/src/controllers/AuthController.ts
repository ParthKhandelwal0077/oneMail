import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAuthUrl, handleCallback, getUserTokens, deleteUserTokens, getAllUserIds, getAllUserEmails, deleteUserTokenByEmail } from '../services/authService';
import { asyncHandler } from '../middleware/errorHandler';

export class AuthController {
  // Generate OAuth URL for Gmail authentication
  getAuthUrl = asyncHandler(async (req: Request, res: Response) => {
    const userId = "e2e8e515-b404-4048-97bb-51eb545f9f8a";
    const authUrl = getAuthUrl(userId);
    
    res.status(200).json({
      success: true,
      data: {
        authUrl,
        userId,
        message: 'Redirect user to this URL to authenticate with Gmail'
      }
    });
  });

  // Handle OAuth callback from Google
  handleCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or user ID',
        message: 'Both code and state parameters are required'
      });
    }

    try {
      const tokens = await handleCallback(code as string, userId as string);
      
      res.status(200).json({
        success: true,
        message: 'Gmail authentication successful',
        data: {
          userId,
          email: tokens.email,
          hasRefreshToken: !!tokens.refresh_token,
          nextStep: 'Start email synchronization'
        }
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get user authentication status
  getAuthStatus = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const tokens = getUserTokens(userId);
    
    if (!tokens || tokens.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No authentication found',
        message: 'User needs to authenticate with Gmail first'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        userId,
        emails: tokens.map(token => ({
          email: token.email,
          hasRefreshToken: !!token.refresh_token,
          tokenExpiry: new Date(token.expiry_date)
        })),
        isAuthenticated: true,
        totalAccounts: tokens.length
      }
    });
  });

  // Revoke user authentication
  revokeAuth = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const deleted = deleteUserTokens(userId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'No authentication found',
        message: 'User was not authenticated'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Authentication revoked successfully',
      data: {
        userId,
        revoked: true
      }
    });
  });

  // List all authenticated users
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    // This would typically be from a database in production
    const users = getAllUserIds();

    res.status(200).json({
      success: true,
      data: {
        users,
        count: users?.length
      }
    });
  });

  // Get all emails for a user
  getUserEmails = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const emails = getAllUserEmails(userId);

    res.status(200).json({
      success: true,
      data: {
        userId,
        emails,
        count: emails.length
      }
    });
  });

  // Revoke authentication for a specific email
  revokeEmailAuth = asyncHandler(async (req: Request, res: Response) => {
    const { userId, email } = req.params;

    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        error: 'User ID and email are required'
      });
    }

    const deleted = deleteUserTokenByEmail(userId, email);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'No authentication found',
        message: `No authentication found for email ${email} for user ${userId}`
      });
    }

    res.status(200).json({
      success: true,
      message: `Authentication revoked successfully for ${email}`,
      data: {
        userId,
        email,
        revoked: true
      }
    });
  });
}
