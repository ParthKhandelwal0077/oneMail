import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import prisma from '../config/prisma';
import { UserTokens } from '../types';

// Load Google credentials
let credentials: any;
try {
  const credentialsPath = path.join(__dirname, '../../credentials.json');
  if (fs.existsSync(credentialsPath)) {
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  } else {
    // Fallback to environment variables or default structure
    credentials = {
      web: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET ,
        redirect_uris: [
          process.env.GOOGLE_REDIRECT_URI 
        ]
      }
    };
  }
} catch (error) {
  console.error('Failed to load credentials:', error);
  credentials = {
    web: {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET ,
      redirect_uris: [
        process.env.GOOGLE_REDIRECT_URI
      ]
    }
  };
}

const { client_id, client_secret, redirect_uris } = credentials.web || credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const SCOPES = ['https://mail.google.com/'];

export function getAuthUrl(userId: string): string {
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId,
    prompt: 'consent'
  });
}

export async function handleCallback(code: string, userId: string): Promise<UserTokens> {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    
    // Set credentials to fetch user email
    oAuth2Client.setCredentials(tokens);
    
    // Get user email via Gmail API
    let email = `user-${userId}`;
    try {
      const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      email = profile.data.emailAddress || `user-${userId}`;
    } catch (emailError) {
      console.warn('Could not fetch user email, using fallback:', emailError);
    }
    
    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if email account already exists for this user
    const existingEmailAccount = await prisma.emailAccount.findFirst({
      where: {
        userId: userId,
        email: email
      }
    });

    if (existingEmailAccount) {
      // Update existing email account
      await prisma.emailAccount.update({
        where: { id: existingEmailAccount.id },
        data: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || existingEmailAccount.refreshToken,
          expiryDate: new Date(tokens.expiry_date!)
        }
      });
    } else {
      // Create new email account
      await prisma.emailAccount.create({
        data: {
          userId: userId,
          email: email,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || null,
          expiryDate: new Date(tokens.expiry_date!)
        }
      });
    }
    
    const userData: UserTokens = {
      email,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date!
    };
    
    return userData;
  } catch (error) {
    console.error('Token exchange failed:', error);
    throw new Error('Failed to exchange authorization code for tokens');
  }
}

export async function getAccessToken(userId: string, email?: string): Promise<string> {
  // Get email accounts for user from database
  const emailAccounts = await prisma.emailAccount.findMany({
    where: { userId: userId }
  });

  if (!emailAccounts || emailAccounts.length === 0) {
    throw new Error(`No tokens for user ${userId}`);
  }

  // If email is specified, find the specific account
  let targetAccount = email 
    ? emailAccounts.find(account => account.email === email)
    : emailAccounts[0]; // Default to first account if no email specified

  if (!targetAccount) {
    throw new Error(`No tokens found for email ${email} for user ${userId}`);
  }

  // Check if token is expired and refresh if needed
  if (targetAccount.expiryDate <= new Date()) {
    if (!targetAccount.refreshToken) {
      throw new Error('Token expired and no refresh token available');
    }

    try {
      oAuth2Client.setCredentials({
        access_token: targetAccount.accessToken,
        refresh_token: targetAccount.refreshToken
      });

      const { credentials } = await oAuth2Client.refreshAccessToken();
      
      // Update the token in database
      await prisma.emailAccount.update({
        where: { id: targetAccount.id },
        data: {
          accessToken: credentials.access_token!,
          refreshToken: credentials.refresh_token || targetAccount.refreshToken,
          expiryDate: new Date(credentials.expiry_date!)
        }
      });

      targetAccount.accessToken = credentials.access_token!;
      targetAccount.refreshToken = credentials.refresh_token || targetAccount.refreshToken;
      targetAccount.expiryDate = new Date(credentials.expiry_date!);
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  return targetAccount.accessToken;
}

export async function getUserTokens(userId: string): Promise<UserTokens[]> {
  const emailAccounts = await prisma.emailAccount.findMany({
    where: { userId: userId }
  });

  return emailAccounts.map(account => ({
    email: account.email,
    access_token: account.accessToken,
    refresh_token: account.refreshToken || undefined,
    expiry_date: account.expiryDate.getTime()
  }));
}

export async function getUserTokenByEmail(userId: string, email: string): Promise<UserTokens | undefined> {
  const emailAccount = await prisma.emailAccount.findFirst({
    where: {
      userId: userId,
      email: email
    }
  });

  if (!emailAccount) {
    return undefined;
  }

  return {
    email: emailAccount.email,
    access_token: emailAccount.accessToken,
    refresh_token: emailAccount.refreshToken || undefined,
    expiry_date: emailAccount.expiryDate.getTime()
  };
}

export async function deleteUserTokens(userId: string): Promise<boolean> {
  try {
    await prisma.emailAccount.deleteMany({
      where: { userId: userId }
    });
    return true;
  } catch (error) {
    console.error('Failed to delete user tokens:', error);
    return false;
  }
}

export async function deleteUserTokenByEmail(userId: string, email: string): Promise<boolean> {
  try {
    const result = await prisma.emailAccount.deleteMany({
      where: {
        userId: userId,
        email: email
      }
    });
    return result.count > 0;
  } catch (error) {
    console.error('Failed to delete email token:', error);
    return false;
  }
}

export async function getAllUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    select: { id: true }
  });
  return users.map(user => user.id);
}

export async function getAllUserEmails(userId: string): Promise<string[]> {
  const emailAccounts = await prisma.emailAccount.findMany({
    where: { userId: userId },
    select: { email: true }
  });
  return emailAccounts.map(account => account.email);
}
