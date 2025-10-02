# OneBox Email Aggregator Setup Guide

## Credentials Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/gmail/callback`
   - `http://localhost:3000/api/auth/gmail/callback`
5. Download the JSON file
6. Rename it to `credentials.json` and place it in the server root directory

### 3. Credentials.json Structure

Your `credentials.json` should look like this:

```json
{
  "web": {
    "client_id": "your-google-client-id.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "your-client-secret",
    "redirect_uris": [
      "http://localhost:5000/api/auth/gmail/callback",
      "http://localhost:3000/api/auth/gmail/callback"
    ]
  }
}
```

## Environment Setup

### 1. Create .env file

Create a `.env` file in the server directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=password

# Google OAuth (alternative to credentials.json)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/gmail/callback
```

## Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Start Elasticsearch (using Docker)
docker run -d --name elasticsearch -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" elasticsearch:8.11.0

# 3. Start the server
npm run dev

# 4. Test the setup
curl http://localhost:5000/health
```

## Testing the API

### 1. Get a user ID and auth URL
```bash
curl "http://localhost:5000/api/auth/gmail?userId=test-user"
```

### 2. Visit the returned URL to authorize

### 3. Start email synchronization
```bash
curl -X POST "http://localhost:5000/api/sync/start/test-user"
```

### 4. Search emails
```bash
curl "http://localhost:5000/api/emails/search/test-user?query=hello"
```

## Troubleshooting

### Elasticsearch Issues
- Ensure Elasticsearch is running on port 9200
- Check if the index is created: `curl http://localhost:9200/emails`

### OAuth Issues
- Verify credentials.json is in the correct location
- Check redirect URIs in Google Cloud Console
- Ensure Gmail API is enabled

### IMAP Issues
- Gmail IMAP must be enabled in account settings
- Two-factor authentication must be enabled
- App passwords may be required
