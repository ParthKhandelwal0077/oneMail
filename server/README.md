# OneBox Email Aggregator

A powerful email aggregation service that synchronizes multiple IMAP email accounts in real-time and provides a seamless, searchable, and AI-powered experience.

## Features

- 🔐 **OAuth Authentication** - Secure Gmail authentication using Google OAuth 2.0
- 📧 **Real-time IMAP Sync** - Live synchronization with IMAP servers using IDLE protocol
- 🔍 **Elasticsearch Search** - Advanced full-text search with filters and pagination
- 🤖 **AI Email Categorization** - Smart categorization using Google Gemini LLM
- 📊 **Multi-account Support** - Aggregate emails from multiple Gmail accounts
- 🚀 **Real-time Updates** - Instant email notifications and synchronization
- 🏷️ **Smart Tagging** - Automatic email categorization with confidence scores
- 🛡️ **Secure & Scalable** - Built with security best practices and error handling

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   OneBox API    │    │   Elasticsearch │
│   (React)       │◄──►│   (Express)     │◄──►│   (Search)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Gmail IMAP    │
                       │   (Real-time)   │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Gemini AI     │
                       │  (Categorization)│
                       └─────────────────┘
```

## Prerequisites

- Node.js (v16 or higher)
- Elasticsearch (v7.x or v8.x)
- Google Cloud Console project with Gmail API enabled
- Google OAuth 2.0 credentials
- Google Gemini API key (for AI categorization)

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API
4. Create OAuth 2.0 credentials
5. Download the credentials JSON file
6. Save it as `credentials.json` in the server root directory

### 3. Configure Environment Variables

Create a `.env` file in the server directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:3000

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=password

# Google OAuth (if not using credentials.json)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/gmail/callback
```

### 4. Start Elasticsearch

```bash
# Using Docker
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0

# Or install locally
# Follow Elasticsearch installation guide for your OS
```

### 5. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## API Endpoints

### Authentication

- `GET /api/auth/gmail` - Get OAuth URL for adding new email account
- `GET /api/auth/gmail/callback?code={code}&state={userId}` - OAuth callback handler
- `GET /api/auth/status/{userId}` - Get user's email accounts (attached emails) with authentication status
- `GET /api/auth/emails/{userId}` - Get list of all email addresses for a user
- `DELETE /api/auth/revoke/{userId}` - Revoke all email authentication for a user
- `DELETE /api/auth/revoke/{userId}/{email}` - Revoke authentication for a specific email account

> 💡 **For frontend developers**: 
> - See [API_REFERENCE.md](./API_REFERENCE.md) for complete API reference and usage examples
> - See [ADD_EMAIL_ACCOUNT_GUIDE.md](./ADD_EMAIL_ACCOUNT_GUIDE.md) for detailed step-by-step implementation guide

### Email Synchronization

- `POST /api/sync/start/{userId}` - Start email sync
- `POST /api/sync/stop/{userId}` - Stop email sync
- `GET /api/sync/status/{userId}` - Get sync status
- `GET /api/sync/statuses` - Get all sync statuses
- `GET /api/sync/health` - Health check

### Email Operations

- `GET /api/emails/search/{userId}?query={query}&folder={folder}&category={category}` - Search emails
- `GET /api/emails/recent/{userId}` - Get recent emails
- `GET /api/emails/{userId}/{emailId}` - Get specific email
- `GET /api/emails/stats/{userId}` - Get email statistics
- `PATCH /api/emails/{userId}/{emailId}/read` - Mark as read/unread
- `PATCH /api/emails/{userId}/{emailId}/star` - Star/unstar email
- `DELETE /api/emails/{userId}/{emailId}` - Delete email

### AI Categorization

- `POST /api/ai/categorize` - Categorize a single email
- `POST /api/ai/categorize/batch` - Batch categorize multiple emails
- `POST /api/ai/recategorize/{userId}` - Recategorize user's emails
- `GET /api/ai/categories` - Get available categories
- `GET /api/ai/stats/{userId}` - Get category statistics
- `GET /api/ai/status` - Check AI service status

## Usage Example

### 1. Authenticate with Gmail

