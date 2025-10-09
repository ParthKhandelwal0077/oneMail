import { ImapFlow } from 'imapflow';
import { getAccessToken, getUserTokens } from './authService';
import { indexEmail, checkEmailExists } from './elasticsearchService';
import { categorizeEmail } from './aiCategorizationService';
import { EmailCategory, ImapClient, SyncStatus } from '../types';

// Store active IMAP clients for each user
const userClients: Map<string, ImapClient> = new Map();
const syncStatuses: Map<string, SyncStatus> = new Map();

export async function fetchRecentEmails(userId: string, email: string): Promise<ImapFlow> {
  try {
    const accessToken = await getAccessToken(userId, email);
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { 
        user: email, 
        accessToken 
      },
      logger: false // Disable logging for cleaner output
    });

    await client.connect();
    console.log(`🔗 Connected to IMAP for ${userId} (${email})`);
    
    // Open INBOX
    const mailbox = await client.mailboxOpen('INBOX');
    const folder = mailbox.path;

    // Get emails from yesterday (24 hours ago)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log(`📅 Fetching emails since: ${yesterday.toISOString()}`);
    
    const messages = await client.fetch(
      { since: yesterday },
      { envelope: true, source: true, uid: true }
    );

    let emailCount = 0;
    console.log(`📥 Fetching recent emails for ${userId} (${email}):`);
    
    for await (const message of messages) {
      try {
        const emailDate = message.envelope?.date || new Date();
        const emailData = {
          userId,
          uid: message.uid,
          subject: message.envelope?.subject || 'No Subject',
          from: message.envelope?.from?.[0]?.address || 'unknown@example.com',
          date: emailDate
        };
        
        // Validate email date is within our desired range
        if (emailDate < yesterday) {
          console.log(`  ⏭️  Skipping email ${emailData.uid}: date ${emailDate.toISOString()} is before our cutoff`);
          continue;
        }
        
        console.log(`  📧 ${emailData.uid}: ${emailData.subject} from ${emailData.from} (${emailDate.toISOString()})`);
        
        // Check if email already exists in Elasticsearch
        const emailId = `${userId}-${email}-${message.uid}`;
        const existingEmail = await checkEmailExists(emailId);
        
        if (existingEmail) {
          console.log(`  ⏭️  Skipping email ${emailData.uid}: already indexed`);
          continue;
        }
        
        // Categorize email using AI
        let category = 'Uncategorized';
        
        try {
          const categorizationResult = await categorizeEmail(
            message.envelope?.subject || 'No Subject',
            message.source?.toString() || '',
            message.envelope?.from?.[0]?.address
          );
          category = categorizationResult.category;
          console.log(`  🤖 Categorized as: ${category}`);
        } catch (error) {
          console.error(`  ❌ Failed to categorize email ${message.uid}:`, error);
        }
        
        await indexEmail(userId, email, folder, {
          ...message,
          body: message.source?.toString() || ''
        }, category as EmailCategory);
        
        emailCount++;
      } catch (error) {
        console.error(`  ❌ Failed to process email ${message.uid}:`, error);
      }
    }
    
    console.log(`✅ Fetched and indexed ${emailCount} emails for ${userId}`);
    return client;
  } catch (error) {
    console.error(`❌ Fetch error for ${userId} (${email}):`, error);
    throw error;
  }
}

export async function startIdleMonitoring(userId: string, email: string, client: ImapFlow): Promise<void> {
  try {
    await client.mailboxOpen('INBOX');
    const folder = 'INBOX';
    
    console.log(`🔄 Starting IDLE monitoring for ${userId} (${email})`);
    
    // Update sync status
    syncStatuses.set(userId, {
      userId,
      email,
      status: 'idle',
      lastSync: new Date()
    });

    const idleStarted = await client.idle();

    // Handle new emails
    client.on('exists', async (data) => {
      console.log(`📬 New email detected for ${userId}: ${data.count} messages`);
      
      try {
        // Fetch the latest message
        const message = await client.fetchOne(`${data.count}`, { 
          envelope: true, 
          source: true, 
          uid: true 
        });
        
        if (message) {
          const emailData = {
            userId,
            uid: message.uid,
            subject: message.envelope?.subject || 'No Subject',
            from: message.envelope?.from?.[0]?.address || 'unknown@example.com',
            date: message.envelope?.date || new Date()
          };
          
          console.log(`  📧 New: ${emailData.uid}: ${emailData.subject} from ${emailData.from}`);
          
          // Check if email already exists in Elasticsearch
          const emailId = `${userId}-${email}-${message.uid}`;
          const existingEmail = await checkEmailExists(emailId);
          
          if (existingEmail) {
            console.log(`  ⏭️  Skipping new email ${emailData.uid}: already indexed`);
            return;
          }
          
          // Categorize new email using AI
          let category = 'Uncategorized';
          
          try {
            const categorizationResult = await categorizeEmail(
              message.envelope?.subject || 'No Subject',
              message.source?.toString() || '',
              message.envelope?.from?.[0]?.address
            );
            category = categorizationResult.category;
            
            console.log(`  🤖 New email categorized as: ${category}`);
          } catch (error) {
            console.error(`  ❌ Failed to categorize new email ${message.uid}:`, error);
          }
          
          await indexEmail(userId, email, folder, {
            ...message,
            body: message.source?.toString() || ''
          }, category as EmailCategory);
        }
      } catch (error) {
        console.error(`  ❌ Failed to process new email for ${userId}:`, error);
      }
    });

    // Handle errors
    client.on('error', async (error) => {
      console.error(`❌ IDLE error for ${userId} (${email}):`, error);
      
      // Update sync status
      syncStatuses.set(userId, {
        userId,
        email,
        status: 'error',
        error: error.message,
        lastSync: new Date()
      });
      
      // Close IDLE connection and attempt reconnection
      try {
        client.close();
      } catch (closeError) {
        console.error('Error closing IDLE connection:', closeError);
      }
      
      // Attempt to restart sync after delay
      setTimeout(() => {
        console.log(`🔄 Attempting to restart sync for ${userId}...`);
        startSync(userId, email).catch(err => 
          console.error(`❌ Failed to restart sync for ${userId}:`, err)
        );
      }, 5000);
    });

    // Store client reference
    userClients.set(userId, { client, lock: idleStarted });
    
  } catch (error) {
    console.error(`❌ Failed to start IDLE monitoring for ${userId}:`, error);
    throw error;
  }
}

