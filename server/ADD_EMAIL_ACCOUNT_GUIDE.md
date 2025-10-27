# How to Add a New Email Account - Frontend Integration Guide

## Overview

This guide explains how to implement the "Add Email Account" feature in your frontend to connect a Gmail account using OAuth 2.0 flow.

---

## 🔄 Complete OAuth Flow

```
Frontend                  Backend                    Google OAuth
   │                          │                           │
   │ 1. Request auth URL      │                           │
   ├─────────────────────────>│                           │
   │                          │                           │
   │ 2. Auth URL + userId    │                           │
   │<─────────────────────────┤                           │
   │                          │                           │
   │ 3. Redirect to Google    │                           │
   ├─────────────────────────────────────────────────────>│
   │                          │                           │
   │ 4. User authorizes       │                           │
   │ 5. Google redirects with code                       │
   │<─────────────────────────────────────────────────────┤
   │                          │                           │
   │ 6. Send code to callback │                           │
   ├─────────────────────────>│                           │
   │                          │                           │
   │                          │ 7. Exchange code          │
   │                          ├──────────────────────────>│
   │                          │ 8. Access tokens          │
   │                          │<──────────────────────────┤
   │                          │                           │
   │ 9. Success response      │                           │
   │<─────────────────────────┤                           │
   │                          │                           │
   │ 10. Refresh email list   │                           │
   │<─────────────────────────>│                           │
```

---

## 📋 API Endpoints

### 1. Get OAuth Authorization URL
**Endpoint:** `GET /api/auth/gmail`

**Authentication:** Required (Bearer Token)

**Response:**
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

### 2. Handle OAuth Callback
**Endpoint:** `GET /api/auth/gmail/callback?code=...&state=user-123`

**Authentication:** Not required (public route)

**Success Response (200 OK):**
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

**Error Responses:**
- **400 Bad Request** - Missing code or userId
- **500 Internal Server Error** - Authentication failed

---

## 💻 Frontend Implementation

### React Example - Complete Flow

