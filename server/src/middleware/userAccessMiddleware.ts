import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate that the authenticated user can only access their own data
 * This prevents users from accessing other users' data by changing URL parameters
 */
export const validateUserAccess = (req: Request, res: Response, next: NextFunction) => {
  const authenticatedUserId = req.user?.id;
  const requestedUserId = req.params.userId;

  if (!authenticatedUserId) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }

  if (!requestedUserId) {
    return res.status(400).json({
      success: false,
      error: 'User ID parameter is required'
    });
  }

  // Check if the authenticated user is trying to access their own data
  if (authenticatedUserId !== requestedUserId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You can only access your own data'
    });
  }

  next();
};

/**
 * Middleware to validate user access for email-specific routes
 * This includes both userId and emailId validation
 */
export const validateEmailAccess = (req: Request, res: Response, next: NextFunction) => {
  const authenticatedUserId = req.user?.id;
  const requestedUserId = req.params.userId;
  const emailId = req.params.emailId;

  if (!authenticatedUserId) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }

  if (!requestedUserId) {
    return res.status(400).json({
      success: false,
      error: 'User ID parameter is required'
    });
  }

  if (!emailId) {
    return res.status(400).json({
      success: false,
      error: 'Email ID parameter is required'
    });
  }

  // Check if the authenticated user is trying to access their own data
  if (authenticatedUserId !== requestedUserId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You can only access your own emails'
    });
  }

  next();
};

/**
 * Middleware for admin-only routes
 * This should be used sparingly and only for system administration
 */
export const requireAdminAccess = (req: Request, res: Response, next: NextFunction) => {
  const authenticatedUserId = req.user?.id;

  if (!authenticatedUserId) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }

  // For now, we'll implement a simple admin check
  // In production, you might want to add an admin role to the user model
  const adminUsers = process.env.ADMIN_USER_IDS?.split(',') || [];
  
  if (!adminUsers.includes(authenticatedUserId)) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      message: 'This endpoint requires administrator privileges'
    });
  }

  next();
};

/**
 * Middleware to extract user ID from authenticated user instead of URL parameter
 * This is useful for routes that don't need userId in the URL
 */
export const useAuthenticatedUserId = (req: Request, res: Response, next: NextFunction) => {
  const authenticatedUserId = req.user?.id;

  if (!authenticatedUserId) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }

  // Override the userId parameter with the authenticated user's ID
  req.params.userId = authenticatedUserId;
  next();
};
