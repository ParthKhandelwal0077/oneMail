# WebSocket Real-time Notifications - OneBox Email Aggregator

## 🔌 **Overview**

The OneBox Email Aggregator now includes **real-time WebSocket notifications** with **automatic email synchronization** that sends instant updates to connected clients whenever new emails are received through IMAP IDLE monitoring. This creates a seamless, real-time email experience with **multi-email account support**.

## 🚀 **Features**

### **Real-time Email Notifications**
- ✅ Instant notifications when new emails arrive
- ✅ AI categorization results included
- ✅ Full email metadata (subject, from, date, body)
- ✅ Elasticsearch indexing confirmation
- ✅ **Multi-email account support** - sync multiple Gmail accounts simultaneously

### **Automatic Email Synchronization**
- ✅ **Auto-start sync** when WebSocket client connects
- ✅ **Auto-stop sync** when WebSocket client disconnects
- ✅ Sync all user's email accounts automatically
- ✅ Individual email account management

### **Sync Status Updates**
- ✅ Real-time sync status changes (idle, syncing, error, stopped)
- ✅ Error notifications with detailed messages
- ✅ Connection health monitoring
- ✅ Per-email account status tracking

### **WebSocket Management**
- ✅ JWT-based authentication
- ✅ Heartbeat monitoring (30-second intervals)
- ✅ Automatic reconnection handling
- ✅ Connection statistics and monitoring

## 🔧 **Technical Implementation**

### **WebSocket Service Architecture**
```typescript
class WebSocketService {
  private wss: WebSocket.Server;
  private clients: Map<string, WebSocketClient>;
  private heartbeatInterval: NodeJS.Timeout;
}
```

### **Connection Flow**
```
1. Client connects with JWT token: ws://localhost:5001/ws?token=<jwt>
2. Server verifies JWT token
3. Server authenticates user
4. Connection established and stored
5. **Auto-start email sync for all user's email accounts**
6. Heartbeat monitoring starts
7. Real-time notifications begin
8. **Auto-stop email sync when client disconnects**
```

### **Message Types**
```typescript
// New email notification
{
  type: 'new_email',
  data: {
    email: EmailMessage,
    userId: string,
    timestamp: Date
  }
}

// Sync status update
{
  type: 'sync_status',
  data: {
    userId: string,
    status: 'idle' | 'syncing' | 'error' | 'stopped',
    email?: string,
    error?: string,
    timestamp: Date
  }
}
```

## 📡 **Integration with Email Sync**

### **Multi-Email Account Support**
The system now supports multiple Gmail accounts per user:

```typescript
// Data structure for multiple email accounts
const userClients: Map<string, Map<string, ImapClient>> = new Map(); // userId -> email -> client
const syncStatuses: Map<string, Map<string, SyncStatus>> = new Map(); // userId -> email -> status
```

### **Auto-Sync Integration**
When WebSocket client connects:

1. **Auto-Start Sync**:
   ```typescript
   // In webSocketService.ts
   private async startAutoSync(userId: string): Promise<void> {
     const tokens = await getUserTokens(userId);
     
     // Start sync for each email account
     for (const token of tokens) {
       await startSync(userId, token.email);
     }
   }
   ```

2. **Auto-Stop Sync**:
   ```typescript
   // When client disconnects
   private async stopAutoSync(userId: string): Promise<void> {
     await stopSync(userId); // Stops all email syncs for user
   }
   ```

### **IDLE Monitoring Integration**
When IMAP IDLE detects new emails for any email account:

1. **Email Processing**:
   ```typescript
   // In emailSyncService.ts
   client.on('exists', async (data) => {
     // Fetch new email
     const message = await client.fetchOne(`${data.count}`, {...});
     
     // Categorize with AI
     const category = await categorizeEmail(...);
     
     // Index in Elasticsearch
     await indexEmail(userId, email, folder, message, category);
     
     // Send real-time notification
     wsService.sendNewEmailNotification(userId, emailData);
   });
   ```

2. **Sync Status Updates**:
   ```typescript
   // When sync starts for specific email
   wsService.sendSyncStatusNotification(userId, 'syncing', email);
   
   // When IDLE monitoring begins
   wsService.sendSyncStatusNotification(userId, 'idle', email);
   
   // When errors occur
   wsService.sendSyncStatusNotification(userId, 'error', email, error.message);
   ```

## 🔗 **WebSocket Connection**

