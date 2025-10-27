# OneMail API Reference

Complete API reference for integrating the OneMail email aggregation service with your frontend application.

---

## 📚 Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Account Management](#account-management)
3. [Quick Start Examples](#quick-start-examples)
4. [Response Formats](#response-formats)

---

## Authentication Endpoints

### 1. Get OAuth URL for Adding Email Account

**Endpoint:** `GET /api/auth/gmail`  
**Authentication:** Required (Bearer Token)

#### Request
```typescript
fetch('/api/auth/gmail', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/auth?...",
    "userId": "user-123",
    "message": "Redirect user to this URL to authenticate with Gmail"
  }
}
```

#### Error Response (401)
```json
{
  "success": false,
  "error": "User not authenticated",
  "message": "Please login first to get Gmail authentication URL"
}
```

---

### 2. OAuth Callback Handler

**Endpoint:** `GET /api/auth/gmail/callback?code=<code>&state=<userId>`  
**Authentication:** Not required (public route)

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Gmail authentication successful",
  "data": {
    "userId": "user-123",
    "email": "user@gmail.com",
    "hasRefreshToken": true,
    "nextStep": "Start email synchronization"
  }
}
```

#### Error Responses
```json
// 400 Bad Request
{
  "success": false,
  "error": "Missing authorization code or user ID",
  "message": "Both code and state parameters are required"
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Authentication failed",
  "message": "Failed to exchange authorization code for tokens"
}
```

---

## Account Management

### 3. Get All Attached Email Accounts

**Endpoint:** `GET /api/auth/status/:userId`  
**Authentication:** Required (Bearer Token)

#### Request
```typescript
fetch(`/api/auth/status/${userId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "emails": [
      {
        "email": "user@gmail.com",
        "hasRefreshToken": true,
        "tokenExpiry": "2024-12-31T23:59:59.000Z"
      },
      {
        "email": "work@company.com",
        "hasRefreshToken": true,
        "tokenExpiry": "2024-12-15T12:00:00.000Z"
      }
    ],
    "isAuthenticated": true,
    "totalAccounts": 2
  }
}
```

#### Error Responses
```json
// 404 Not Found
{
  "success": false,
  "error": "No authentication found",
  "message": "User needs to authenticate with Gmail first"
}

// 400 Bad Request
{
  "success": false,
  "error": "User ID is required"
}

// 403 Forbidden
{
  "success": false,
  "error": "Access denied",
  "message": "You don't have permission to access this resource"
}
```

---

### 4. Get Email Addresses Only

**Endpoint:** `GET /api/auth/emails/:userId`  
**Authentication:** Required (Bearer Token)

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "emails": [
      "user@gmail.com",
      "work@company.com"
    ],
    "count": 2
  }
}
```

---

### 5. Revoke All Email Accounts

**Endpoint:** `DELETE /api/auth/revoke/:userId`  
**Authentication:** Required (Bearer Token)

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Authentication revoked successfully",
  "data": {
    "userId": "user-123",
    "revoked": true
  }
}
```

---

### 6. Revoke Specific Email Account

**Endpoint:** `DELETE /api/auth/revoke/:userId/:email`  
**Authentication:** Required (Bearer Token)

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Authentication revoked successfully for user@gmail.com",
  "data": {
    "userId": "user-123",
    "email": "user@gmail.com",
    "revoked": true
  }
}
```

---

## Email Synchronization

### 7. Start Email Sync

**Endpoint:** `POST /api/sync/start/:userId/:email`  
**Authentication:** Required (Bearer Token)

#### Request
```typescript
fetch(`/api/sync/start/${userId}/${email}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Email synchronization started successfully",
  "data": {
    "userId": "user-123",
    "email": "user@gmail.com",
    "status": "syncing",
    "startedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses
```json
// 400 Bad Request - Missing email
{
  "success": false,
  "error": "Email is required",
  "message": "Please specify which email account to sync"
}

// 401 Unauthorized - User not authenticated
{
  "success": false,
  "error": "User not authenticated",
  "message": "User needs to authenticate with Gmail first"
}

// 404 Not Found - Email doesn't exist
{
  "success": false,
  "error": "Email not found",
  "message": "No authentication found for email user@gmail.com. Available emails: other@gmail.com"
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Failed to start email synchronization",
  "message": "Connection error"
}
```

---

### 8. Stop Email Sync

**Endpoint:** `POST /api/sync/stop/:userId`  
**Authentication:** Required (Bearer Token)

#### Request
```typescript
// Stop all syncs for user
fetch(`/api/sync/stop/${userId}`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
})

