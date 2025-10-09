export interface UserTokens {
  email: string;
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
}

export interface ImapClient {
  client: import('imapflow').ImapFlow;
  lock: any;
}

// Email category types
export type EmailCategory = 'Interested' | 'Meeting Booked' | 'Not Interested' | 'Spam' | 'Out of Office' | 'Uncategorized';

export interface EmailMessage {
  userId: string;
  uid: string;
  subject: string;
  from: string;
  date: Date;
  body: string;
  folder: string;
  email: string;
  isRead?: boolean;
  isStarred?: boolean;
  category: EmailCategory;
  categorizedAt?: Date;
}

export interface SearchQuery {
  query?: string;
  folder?: string;
  email?: string;
  from?: string;
  dateFrom?: Date;
  dateTo?: Date;
  category?: EmailCategory;
}

export interface SyncStatus {
  userId: string;
  email: string;
  status: 'idle' | 'syncing' | 'error' | 'stopped';
  lastSync?: Date;
  error?: string;
}

export interface OAuthCallback {
  code: string;
  state: string;
  userId?: string;
}