### **Connection URL**
```
ws://localhost:5001/ws?token=<jwt-access-token>
```

### **Authentication**
- JWT token required in URL parameter
- Token verified on connection
- User must exist in database
- Connection stored with user ID

### **Client Connection Example**
```javascript
const token = 'your-jwt-access-token';
const ws = new WebSocket(`ws://localhost:5001/ws?token=${token}`);

ws.onopen = function(event) {
  console.log('Connected to OneBox WebSocket');
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'new_email':
      console.log('New email:', data.data.email);
      break;
    case 'sync_status':
      console.log('Sync status:', data.data.status);
      break;
  }
};
```

## 📨 **Message Handling**

### **Client Message Types**
```javascript
// Ping/Pong for heartbeat
ws.send(JSON.stringify({
  type: 'ping',
  data: { message: 'Hello server' }
}));

// Subscribe to specific topics
ws.send(JSON.stringify({
  type: 'subscribe',
  data: { topics: ['emails', 'sync'] }
}));
```

### **Server Response Types**
```javascript
// Pong response
{
  type: 'pong',
  data: { timestamp: '2024-01-01T00:00:00.000Z' }
}

// New email notification
{
  type: 'new_email',
  data: {
    email: {
      userId: 'user-123',
      uid: 'email-uid',
      subject: 'Meeting Tomorrow',
      from: 'colleague@company.com',
      date: '2024-01-01T00:00:00.000Z',
      body: 'Email content...',
      folder: 'INBOX',
      email: 'user@gmail.com',
      category: 'Meeting Booked',
      categoryConfidence: 0.9,
      categorizedAt: '2024-01-01T00:00:00.000Z'
    },
    userId: 'user-123',
    timestamp: '2024-01-01T00:00:00.000Z'
  }
}

// Sync status update
{
  type: 'sync_status',
  data: {
    userId: 'user-123',
    status: 'idle',
    email: 'user@gmail.com',
    timestamp: '2024-01-01T00:00:00.000Z'
  }
}
```

## 🛠️ **API Endpoints**

### **Multi-Email Sync Routes**
All routes require authentication (`Authorization: Bearer <token>`)

#### **Start Email Sync (RESTful)**
```http
POST /api/sync/start/:userId/:email
```
**Example:**
```bash
curl -X POST http://localhost:5001/api/sync/start/user-123/user@gmail.com \
  -H "Authorization: Bearer <jwt-token>"
```

#### **Stop Email Sync**
```http
POST /api/sync/stop/:userId
Content-Type: application/json

{
  "email": "user@gmail.com"  // Optional: stop specific email, omit to stop all
}
```

#### **Get Sync Status**
```http
GET /api/sync/status/:userId?email=user@gmail.com
```
**Response for specific email:**
```json
{
  "success": true,
  "data": {
    "status": {
      "userId": "user-123",
      "email": "user@gmail.com",
      "status": "idle",
      "lastSync": "2024-01-01T00:00:00.000Z"
    },
    "isArray": false
  }
}
```

**Response for all emails (no email parameter):**
```json
{
  "success": true,
  "data": {
    "status": [
      {
        "userId": "user-123",
        "email": "user@gmail.com",
        "status": "idle",
        "lastSync": "2024-01-01T00:00:00.000Z"
      },
      {
        "userId": "user-123",
        "email": "work@gmail.com",
        "status": "syncing",
        "lastSync": "2024-01-01T00:00:00.000Z"
      }
    ],
    "isArray": true
  }
}
```

#### **Get Active Email Accounts**
```http
GET /api/sync/clients
```
**Response:**
```json
{
  "success": true,
  "data": {
    "activeClients": ["user-1", "user-2"],
    "activeEmailAccounts": [
      { "userId": "user-1", "email": "user1@gmail.com" },
      { "userId": "user-1", "email": "user1-work@gmail.com" },
      { "userId": "user-2", "email": "user2@gmail.com" }
    ],
    "clientCount": 2,
    "emailAccountCount": 3
  }
}
```

## 🧪 **Testing**

### **Test Client**
A complete HTML test client is available at:
```
http://localhost:5001/websocket-test.html
```

**Features:**
- ✅ JWT token input
- ✅ Connection status display
- ✅ Real-time message display
- ✅ Statistics tracking
- ✅ Test message sending
- ✅ Message filtering by type

### **Manual Testing**

#### **1. Get JWT Token**
```bash
# Register user
curl -X POST http://localhost:5001/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "password": "TestPassword123"}'