// Stop specific email sync
fetch(`/api/sync/stop/${userId}`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ email: 'user@gmail.com' })
})
```

#### Success Response (200 OK) - Stop All
```json
{
  "success": true,
  "message": "All email synchronizations stopped",
  "data": {
    "userId": "user-123",
    "status": "stopped",
    "stoppedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

#### Success Response (200 OK) - Stop Specific
```json
{
  "success": true,
  "message": "Email synchronization stopped for user@gmail.com",
  "data": {
    "userId": "user-123",
    "email": "user@gmail.com",
    "status": "stopped",
    "stoppedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

---

### 9. Get Sync Status

**Endpoint:** `GET /api/sync/status/:userId?email=<email>`  
**Authentication:** Required (Bearer Token)  
**Query Parameter:** `email` (optional) - Get status for specific email

#### Request
```typescript
// Get all email sync statuses for user
fetch(`/api/sync/status/${userId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Get specific email sync status
fetch(`/api/sync/status/${userId}?email=user@gmail.com`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

#### Success Response (200 OK) - Single Status
```json
{
  "success": true,
  "data": {
    "status": {
      "userId": "user-123",
      "email": "user@gmail.com",
      "status": "syncing",
      "lastSync": "2024-01-15T10:30:00.000Z"
    },
    "isArray": false
  }
}
```

#### Success Response (200 OK) - Multiple Statuses
```json
{
  "success": true,
  "data": {
    "status": [
      {
        "userId": "user-123",
        "email": "user@gmail.com",
        "status": "syncing",
        "lastSync": "2024-01-15T10:30:00.000Z"
      },
      {
        "userId": "user-123",
        "email": "work@company.com",
        "status": "idle",
        "lastSync": "2024-01-15T09:00:00.000Z"
      }
    ],
    "isArray": true
  }
}
```

#### Error Responses
```json
// 404 Not Found
{
  "success": false,
  "error": "No sync status found",
  "message": "User has not started email synchronization"
}

// 400 Bad Request
{
  "success": false,
  "error": "User ID is required"
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Failed to retrieve sync status",
  "message": "Database error"
}
```

---

### 10. Health Check (Public)

**Endpoint:** `GET /api/sync/health`  
**Authentication:** Not required

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:40:00.000Z",
    "services": {
      "sync": {
        "total": 5,
        "active": 3,
        "errors": 1,
        "stopped": 1
      },
      "clients": {
        "connected": 3,
        "emailAccounts": 4
      }
    }
  }
}
```

#### Sync Status Types
- `"idle"` - Connected and ready to sync
- `"syncing"` - Currently fetching emails  
- `"error"` - Connection error occurred
- `"stopped"` - Sync stopped by user

---

### Sync Status Object
```typescript
interface SyncStatus {
  userId: string;
  email: string;
  status: 'idle' | 'syncing' | 'error' | 'stopped';
  lastSync?: Date;
  error?: string;
}
```

---

### Admin Endpoints (Admin Only)

#### 11. Get All Sync Statuses
**Endpoint:** `GET /api/sync/statuses`  
**Authentication:** Required (Admin)

```json
{
  "success": true,
  "data": {
    "statuses": [
      {
        "userId": "user-123",
        "email": "user@gmail.com",
        "status": "syncing",
        "lastSync": "2024-01-15T10:30:00.000Z"
      }
    ],
    "count": 5,
    "active": 3,
    "errors": 1
  }
}
```

#### 12. Get Active Clients
**Endpoint:** `GET /api/sync/clients`  
**Authentication:** Required (Admin)

```json
{
  "success": true,
  "data": {
    "activeClients": ["user-123", "user-456"],
    "activeEmailAccounts": ["user@gmail.com", "work@company.com"],
    "clientCount": 2,
    "emailAccountCount": 4
  }
}
```

#### 13. Restart All Syncs
**Endpoint:** `POST /api/sync/restart-all`  
**Authentication:** Required (Admin)

```json
{
  "success": true,
  "message": "All email synchronizations restarted",
  "data": {
    "restartedAt": "2024-01-15T10:45:00.000Z",
    "note": "Synchronizations will restart with a 2-second delay"
  }
}
```

---

## Quick Start Examples

### Example 1: Fetch User's Email Accounts

```typescript
async function fetchEmailAccounts(userId: string, token: string) {
  const response = await fetch(`/api/auth/status/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`Found ${data.data.totalAccounts} accounts:`);
    data.data.emails.forEach(account => {
      console.log(`- ${account.email}`);
    });
    return data.data.emails;
  }
  
  throw new Error(data.error);
}
```

---

### Example 2: Add Gmail Account

```typescript
async function addGmailAccount(userId: string, token: string) {
  // 1. Get OAuth URL
  const response = await fetch('/api/auth/gmail', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { data } = await response.json();
  
  if (!data?.authUrl) {
    throw new Error('Failed to get OAuth URL');
  }
  
  // 2. Redirect to OAuth (or open popup)
  window.location.href = data.authUrl;
  
  // 3. After callback, refresh accounts list
}
```

---

### Example 3: Remove Email Account

```typescript
async function removeEmailAccount(userId: string, email: string, token: string) {
  const response = await fetch(`/api/auth/revoke/${userId}/${email}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`Removed: ${email}`);
  }
  
  return data.success;
}
```

---

### Example 4: Start Email Sync

```typescript
async function startEmailSync(userId: string, email: string, token: string) {
  const response = await fetch(`/api/sync/start/${userId}/${email}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`Sync started for ${email}`);
  }
  
  return data.success;
}
```

---

### Example 5: Get Sync Status

```typescript
async function getSyncStatus(userId: string, token: string, email?: string) {
  const url = email 
    ? `/api/sync/status/${userId}?email=${email}`
    : `/api/sync/status/${userId}`;
    
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Check if single status or array
    const statuses = data.data.isArray ? data.data.status : [data.data.status];
    console.log(`Found ${statuses.length} sync status(es)`);
    return statuses;
  }
  
  throw new Error(data.error);
}
```

---

### Example 6: Stop Email Sync

```typescript
async function stopEmailSync(userId: string, token: string, email?: string) {
  const response = await fetch(`/api/sync/stop/${userId}`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: email ? JSON.stringify({ email }) : undefined
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log(data.message);
  }
  
  return data.success;
}
```

---

### Example 4: React Hook for Email Accounts

```typescript
import { useState, useEffect } from 'react';

