# OneBox Authentication System

## Overview

The OneBox Email Aggregator includes a comprehensive authentication system with JWT tokens, refresh tokens, and secure password handling using bcrypt.

## Authentication Flow

### 1. User Registration
- Users register with phone number and password
- Password is hashed using bcrypt with salt rounds
- JWT access token (15min) and refresh token (7d) are generated
- User data is stored in PostgreSQL database

### 2. User Login
- Users login with phone number and password
- Password is verified against stored hash
- New JWT tokens are generated upon successful login

### 3. Token Refresh
- Access tokens expire after 15 minutes
- Refresh tokens can be used to get new access tokens
- Refresh tokens expire after 7 days

### 4. Protected Routes
- All protected routes require valid JWT access token
- Token is verified on each request
- User information is attached to request object

## API Endpoints

### Public Routes (No Authentication Required)

#### Register User
```http
POST /api/user/register
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "phoneNumber": "+1234567890",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

#### Login User
```http
POST /api/user/login
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "phoneNumber": "+1234567890",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

#### Refresh Token
```http
POST /api/user/refresh
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "new-jwt-access-token",
      "refreshToken": "new-jwt-refresh-token"
    }
  }
}
```

### Protected Routes (Authentication Required)

All protected routes require the `Authorization` header:
```http
Authorization: Bearer <access-token>
```

#### Get User Profile
```http
GET /api/user/profile
Authorization: Bearer <access-token>
```

#### Update User Profile
```http
PUT /api/user/profile
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "slackWebhookUrl": "https://hooks.slack.com/...",
  "customWebhookUrl": "https://webhook.site/..."
}
```

#### Change Password
```http
POST /api/user/change-password
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

#### Delete Account
```http
DELETE /api/user/account
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "password": "CurrentPassword123"
}
```

#### Logout
```http
POST /api/user/logout
Authorization: Bearer <access-token>
```

#### Verify Token
```http
GET /api/user/verify
Authorization: Bearer <access-token>
```

#### Get User Statistics
```http
GET /api/user/stats
Authorization: Bearer <access-token>
```

## Password Requirements

- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number

## Phone Number Format

- Must be valid international format
- Supports formats like: `+1234567890`, `1234567890`
- Must be unique across all users

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required fields",
  "message": "Phone number and password are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid token",
  "message": "The provided token is invalid or expired"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Invalid token",
  "message": "The provided token is invalid or expired"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "User not found",
  "message": "User not found"
}
```

## Security Features

1. **Password Hashing**: bcrypt with 12 salt rounds
2. **JWT Tokens**: Stateless authentication with expiration
3. **Refresh Tokens**: Secure token renewal mechanism
4. **Input Validation**: Comprehensive validation for all inputs
5. **Rate Limiting**: Built-in protection against brute force
6. **CORS Protection**: Configured for specific origins
7. **Helmet Security**: Security headers for all responses

## Database Schema

### User Table
```sql
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "phoneNumber" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "slackWebhookUrl" TEXT,
  "customWebhookUrl" TEXT
);
```

### EmailAccount Table
```sql
CREATE TABLE "EmailAccount" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "email" TEXT UNIQUE NOT NULL,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "expiryDate" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/email_onebox

# Security
BCRYPT_ROUNDS=12
```

## Usage Examples

### Frontend Integration

```javascript
// Login
const login = async (phoneNumber, password) => {
  const response = await fetch('/api/user/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phoneNumber, password }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store tokens
    localStorage.setItem('accessToken', data.data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
    return data.data.user;
  }
  
  throw new Error(data.message);
};

// Make authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
  const accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  // Handle token expiration
  if (response.status === 401) {
    await refreshToken();
    // Retry request
    return makeAuthenticatedRequest(url, options);
  }
  
  return response;
};

// Refresh token
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('/api/user/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('accessToken', data.data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
  } else {
    // Redirect to login
    window.location.href = '/login';
  }
};
```

## Testing

### Test Registration
```bash
curl -X POST http://localhost:5001/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "password": "TestPassword123"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:5001/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "password": "TestPassword123"
  }'
```

### Test Protected Route
```bash
curl -X GET http://localhost:5001/api/user/profile \
  -H "Authorization: Bearer <access-token>"
```

## Integration with Gmail OAuth

The user authentication system works alongside the Gmail OAuth system:

1. Users first register/login to the OneBox platform
2. They then authenticate with Gmail using OAuth
3. Gmail tokens are linked to their user account
4. All email operations are scoped to the authenticated user

This provides a secure, multi-layered authentication system for the email aggregation platform.