export async function startSync(userId: string, email: string): Promise<void> {
  try {
    console.log(`🚀 Starting full sync for ${userId} (${email})`);
    
    // Update sync status
    syncStatuses.set(userId, {
      userId,
      email,
      status: 'syncing',
      lastSync: new Date()
    });

    // Check if user has valid tokens for this email
    const tokens = getUserTokens(userId);
    if (!tokens || tokens.length === 0) {
      throw new Error(`No authorization tokens found for user ${userId}`);
    }
    
    const emailToken = tokens.find(token => token.email === email);
    if (!emailToken) {
      throw new Error(`No authorization token found for email ${email} for user ${userId}`);
    }

    // Fetch recent emails and start monitoring
    const client = await fetchRecentEmails(userId, email);
    await startIdleMonitoring(userId, email, client);
    
    console.log(`✅ Sync started successfully for ${userId} (${email})`);
  } catch (error) {
    console.error(`❌ Full sync failed for ${userId} (${email}):`, error);
    
    // Update sync status with error
    syncStatuses.set(userId, {
      userId,
      email,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastSync: new Date()
    });
    
    throw error;
  }
}

export async function stopSync(userId: string): Promise<void> {
  try {
    console.log(`🛑 Stopping sync for ${userId}`);
    
    const clientData = userClients.get(userId);
    if (clientData) {
      // Close IDLE connection
      try {
        clientData.client.close();
      } catch (error) {
        console.error('Error closing IDLE connection:', error);
      }
      
      // Close client connection
      try {
        await clientData.client.logout();
      } catch (error) {
        console.error('Error closing IMAP connection:', error);
      }
      
      // Remove from active clients
      userClients.delete(userId);
    }
    
    // Update sync status
    syncStatuses.set(userId, {
      userId,
      email: syncStatuses.get(userId)?.email || 'unknown',
      status: 'stopped',
      lastSync: new Date()
    });
    
    console.log(`✅ Sync stopped for ${userId}`);
  } catch (error) {
    console.error(`❌ Error stopping sync for ${userId}:`, error);
    throw error;
  }
}

export async function getSyncStatus(userId: string): Promise<SyncStatus | null> {
  return syncStatuses.get(userId) || null;
}

export async function getAllSyncStatuses(): Promise<SyncStatus[]> {
  return Array.from(syncStatuses.values());
}

export async function getActiveClients(): Promise<string[]> {
  return Array.from(userClients.keys());
}

export async function restartAllSyncs(): Promise<void> {
  console.log('🔄 Restarting all active syncs...');
  
  for (const [userId, clientData] of userClients) {
    try {
      const syncStatus = syncStatuses.get(userId);
      if (syncStatus && syncStatus.email) {
        await stopSync(userId);
        // Wait a bit before restarting
        setTimeout(async () => {
          try {
            await startSync(userId, syncStatus.email);
          } catch (error) {
            console.error(`Failed to restart sync for ${userId}:`, error);
          }
        }, 2000);
      }
    } catch (error) {
      console.error(`Error restarting sync for ${userId}:`, error);
    }
  }
}

// Graceful shutdown handler
export async function gracefulShutdown(): Promise<void> {
  console.log('🛑 Gracefully shutting down email sync services...');
  
  for (const userId of userClients.keys()) {
    try {
      await stopSync(userId);
    } catch (error) {
      console.error(`Error stopping sync for ${userId} during shutdown:`, error);
    }
  }
  
  console.log('✅ All email sync services stopped');
}
