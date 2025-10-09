import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { asyncHandler } from '../middleware/errorHandler';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  phoneNumber: string;
  password: string;
}

export interface SignupCredentials {
  phoneNumber: string;
  password: string;
}

export interface DecodedToken {
  userId: string;
  phoneNumber: string;
  iat: number;
  exp: number;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(userId: string, phoneNumber: string): string {
  return (jwt.sign as any)(
    { userId, phoneNumber },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(userId: string, phoneNumber: string): string {
  return (jwt.sign as any)(
    { userId, phoneNumber, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch (error) {
    return null;
  }
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Register a new user
 */
export async function registerUser(credentials: SignupCredentials): Promise<{ user: any; tokens: AuthTokens }> {
  const { phoneNumber, password } = credentials;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { phoneNumber }
  } as any);

  if (existingUser) {
    throw new Error('User with this phone number already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      phoneNumber,
      password: hashedPassword
    } as any,
    select: {
      id: true,
      phoneNumber: true,
      createdAt: true,
      updatedAt: true
    } as any
  });

  // Generate tokens
  const accessToken = generateAccessToken((user as any).id, (user as any).phoneNumber);
  const refreshToken = generateRefreshToken((user as any).id, (user as any).phoneNumber);

  return {
    user,
    tokens: {
      accessToken,
      refreshToken
    }
  };
}

/**
 * Login user
 */
export async function loginUser(credentials: LoginCredentials): Promise<{ user: any; tokens: AuthTokens }> {
  const { phoneNumber, password } = credentials;

  // Find user
  const user = await prisma.user.findUnique({
    where: { phoneNumber }
  } as any);

  if (!user) {
    throw new Error('Invalid phone number or password');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, (user as any).password);

  if (!isPasswordValid) {
    throw new Error('Invalid phone number or password');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, (user as any).phoneNumber);
  const refreshToken = generateRefreshToken(user.id, (user as any).phoneNumber);

  return {
    user: {
      id: user.id,
      phoneNumber: (user as any).phoneNumber,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    },
    tokens: {
      accessToken,
      refreshToken
    }
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  // Verify refresh token
  const decoded = verifyToken(refreshToken);
  
  if (!decoded || (decoded as any).type !== 'refresh') {
    throw new Error('Invalid refresh token');
  }

  // Check if user still exists
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken(user.id, (user as any).phoneNumber);
  const newRefreshToken = generateRefreshToken(user.id, (user as any).phoneNumber);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phoneNumber: true,
      createdAt: true,
      updatedAt: true,
      emailAccounts: {
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true
        }
      }
    } as any
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, updates: { phoneNumber?: string; slackWebhookUrl?: string; customWebhookUrl?: string }): Promise<any> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: updates as any,
    select: {
      id: true,
      phoneNumber: true,
      slackWebhookUrl: true,
      customWebhookUrl: true,
      createdAt: true,
      updatedAt: true
    } as any
  });

  return user;
}

/**
 * Change user password
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await comparePassword(currentPassword, (user as any).password);

  if (!isCurrentPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const hashedNewPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword } as any
  });
}

/**
 * Delete user account
 */
export async function deleteUserAccount(userId: string, password: string): Promise<void> {
  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, (user as any).password);

  if (!isPasswordValid) {
    throw new Error('Password is incorrect');
  }

  // Delete user (cascade will delete email accounts)
  await prisma.user.delete({
    where: { id: userId }
  });
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // Basic phone number validation (can be customized based on requirements)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }

  return { isValid: true };
}

// Note: Prisma connection is managed globally in config/prisma.ts
