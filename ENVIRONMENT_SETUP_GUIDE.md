# Step-by-Step Environment Variables Setup Guide

## 🔑 Getting All Your API Keys and Credentials

This guide will help you gather all the required credentials for your CryptoDash deployment.

---

## 1. 🗄️ MongoDB Atlas (Database)

### Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free (provides 512MB free storage)
3. Create a new cluster:
   - Choose AWS as cloud provider
   - Select region close to `us-east-1` (like `us-east-1` itself)
   - Choose M0 Sandbox (Free tier)

### Get Connection String
1. **Database Access** → Add New Database User
   - Username: `cryptodash-user`
   - Password: Generate secure password
   - Database User Privileges: Read and write to any database

2. **Network Access** → Add IP Address
   - Add `0.0.0.0/0` (allow from anywhere) for AWS deployment

3. **Clusters** → Connect → Connect your application
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `cryptodash`

**Your MongoDB URI will look like:**
```
mongodb+srv://cryptodash-user:YOUR_PASSWORD@cluster0.abc123.mongodb.net/cryptodash?retryWrites=true&w=majority
```

---

## 2. 💳 Stripe (Payment Processing)

### Create Stripe Account
1. Go to [Stripe](https://stripe.com)
2. Sign up and verify your account
3. Complete business verification (required for live payments)

### Get API Keys
1. Go to **Developers** → **API Keys**
2. **For Testing** (use these first):
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`

3. **For Production** (after testing):
   - Toggle "View test data" OFF
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`

### Configure Webhooks
1. **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://yourdomain.tech/api/payment/webhook`
3. Events to send:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

**Save the webhook signing secret** (starts with `whsec_`)

---

## 3. 🪙 Binance API (Cryptocurrency Data)

### Create Binance Account
1. Go to [Binance](https://www.binance.com)
2. Sign up and complete KYC verification
3. Enable 2FA (required for API access)

### Create API Key
1. **Profile** → **API Management**
2. **Create API** → **System generated**
3. Label: `CryptoDash-Production`
4. **Restrictions**:
   - ✅ Enable Reading
   - ❌ Enable Spot & Margin Trading (not needed)
   - ❌ Enable Futures (not needed)
   - ✅ Restrict access to trusted IPs only (add your AWS region IPs)

**Save both:**
- API Key: `your_api_key_here`
- Secret Key: `your_secret_key_here`

---

## 4. 🔐 Google OAuth (Social Login)

### Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **New Project** → Name: `CryptoDash-Auth`
3. Select the project

### Enable Google+ API
1. **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click **Enable**

### Create OAuth Credentials
1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth 2.0 Client IDs**
3. **Application type**: Web application
4. **Name**: `CryptoDash-OAuth`
5. **Authorized redirect URIs**:
   ```
   http://localhost:3001/api/auth/google/callback
   https://yourdomain.tech/api/auth/google/callback
   ```

**Save:**
- Client ID: `your_client_id.apps.googleusercontent.com`
- Client Secret: `your_client_secret`

### Configure OAuth Consent Screen
1. **OAuth consent screen** → **External**
2. **App information**:
   - App name: `CryptoDash`
   - User support email: your email
   - Developer contact: your email
3. **Scopes**: Add `email` and `profile`
4. **Test users**: Add your email for testing

---

## 5. 🔑 JWT Secret (Security)

### Generate Strong JWT Secret
```powershell
# Generate a 64-character random string
[System.Web.Security.Membership]::GeneratePassword(64, 0)

# Or use online generator:
# https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
# Select 512-bit key
```

**Example:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4`

---

## 6. 📧 Email Service (Optional - for notifications)

### Option A: SendGrid (Recommended)
1. Go to [SendGrid](https://sendgrid.com)
2. Sign up for free (100 emails/day)
3. **Settings** → **API Keys** → **Create API Key**
4. Name: `CryptoDash-Email`
5. Permissions: Full Access

### Option B: AWS SES
1. **Amazon SES** in AWS Console
2. **Verified identities** → Add domain
3. **SMTP settings** → Create SMTP credentials

---

## 7. 📝 Complete Environment File

Create `backend/.env.production.local` with all your credentials:

```env
# Application
NODE_ENV=production
PORT=3001
DOMAIN_NAME=yourdomain.tech
FRONTEND_URL=https://yourdomain.tech
BACKEND_URL=https://yourdomain.tech/api

# Database
MONGODB_URI=mongodb+srv://cryptodash-user:YOUR_PASSWORD@cluster0.abc123.mongodb.net/cryptodash?retryWrites=true&w=majority

# Authentication
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4
JWT_EXPIRES_IN=7d
SESSION_SECRET=another_secure_random_string_here

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Stripe Payments
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Binance API
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_secret_key
BINANCE_BASE_URL=https://api.binance.com

# Email Service (Optional - SendGrid)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.tech

# AWS Configuration (will be auto-populated)
AWS_REGION=us-east-1
INSTANCE_ID=will_be_set_automatically
PUBLIC_IP=will_be_set_automatically

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://yourdomain.tech

# Logging
LOG_LEVEL=info
LOG_FILE=true

# Features
ENABLE_TRADING=true
ENABLE_PAYMENTS=true
ENABLE_ANALYTICS=true
ENABLE_NOTIFICATIONS=true

# Cache (Redis - Optional)
# REDIS_URL=redis://localhost:6379

# Performance
MAX_FILE_SIZE=10mb
MAX_REQUEST_SIZE=50mb
```

---

## 8. 🔒 Security Checklist

### Before Going Live:
- [ ] Enable 2FA on all service accounts
- [ ] Use strong, unique passwords
- [ ] Store credentials securely (never in code)
- [ ] Limit API key permissions to minimum required
- [ ] Set up IP restrictions where possible
- [ ] Enable audit logging on all services
- [ ] Set up monitoring and alerts

### Production Security:
- [ ] Change all test API keys to live keys
- [ ] Enable Stripe live mode
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable HTTPS only
- [ ] Configure security headers
- [ ] Set up backup procedures

---

## 9. ✅ Testing Your Configuration

### Test Database Connection
```javascript
// Test MongoDB connection
const { MongoClient } = require('mongodb');
const client = new MongoClient('your_mongodb_uri');
client.connect().then(() => console.log('MongoDB connected!')).catch(console.error);
```

### Test Stripe
```javascript
// Test Stripe connection
const stripe = require('stripe')('your_stripe_secret_key');
stripe.charges.list({ limit: 1 }).then(() => console.log('Stripe connected!')).catch(console.error);
```

### Test Binance
```javascript
// Test Binance connection
const fetch = require('node-fetch');
fetch('https://api.binance.com/api/v3/exchangeInfo')
  .then(res => res.json())
  .then(() => console.log('Binance API connected!'));
```

---

## 🚨 Important Notes

### Development vs Production
- Use **test** keys during development
- Switch to **live** keys only for production deployment
- Never mix test and live keys

### Credential Security
- Never commit `.env` files to Git
- Use different credentials for different environments
- Rotate keys regularly (quarterly recommended)
- Monitor API usage for unusual activity

### Backup Plan
- Keep backup copies of all credentials in a secure password manager
- Document which keys are used where
- Have a key rotation plan

---

Your environment is now ready for deployment! 🚀

Next step: Follow the main Terraform deployment guide to deploy your infrastructure.
