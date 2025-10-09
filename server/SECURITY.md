# Security Implementation - OneBox Email Aggregator

## 🔒 **Security Overview**

The OneBox Email Aggregator now implements comprehensive security measures to protect user data and prevent unauthorized access.

## 🛡️ **Security Layers Implemented**

### 1. **Authentication Middleware**
- **JWT Token Verification**: All protected routes require valid JWT tokens
- **Token Expiration**: Access tokens expire after 15 minutes
- **Refresh Token System**: Secure token renewal mechanism
- **User Context Injection**: Authenticated user info available in all requests

### 2. **Authorization Middleware**
- **User Access Validation**: Users can only access their own data
- **Parameter Validation**: Prevents URL parameter manipulation attacks
- **Admin Access Control**: Separate admin-only endpoints
- **Role-Based Access**: Different permission levels for different operations

### 3. **Route Protection**
- **Public Routes**: Only registration, login, and OAuth callback
- **Protected Routes**: All user data operations require authentication
- **Admin Routes**: System administration functions require admin privileges

## 🔐 **Route Security Matrix**

### **Public Routes (No Authentication Required)**
```
POST /api/user/register          - User registration
POST /api/user/login             - User login
POST /api/user/refresh           - Token refresh
GET  /api/auth/gmail             - Gmail OAuth initiation
GET  /api/auth/gmail/callback    - Gmail OAuth callback
GET  /api/sync/health           - Health check
```

### **Protected Routes (Authentication Required)**
```
GET  /api/user/profile           - Get user profile
PUT  /api/user/profile           - Update user profile
POST /api/user/change-password   - Change password
DELETE /api/user/account         - Delete account
POST /api/user/logout            - Logout
GET  /api/user/verify            - Verify token
GET  /api/user/stats             - User statistics

GET  /api/emails/search/:userId     - Search emails (own data only)
GET  /api/emails/recent/:userId     - Get recent emails (own data only)
GET  /api/emails/stats/:userId      - Email statistics (own data only)
GET  /api/emails/:userId/:emailId  - Get specific email (own data only)
PATCH /api/emails/:userId/:emailId/read  - Mark email as read (own data only)
PATCH /api/emails/:userId/:emailId/star  - Star email (own data only)
DELETE /api/emails/:userId/:emailId      - Delete email (own data only)

POST /api/sync/start/:userId     - Start email sync (own data only)
POST /api/sync/stop/:userId      - Stop email sync (own data only)
GET  /api/sync/status/:userId    - Get sync status (own data only)

POST /api/ai/categorize         - Categorize single email
POST /api/ai/categorize/batch   - Batch categorize emails
POST /api/ai/recategorize/:userId - Recategorize user emails (own data only)
GET  /api/ai/categories         - Get available categories
GET  /api/ai/stats/:userId      - Get AI stats (own data only)
GET  /api/ai/status             - Get AI service status

GET  /api/auth/status/:userId    - Get auth status (own data only)
DELETE /api/auth/revoke/:userId - Revoke auth (own data only)
GET  /api/auth/emails/:userId   - Get user emails (own data only)
DELETE /api/auth/revoke/:userId/:email - Revoke email auth (own data only)
```

### **Admin-Only Routes (Admin Authentication Required)**
```
GET  /api/sync/statuses         - Get all sync statuses
GET  /api/sync/clients          - Get active clients
POST /api/sync/restart-all      - Restart all syncs
GET  /api/auth/users            - Get all users
```

## 🔧 **Middleware Implementation**

### **Authentication Middleware** (`authMiddleware.ts`)
```typescript
// JWT token verification
export const authenticateToken = async (req: Request, res: Response, next: NextFunction)

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction)

// Require authentication (fails if no user)
export const requireAuth = (req: Request, res: Response, next: NextFunction)
```

### **User Access Middleware** (`userAccessMiddleware.ts`)
```typescript
// Validate user can only access their own data
export const validateUserAccess = (req: Request, res: Response, next: NextFunction)

// Validate email access (userId + emailId)
export const validateEmailAccess = (req: Request, res: Response, next: NextFunction)

// Require admin privileges
export const requireAdminAccess = (req: Request, res: Response, next: NextFunction)

// Use authenticated user ID instead of URL parameter
export const useAuthenticatedUserId = (req: Request, res: Response, next: NextFunction)
```

