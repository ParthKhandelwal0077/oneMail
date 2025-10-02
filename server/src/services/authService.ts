import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
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

// In-memory storage (replace with DB in production)
const userTokens: Map<string, UserTokens> = new Map();

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
    
    const userData: UserTokens = {
      email,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date!
    };
    userTokens.set(userId, userData);
    return userData;
  } catch (error) {
    console.error('Token exchange failed:', error);
    throw new Error('Failed to exchange authorization code for tokens');
  }
}

export async function getAccessToken(userId: string): Promise<string> {
  const tokens = userTokens.get(userId);
  if (!tokens) throw new Error(`No tokens for user ${userId}`);

  oAuth2Client.setCredentials(tokens);
  if (tokens.expiry_date <= Date.now()) {
    try {
      const { credentials } = await oAuth2Client.refreshAccessToken();
      const updatedTokens: UserTokens = {
        ...tokens,
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || tokens.refresh_token,
        expiry_date: credentials.expiry_date!
      };
      userTokens.set(userId, updatedTokens);
      oAuth2Client.setCredentials(updatedTokens);
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Failed to refresh access token');
    }
  }
  return oAuth2Client.credentials.access_token!;
}

export function getUserTokens(userId: string): UserTokens | undefined {
  return userTokens.get(userId);
}

export function deleteUserTokens(userId: string): boolean {
  return userTokens.delete(userId);
}

export function getAllUserIds(): string[] {
  return Array.from(userTokens.keys());
}
