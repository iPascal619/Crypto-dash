# 🔐 Google OAuth Setup Guide for CryptoDash

## Step 1: Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Create new project or select existing: "CryptoDash-Trading"
3. Go to "APIs & Services" > "Library"
4. Search and enable: "Google+ API" or "Google Identity API"

## Step 2: Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "+ CREATE CREDENTIALS" > "OAuth 2.0 Client IDs"
3. Configure consent screen if needed:
   - Application name: "CryptoDash Trading Platform"
   - User support email: your email
   - Authorized domains: localhost (for testing)

## Step 3: Configure OAuth Client
**Application type:** Web application
**Name:** CryptoDash Web Client

**Authorized JavaScript origins:**
- http://localhost:3001
- http://127.0.0.1:3001
- file://

**Authorized redirect URIs:**
- http://localhost:3001/api/auth/google/callback
- http://127.0.0.1:3001/api/auth/google/callback

## Step 4: Get Credentials
After creating, you'll get:
- Client ID (looks like: xxxxx.apps.googleusercontent.com)
- Client Secret (looks like: GOCSPX-xxxxx)

## Step 5: Update .env file
Replace in your .env:
```
GOOGLE_CLIENT_ID=your-actual-client-id
GOOGLE_CLIENT_SECRET=your-actual-client-secret
```

## Step 6: Test
1. Restart backend server
2. Go to login page
3. Click "Sign in with Google"
4. Should redirect to Google OAuth flow

## Troubleshooting
- Make sure redirect URIs exactly match
- Check that APIs are enabled
- Verify consent screen is configured