```typescript
import { useState } from 'react';

interface AuthUrlResponse {
  success: boolean;
  data: {
    authUrl: string;
    userId: string;
    message: string;
  };
}

interface CallbackResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    email: string;
    hasRefreshToken: boolean;
    nextStep: string;
  };
}

function AddEmailAccount({ userId, onAccountAdded }: { 
  userId: string; 
  onAccountAdded: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddAccount = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Get OAuth URL from backend
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/auth/gmail', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: AuthUrlResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get auth URL');
      }

      // Step 2: Open OAuth popup window
      const popup = window.open(
        data.data.authUrl,
        'Gmail OAuth',
        'width=500,height=600,left=100,top=100'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Step 3: Listen for OAuth callback message from popup
      const messageListener = (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data.type === 'OAUTH_SUCCESS') {
          // Step 4: Refresh email list
          onAccountAdded();
          
          // Show success notification
          alert(`Successfully connected ${event.data.email}!`);
          
          // Clean up
          window.removeEventListener('message', messageListener);
          popup.close();
          setLoading(false);
        } else if (event.data.type === 'OAUTH_ERROR') {
          setError(event.data.message);
          window.removeEventListener('message', messageListener);
          popup.close();
          setLoading(false);
        }
      };

      window.addEventListener('message', messageListener);

      // Check if popup is closed manually
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', messageListener);
          setLoading(false);
        }
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={handleAddAccount}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? 'Connecting...' : '+ Add Gmail Account'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

---

## 🔀 Alternative: Redirect Flow (No Popup)

```typescript
function AddEmailAccountRedirect({ userId }: { userId: string }) {
  const handleAddAccount = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch('/api/auth/gmail', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        // Redirect entire window to OAuth
        window.location.href = data.data.authUrl;
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // This component should be rendered on callback page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      handleCallback(code, state);
    }
  }, []);

  const handleCallback = async (code: string, userId: string) => {
    try {
      const response = await fetch(`/api/auth/gmail/callback?code=${code}&state=${userId}`);
      const data: CallbackResponse = await response.json();

      if (data.success) {
        // Redirect back to accounts page
        window.location.href = `/accounts?success=true&email=${data.data.email}`;
      } else {
        window.location.href = `/accounts?error=${data.error}`;
      }
    } catch (error) {
      console.error('Callback error:', error);
      window.location.href = '/accounts?error=authentication_failed';
    }
  };

  return <button onClick={handleAddAccount}>Add Gmail Account</button>;
}
```

---

## 📡 Callback Page Implementation

Create a callback page that handles the OAuth redirect:

**File:** `src/pages/OAuthCallback.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state'); // This is the userId

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing authorization code or user ID');
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/gmail/callback?code=${code}&state=${state}`
        );

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage(`Successfully connected ${data.data.email}!`);

          // Notify parent window (if opened as popup)
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_SUCCESS',
              email: data.data.email,
              data: data.data
            }, window.location.origin);
          }

          // Redirect to accounts page after 2 seconds
          setTimeout(() => {
            window.location.href = '/accounts';
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Authentication failed');

          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_ERROR',
              message: data.error
            }, window.location.origin);
          }
        }
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Network error');

        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            message: 'Network error'
          }, window.location.origin);
        }
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="oauth-callback">
      <h2>Connecting Gmail Account...</h2>
      
      {status === 'loading' && (
        <div>
          <div className="spinner"></div>
          <p>Please wait while we connect your account...</p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="success">
          <h3>✅ Success!</h3>
          <p>{message}</p>
          <p>Redirecting to accounts page...</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="error">
          <h3>❌ Error</h3>
          <p>{message}</p>
          <button onClick={() => window.location.href = '/accounts'}>
            Go Back
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 Refresh Email List After Adding Account

After successfully adding an email account, refresh the list by calling the status endpoint:

```typescript
function EmailAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = 'user-123'; // Get from auth context

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/auth/status/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success && data.data.isAuthenticated) {
        setAccounts(data.data.emails);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Refresh after adding account
  const handleAccountAdded = () => {
    fetchAccounts();
  };

  return (
    <div>
      <h1>Email Accounts</h1>
      
      <AddEmailAccount 
        userId={userId} 
        onAccountAdded={handleAccountAdded}
      />
      
      <div className="accounts-list">
        {accounts.map((account, index) => (
          <div key={index} className="account-card">
            <h3>{account.email}</h3>
            <p>Status: {account.hasRefreshToken ? 'Active' : 'Needs refresh'}</p>
            <p>Expires: {new Date(account.tokenExpiry).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎨 UI/UX Best Practices

### 1. Loading States
```typescript
<button disabled={loading}>
  {loading ? (
    <>
      <Spinner /> Connecting...
    </>
  ) : (
    '+ Add Gmail Account'
  )}
</button>
```

### 2. Success Notification
```typescript
import { toast } from 'react-toastify';

// After successful OAuth
toast.success(`Successfully connected ${email}!`, {
  position: 'top-right',
  autoClose: 3000
});
```

### 3. Error Handling
```typescript
const handleAddAccount = async () => {
  try {
    // ... OAuth flow
  } catch (error) {
    if (error.message.includes('popup')) {
      toast.error('Please allow popups and try again');
    } else if (error.message.includes('network')) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error(error.message);
    }
  }
};
```

### 4. Duplicate Account Check
```typescript
const handleAddAccount = async () => {
  // First check if account already exists
  const existingAccounts = await fetch(`/api/auth/status/${userId}`);
  const { data } = await existingAccounts.json();
  
  // Show warning if trying to add duplicate
  if (data.emails.some((e: any) => e.email === emailToAdd)) {
    if (!confirm('This account is already connected. Re-authenticate?')) {
      return;
    }
  }
  
  // Proceed with OAuth...
};
```

---

## 🔒 Security Considerations

### 1. Verify Popup Origin
```typescript
const messageListener = (event: MessageEvent) => {
  // Always verify origin
  if (event.origin !== window.location.origin) {
    console.error('Invalid origin:', event.origin);
    return;
  }
  // Handle message...
};
```

### 2. Validate Callback State
The `state` parameter should contain the userId and be verified on the backend to prevent CSRF attacks.

### 3. Handle Token Storage
Never store tokens in localStorage in production. Use secure, httpOnly cookies instead.

---

## 🧪 Testing the Flow

### Test Scenario 1: Success Flow
```bash
# 1. Request auth URL
curl -X GET "http://localhost:5001/api/auth/gmail" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. Open the authUrl in browser
# 3. Complete OAuth flow
# 4. Check callback response
curl "http://localhost:5001/api/auth/gmail/callback?code=...&state=user-123"

# 5. Verify account was added
curl "http://localhost:5001/api/auth/status/user-123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Scenario 2: Error Handling
```bash
# Test missing code
curl "http://localhost:5001/api/auth/gmail/callback?state=user-123"
# Expected: 400 Bad Request

# Test missing state
curl "http://localhost:5001/api/auth/gmail/callback?code=abc"
# Expected: 400 Bad Request
```

---

## 📱 React Router Setup

Add the callback route to your router:

```typescript
// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import OAuthCallback from './pages/OAuthCallback';

function App() {
  return (
    <Routes>
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      {/* other routes */}
    </Routes>
  );
}
```

---

## 🎯 Complete Example Component

```typescript
import { useState, useEffect } from 'react';

interface EmailAccount {
  email: string;
  hasRefreshToken: boolean;
  tokenExpiry: string;
}

export default function EmailAccountsManager() {
  const userId = 'user-123'; // From auth context
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/auth/status/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setAccounts(data.data.emails || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/auth/gmail', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Open popup or redirect
        window.open(data.data.authUrl, '_blank');
        
        // Listen for success
        window.addEventListener('message', ({ data: eventData }) => {
          if (eventData.type === 'OAUTH_SUCCESS') {
            fetchAccounts(); // Refresh list
          }
        });
      }
    } catch (error) {
      alert('Failed to initiate OAuth');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="email-accounts">
      <div className="header">
        <h1>Email Accounts ({accounts.length})</h1>
        <button onClick={handleAddAccount}>+ Add Account</button>
      </div>
      
      {accounts.length === 0 ? (
        <div className="empty-state">
          <p>No email accounts connected</p>
        </div>
      ) : (
        <div className="accounts-list">
          {accounts.map((account, i) => (
            <div key={i} className="account">
              <h3>{account.email}</h3>
              <p>{account.hasRefreshToken ? '✅ Active' : '⚠️ Needs refresh'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## ✅ Checklist for Implementation

- [ ] Create OAuth callback page
- [ ] Implement popup or redirect flow
- [ ] Add message listener for popup communication
- [ ] Handle success and error states
- [ ] Implement account refresh after OAuth success
- [ ] Add loading states and error handling
- [ ] Test the complete OAuth flow
- [ ] Verify token expiry handling
- [ ] Add duplicate account detection
- [ ] Implement proper security measures
- [ ] Add user notifications (toast/snackbar)

---

## 🚨 Common Issues & Solutions

### Issue: Popup Blocked
**Solution:** Request popup before async operation, or use redirect flow

### Issue: Callback Not Firing
**Solution:** Check redirect URI matches Google Cloud Console settings

### Issue: CORS Error
**Solution:** Ensure frontend URL is added to CORS whitelist in backend

### Issue: State Mismatch
**Solution:** Verify state parameter is preserved throughout OAuth flow

### Issue: Token Not Refreshable
**Solution:** Ensure `prompt: 'consent'` is set to get refresh token