## 🚨 **Security Vulnerabilities Fixed**

### **Before (Vulnerable)**
```typescript
// ❌ SECURITY ISSUE: No authentication required
router.get('/search/:userId', emailController.searchEmails);

// ❌ SECURITY ISSUE: Users could access other users' data
// GET /api/emails/search/other-user-id would work!
```

### **After (Secure)**
```typescript
// ✅ SECURE: Authentication required
router.use(authenticateToken);

// ✅ SECURE: User can only access their own data
router.get('/search/:userId', validateUserAccess, emailController.searchEmails);

// ✅ SECURE: GET /api/emails/search/other-user-id returns 403 Forbidden
```

## 🔍 **Security Validation Examples**

### **Valid Request**
```http
GET /api/emails/search/user-123
Authorization: Bearer <valid-jwt-token>
```
- ✅ Token is valid
- ✅ User ID in token matches URL parameter
- ✅ Request proceeds

### **Invalid Token**
```http
GET /api/emails/search/user-123
Authorization: Bearer <invalid-token>
```
- ❌ Returns 401 Unauthorized

### **Wrong User ID**
```http
GET /api/emails/search/other-user-456
Authorization: Bearer <valid-token-for-user-123>
```
- ❌ Returns 403 Forbidden: "You can only access your own data"

### **No Token**
```http
GET /api/emails/search/user-123
```
- ❌ Returns 401 Unauthorized: "Access token required"

## ⚙️ **Configuration**

### **Environment Variables**
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Admin Configuration
ADMIN_USER_IDS=admin-user-id-1,admin-user-id-2
```

### **Admin Setup**
1. Register admin users normally
2. Get their user IDs from the database
3. Add user IDs to `ADMIN_USER_IDS` environment variable
4. Restart the application

## 🧪 **Security Testing**

### **Test Authentication**
```bash
# Test without token (should fail)
curl -X GET http://localhost:5001/api/emails/search/user-123

# Test with invalid token (should fail)
curl -X GET http://localhost:5001/api/emails/search/user-123 \
  -H "Authorization: Bearer invalid-token"

# Test with valid token (should succeed)
curl -X GET http://localhost:5001/api/emails/search/user-123 \
  -H "Authorization: Bearer <valid-token>"
```

### **Test User Access Control**
```bash
# Test accessing other user's data (should fail)
curl -X GET http://localhost:5001/api/emails/search/other-user-456 \
  -H "Authorization: Bearer <valid-token-for-user-123>"
```

### **Test Admin Access**
```bash
# Test admin endpoint without admin privileges (should fail)
curl -X GET http://localhost:5001/api/sync/statuses \
  -H "Authorization: Bearer <regular-user-token>"

# Test admin endpoint with admin privileges (should succeed)
curl -X GET http://localhost:5001/api/sync/statuses \
  -H "Authorization: Bearer <admin-user-token>"
```

## 📋 **Security Checklist**

- ✅ All routes require authentication (except public ones)
- ✅ Users can only access their own data
- ✅ URL parameter manipulation is prevented
- ✅ Admin routes are properly protected
- ✅ JWT tokens are properly validated
- ✅ Token expiration is enforced
- ✅ Refresh token system is implemented
- ✅ Input validation is comprehensive
- ✅ Error messages don't leak sensitive information
- ✅ CORS is properly configured
- ✅ Security headers are set

## 🚀 **Best Practices Implemented**

1. **Principle of Least Privilege**: Users only get access to what they need
2. **Defense in Depth**: Multiple layers of security
3. **Fail Secure**: Default to denying access
4. **Input Validation**: All inputs are validated
5. **Error Handling**: Secure error messages
6. **Token Management**: Proper JWT lifecycle
7. **Access Control**: Role-based permissions
8. **Audit Trail**: All actions are logged

The OneBox Email Aggregator is now **production-ready** with enterprise-grade security! 🔒✨