```bash
# Get OAuth URL
curl "http://localhost:5001/api/auth/gmail?userId=user123"

# User visits the returned URL and authorizes
# Then handle the callback (this happens automatically)
```

### 2. Start Email Synchronization

```bash
# Start syncing emails
curl -X POST "http://localhost:5001/api/sync/start/user123"
```

### 3. Search Emails

```bash
# Search for emails
curl "http://localhost:5001/api/emails/search/user123?query=meeting&folder=INBOX"

# Get recent emails
curl "http://localhost:5001/api/emails/recent/user123"

# Get email statistics
curl "http://localhost:5001/api/emails/stats/user123"
```

### 4. Check Sync Status

```bash
# Check sync status
curl "http://localhost:5001/api/sync/status/user123"

# Get all sync statuses
curl "http://localhost:5001/api/sync/statuses"
```

### 5. AI Categorization

```bash
# Categorize a single email
curl -X POST "http://localhost:5001/api/ai/categorize" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Meeting Confirmation",
    "body": "Hi, I confirm our meeting for tomorrow at 2 PM.",
    "from": "colleague@company.com"
  }'

# Get available categories
curl "http://localhost:5001/api/ai/categories"

# Get category statistics
curl "http://localhost:5001/api/ai/stats/user123"

# Check AI service status
curl "http://localhost:5001/api/ai/status"
```

### 6. Search with Category Filter

```bash
# Search emails by category
curl "http://localhost:5001/api/emails/search/user123?category=Interested"

# Search with multiple filters
curl "http://localhost:5001/api/emails/search/user123?query=meeting&category=Meeting Booked&folder=INBOX"
```

## Project Structure

```
server/
├── src/
│   ├── controllers/          # MVC Controllers
│   │   ├── AuthController.ts
│   │   ├── EmailController.ts
│   │   ├── SyncController.ts
│   │   └── AIController.ts
│   ├── services/             # Business Logic
│   │   ├── authService.ts
│   │   ├── elasticsearchService.ts
│   │   ├── emailSyncService.ts
│   │   └── aiCategorizationService.ts
│   ├── scripts/              # Utility Scripts
│   │   └── testCategorization.ts
│   ├── routes/               # API Routes
│   │   ├── auth.ts
│   │   ├── emails.ts
│   │   ├── sync.ts
│   │   ├── ai.ts
│   │   └── index.ts
│   ├── middleware/           # Express Middleware
│   │   ├── errorHandler.ts
│   │   └── notFound.ts
│   ├── types/                # TypeScript Types
│   │   └── index.ts
│   └── index.ts              # Main Server File
├── credentials.json          # Google OAuth Credentials
├── package.json
└── README.md
```

## Key Components

### Authentication Service
- Handles Google OAuth 2.0 flow
- Manages access and refresh tokens
- Automatic token refresh

### Email Sync Service
- Real-time IMAP synchronization using IDLE
- Fetches recent emails (last 30 days)
- Handles connection errors and reconnection

### Elasticsearch Service
- Full-text search with advanced queries
- Email indexing and categorization
- Statistics and analytics

### Controllers
- RESTful API endpoints
- Request validation and error handling
- Response formatting

## Error Handling

The application includes comprehensive error handling:

- OAuth authentication errors
- IMAP connection failures
- Elasticsearch indexing errors
- Graceful shutdown on SIGINT/SIGTERM
- Uncaught exception handling

## Security Features

- Helmet.js for security headers
- CORS configuration
- Input validation
- Error message sanitization
- Secure token storage

## Monitoring

- Health check endpoints
- Sync status monitoring
- Error logging
- Performance metrics

## Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Common Issues

1. **Elasticsearch Connection Error**
   - Ensure Elasticsearch is running on port 9200
   - Check ELASTICSEARCH_URL environment variable

2. **OAuth Authentication Error**
   - Verify credentials.json is properly configured
   - Check redirect URIs in Google Cloud Console

3. **IMAP Connection Error**
   - Ensure Gmail IMAP is enabled
   - Check access token validity

### Logs

The application provides detailed logging for debugging:

- Authentication events
- IMAP connection status
- Elasticsearch operations
- Error details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