function useEmailAccounts(userId: string) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/auth/status/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
          setAccounts(data.data.emails || []);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [userId]);

  return { accounts, loading, error, refetch: () => fetchAccounts() };
}
```

---

## Response Formats

### Email Account Object
```typescript
interface EmailAccount {
  email: string;              // Email address
  hasRefreshToken: boolean;    // Auto-refresh capability
  tokenExpiry: string;        // ISO date string
}
```

### Auth Status Response
```typescript
interface AuthStatusResponse {
  success: boolean;
  data: {
    userId: string;
    emails: EmailAccount[];
    isAuthenticated: boolean;
    totalAccounts: number;
  };
}
```

---

## Complete OAuth Flow

1. **Request OAuth URL**
   ```
   GET /api/auth/gmail
   → Returns authUrl with userId in state parameter
   ```

2. **Redirect User to Google**
   ```
   User visits authUrl
   → Google OAuth page
   ```

3. **Google Redirects Back**
   ```
   GET /api/auth/gmail/callback?code=<code>&state=<userId>
   → Backend exchanges code for tokens
   ```

4. **Response Received**
   ```json
   {
     "success": true,
     "data": {
       "userId": "user-123",
       "email": "user@gmail.com",
       "hasRefreshToken": true
     }
   }
   ```

5. **Refresh Accounts List**
   ```
   GET /api/auth/status/:userId
   → Updated list of attached emails
   ```

---

## Error Handling

All endpoints follow a consistent error format:

```typescript
interface ErrorResponse {
  success: false;
  error: string;        // Error type
  message?: string;      // Detailed message
}
```

### Common Error Codes

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Missing parameter | Required param not provided |
| 401 | Unauthorized | Invalid or missing token |
| 403 | Access denied | User mismatch or no permission |
| 404 | Not found | Resource doesn't exist |
| 500 | Server error | Internal failure |

---

## Implementation Resources

For detailed implementation guides with complete React/Vue examples, see:

- **Adding Email Accounts:** [ADD_EMAIL_ACCOUNT_GUIDE.md](./ADD_EMAIL_ACCOUNT_GUIDE.md)
- **Setup Instructions:** [setup.md](./setup.md)
- **Security Guidelines:** [SECURITY.md](./SECURITY.md)

---

## API Endpoints Summary

### Authentication
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/auth/gmail` | ✅ | Get OAuth URL |
| GET | `/api/auth/gmail/callback` | ❌ | Handle OAuth callback |
| GET | `/api/auth/status/:userId` | ✅ | Get all attached emails |
| GET | `/api/auth/emails/:userId` | ✅ | Get email addresses |
| DELETE | `/api/auth/revoke/:userId` | ✅ | Remove all accounts |
| DELETE | `/api/auth/revoke/:userId/:email` | ✅ | Remove specific account |

### Email Synchronization
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/sync/start/:userId/:email` | ✅ | Start email sync |
| POST | `/api/sync/stop/:userId` | ✅ | Stop email sync |
| GET | `/api/sync/status/:userId` | ✅ | Get sync status |
| GET | `/api/sync/health` | ❌ | Health check |

### Admin Only
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/sync/statuses` | ✅ | Get all sync statuses |
| GET | `/api/sync/clients` | ✅ | Get active clients |
| POST | `/api/sync/restart-all` | ✅ | Restart all syncs |

---

## Testing

```bash
# Get OAuth URL
curl "http://localhost:5001/api/auth/gmail" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get user's email accounts
curl "http://localhost:5001/api/auth/status/user-123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Start email sync
curl -X POST "http://localhost:5001/api/sync/start/user-123/user@gmail.com" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get sync status
curl "http://localhost:5001/api/sync/status/user-123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Stop email sync
curl -X POST "http://localhost:5001/api/sync/stop/user-123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Health check (public)
curl "http://localhost:5001/api/sync/health"
```

