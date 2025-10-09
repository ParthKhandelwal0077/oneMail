import { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  getUserById,
  updateUserProfile,
  changePassword,
  deleteUserAccount,
  validatePhoneNumber,
  validatePassword
} from '../services/userAuthService';
import { asyncHandler } from '../middleware/errorHandler';

export class UserAuthController {
  // Register new user
  register = asyncHandler(async (req: Request, res: Response) => {
    const { phoneNumber, password } = req.body;

    // Additional validation
    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        message: 'Please provide a valid phone number'
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Weak password',
        message: passwordValidation.message
      });
    }

    try {
      const result = await registerUser({ phoneNumber, password });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        error: 'Registration failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Login user
  login = asyncHandler(async (req: Request, res: Response) => {
    const { phoneNumber, password } = req.body;

    try {
      const result = await loginUser({ phoneNumber, password });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Refresh access token
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    try {
      const tokens = await refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get current user profile
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    try {
      const user = await getUserById(userId);

      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(404).json({
        success: false,
        error: 'User not found',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Update user profile
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { phoneNumber, slackWebhookUrl, customWebhookUrl } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Validate phone number if provided
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        message: 'Please provide a valid phone number'
      });
    }

    try {
      const user = await updateUserProfile(userId, {
        phoneNumber,
        slackWebhookUrl,
        customWebhookUrl
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({
        success: false,
        error: 'Profile update failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Change password
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Weak password',
        message: passwordValidation.message
      });
    }

    try {
      await changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(400).json({
        success: false,
        error: 'Password change failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Delete user account
  deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { password } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password required',
        message: 'Please provide your password to delete your account'
      });
    }

    try {
      await deleteUserAccount(userId, password);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(400).json({
        success: false,
        error: 'Account deletion failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Logout user (client-side token removal)
  logout = asyncHandler(async (req: Request, res: Response) => {
    // Since we're using stateless JWT tokens, logout is handled client-side
    // by removing the token from storage. We can add token blacklisting here
    // if needed in the future.

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  // Verify token endpoint
  verifyToken = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    try {
      const user = await getUserById(userId);

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber
          }
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'User not found'
      });
    }
  });

  // Get user statistics
  getUserStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    try {
      const user = await getUserById(userId);

      res.status(200).json({
        success: true,
        data: {
          stats: {
            totalEmailAccounts: user.emailAccounts.length,
            accountCreatedAt: user.createdAt,
            lastUpdated: user.updatedAt
          },
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(404).json({
        success: false,
        error: 'User not found',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
}
