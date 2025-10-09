import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserById } from '../services/userAuthService';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phoneNumber: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(403).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid or expired'
      });
    }

    // Check if user still exists
    try {
      const user = await getUserById(decoded.userId);
      req.user = {
        id: user.id,
        phoneNumber: user.phoneNumber
      };
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'User not found',
        message: 'The user associated with this token no longer exists'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      
      if (decoded) {
        try {
          const user = await getUserById(decoded.userId);
          req.user = {
            id: user.id,
            phoneNumber: user.phoneNumber
          };
        } catch (error) {
          // User not found, but continue without authentication
          console.warn('User not found for optional auth:', error);
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue even if there's an error
  }
};

/**
 * Middleware to check if user is authenticated (for protected routes)
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'This route requires authentication'
    });
  }
  next();
};

/**
 * Middleware to validate request body for authentication
 */
export const validateAuthRequest = (req: Request, res: Response, next: NextFunction) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Phone number and password are required'
    });
  }

  next();
};

/**
 * Middleware to validate signup request
 */
export const validateSignupRequest = (req: Request, res: Response, next: NextFunction) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Phone number and password are required'
    });
  }

  // Validate phone number format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number',
      message: 'Please provide a valid phone number'
    });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Weak password',
      message: 'Password must be at least 8 characters long'
    });
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return res.status(400).json({
      success: false,
      error: 'Weak password',
      message: 'Password must contain at least one lowercase letter'
    });
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return res.status(400).json({
      success: false,
      error: 'Weak password',
      message: 'Password must contain at least one uppercase letter'
    });
  }

  if (!/(?=.*\d)/.test(password)) {
    return res.status(400).json({
      success: false,
      error: 'Weak password',
      message: 'Password must contain at least one number'
    });
  }

  next();
};

/**
 * Middleware to validate refresh token request
 */
export const validateRefreshTokenRequest = (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Missing refresh token',
      message: 'Refresh token is required'
    });
  }

  next();
};

/**
 * Middleware to validate password change request
 */
export const validatePasswordChangeRequest = (req: Request, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Current password and new password are required'
    });
  }

  // Validate new password strength
  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Weak password',
      message: 'New password must be at least 8 characters long'
    });
  }

  if (!/(?=.*[a-z])/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      error: 'Weak password',
      message: 'New password must contain at least one lowercase letter'
    });
  }

  if (!/(?=.*[A-Z])/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      error: 'Weak password',
      message: 'New password must contain at least one uppercase letter'
    });
  }

  if (!/(?=.*\d)/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      error: 'Weak password',
      message: 'New password must contain at least one number'
    });
  }

  next();
};