# Login to get token
curl -X POST http://localhost:5001/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "password": "TestPassword123"}'
```

#### **2. Connect WebSocket**
```javascript
const token = 'your-jwt-token';
const ws = new WebSocket(`ws://localhost:5001/ws?token=${token}`);
```

#### **3. Start Email Sync (Manual)**
```bash
# Start sync for specific email account
curl -X POST http://localhost:5001/api/sync/start/user-123/user@gmail.com \
  -H "Authorization: Bearer <jwt-token>"

# Start sync for another email account
curl -X POST http://localhost:5001/api/sync/start/user-123/work@gmail.com \
  -H "Authorization: Bearer <jwt-token>"
```

#### **4. Monitor Real-time Notifications**
The WebSocket will receive notifications for:
- New emails from any connected email account (after AI categorization and Elasticsearch indexing)
- Sync status changes for each email account
- Error notifications per email account
- **Automatic sync start/stop** when WebSocket connects/disconnects

## 🔒 **Security Features**

### **Authentication**
- ✅ JWT token verification on connection
- ✅ User existence validation
- ✅ Token expiration handling

### **Connection Management**
- ✅ Automatic cleanup of dead connections
- ✅ Heartbeat monitoring (30-second intervals)
- ✅ Graceful disconnection handling

### **Message Validation**
- ✅ JSON message parsing
- ✅ Type validation
- ✅ Error handling for malformed messages

## 📊 **Monitoring and Statistics**

### **Connection Statistics**
- Total active connections
- Connected user IDs
- Message counts per user
- Connection duration tracking

### **Health Monitoring**
- Heartbeat pings every 30 seconds
- Automatic disconnection of inactive clients
- Error logging and reporting

## 🚀 **Usage Examples**

### **Frontend Integration**
```javascript
class OneBoxWebSocket {
  constructor(token) {
    this.token = token;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    this.ws = new WebSocket(`ws://localhost:5001/ws?token=${this.token}`);
    
    this.ws.onopen = () => {
      console.log('Connected to OneBox');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      this.handleReconnect();
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case 'new_email':
        this.displayNewEmail(data.data.email);
        break;
      case 'sync_status':
        this.updateSyncStatus(data.data.status);
        break;
    }
  }

  displayNewEmail(email) {
    // Show notification
    this.showNotification(`New email: ${email.subject}`);
    
    // Update email list
    this.addEmailToList(email);
    
    // Update unread count
    this.incrementUnreadCount();
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 5000);
    }
  }
}

// Usage
const wsClient = new OneBoxWebSocket('your-jwt-token');
wsClient.connect();
```

### **React Integration**
```jsx
import { useEffect, useState } from 'react';

function useOneBoxWebSocket(token) {
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!token) return;

    const websocket = new WebSocket(`ws://localhost:5001/ws?token=${token}`);
    
    websocket.onopen = () => {
      setIsConnected(true);
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, data]);
    };

    websocket.onclose = () => {
      setIsConnected(false);
      setWs(null);
    };

    return () => websocket.close();
  }, [token]);

  return { ws, isConnected, messages };
}

// Component usage
function EmailDashboard({ token }) {
  const { ws, isConnected, messages } = useOneBoxWebSocket(token);
  
  const newEmails = messages.filter(m => m.type === 'new_email');
  
  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>New Emails: {newEmails.length}</div>
      {newEmails.map(email => (
        <div key={email.data.email.uid}>
          {email.data.email.subject}
        </div>
      ))}
    </div>
  );
}
```

## 🎯 **Benefits**

### **Real-time Experience**
- ✅ Instant email notifications from multiple accounts
- ✅ Live sync status updates per email account
- ✅ No polling required
- ✅ Reduced server load
- ✅ **Automatic sync management** - no manual intervention needed

### **Enhanced User Experience**
- ✅ Immediate feedback from all email accounts
- ✅ Live updates across multiple Gmail accounts
- ✅ Better responsiveness
- ✅ Modern web app feel
- ✅ **Seamless multi-account management**

### **Scalability**
- ✅ Efficient WebSocket connections
- ✅ Heartbeat monitoring
- ✅ Automatic cleanup
- ✅ Connection pooling
- ✅ **Multi-email account support** without performance impact

The WebSocket real-time notifications with **multi-email account support** and **automatic synchronization** transforms the OneBox Email Aggregator into a truly modern, real-time email management platform! 🚀✨
