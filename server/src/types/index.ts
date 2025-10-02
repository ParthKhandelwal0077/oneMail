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
}

export interface SearchQuery {
  query?: string;
  folder?: string;
  email?: string;
  dateFrom?: Date;
  dateTo?: Date;
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
