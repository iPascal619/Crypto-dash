# Complete Google Cloud Platform (GCP) FREE Deployment Guide
## Deploy CryptoDash to Google Cloud - NO CREDIT CARD NEEDED*

*After initial verification, you can use always-free services indefinitely

---

## 🎯 Why Google Cloud Platform?

### ✅ Better Free Tier than AWS
- **$300 free credits** for 90 days (vs AWS 12 months)
- **Always-free services** that continue forever
- **No surprise charges** - billing stops when credits run out
- **Generous limits** on free tier services

### 🆓 Always Free Services (Forever)
- **Cloud Run**: 2 million requests/month
- **Compute Engine**: 1 f1-micro instance (24/7)
- **Cloud Storage**: 5 GB
- **Cloud Build**: 120 build-minutes/day
- **Firebase Hosting**: 10 GB + 360 MB/day transfer

---

## 🛠️ Step 1: Setup Google Cloud Account

### Create Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign up with existing Gmail or create new account
3. **Activate free trial** (requires card verification but won't charge)
4. Create project: `cryptodash-production`

### Install Google Cloud CLI
```powershell
# Download Google Cloud SDK
# Manual: https://cloud.google.com/sdk/docs/install-sdk#windows
# Or use Chocolatey:
choco install gcloudsdk

# Or direct download:
Invoke-WebRequest https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe -OutFile gcloud-installer.exe
.\gcloud-installer.exe
```

### Initialize CLI
```powershell
# Initialize and login
gcloud init

# Select your project
gcloud config set project cryptodash-production

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable dns.googleapis.com
gcloud services enable storage.googleapis.com
```

---

## 🚀 Deployment Option 1: Cloud Run (Recommended - FREE)

### Why Cloud Run?
- **Serverless**: No server management
- **Auto-scaling**: 0 to many instances
- **Always free**: 2M requests/month
- **Custom domains**: Free SSL certificates
- **Container-based**: Easy deployment

### Step 1: Prepare Environment Variables

Create `.env.production` in your backend folder:
```powershell
# Navigate to backend
cd backend

# Create production environment file
@"
# Application Configuration
NODE_ENV=production
PORT=8080
DOMAIN_NAME=yourdomain.tech
FRONTEND_URL=https://yourdomain.tech
BACKEND_URL=https://yourdomain.tech/api

# Database (MongoDB Atlas - Free Tier)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cryptodash?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRES_IN=7d

# Google OAuth (you already have this project!)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Stripe (use test keys for free development)
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
STRIPE_SECRET_KEY=sk_test_your_test_secret

# Binance API (free tier available)
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_secret_key
BINANCE_BASE_URL=https://api.binance.com

# Logging
LOG_LEVEL=info

# Security
CORS_ORIGIN=https://yourdomain.tech
"@ | Out-File -FilePath .env.production -Encoding UTF8
```

### Step 2: Update server.js for Cloud Run

Your server.js is already compatible! Cloud Run expects:
- ✅ Port from environment variable (`process.env.PORT`)
- ✅ Listens on 0.0.0.0
- ✅ Health check endpoint

### Step 3: Build and Deploy to Cloud Run

```powershell
# Navigate to project root
cd "c:\Users\HP\meme coin"

# Build and deploy in one command
gcloud run deploy cryptodash \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10

# Get the service URL
gcloud run services describe cryptodash --platform managed --region us-central1 --format 'value(status.url)'
```

### Step 4: Configure Custom Domain

```powershell
# Add custom domain to Cloud Run
gcloud run domain-mappings create \
  --service cryptodash \
  --domain yourdomain.tech \
  --region us-central1 \
  --platform managed

# Get the verification record
gcloud run domain-mappings describe yourdomain.tech \
  --region us-central1 \
  --platform managed
```

**Add these DNS records to your .tech domain:**
- Type: CNAME
- Name: @
- Value: ghs.googlehosted.com

---

## 🖥️ Deployment Option 2: Compute Engine (Always Free VM)

### Why Compute Engine Free Tier?
- **Always free**: 1 f1-micro instance forever
- **Full control**: Complete server access
- **Traditional hosting**: Similar to VPS
- **24/7 uptime**: Perfect for small apps

### Step 1: Create Free Tier VM

```powershell
# Create f1-micro instance (always free)
gcloud compute instances create cryptodash-vm \
  --zone=us-west1-b \
  --machine-type=f1-micro \
  --subnet=default \
  --network-tier=PREMIUM \
  --maintenance-policy=MIGRATE \
  --image=ubuntu-2004-focal-v20230918 \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=10GB \
  --boot-disk-type=pd-standard \
  --boot-disk-device-name=cryptodash-vm \
  --tags=http-server,https-server

# Allow HTTP/HTTPS traffic
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow HTTP traffic"

gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow HTTPS traffic"
```

### Step 2: Setup the VM

```powershell
# SSH into the VM
gcloud compute ssh cryptodash-vm --zone=us-west1-b

# Run setup commands on the VM
```

**On the VM, run:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Clone your repository
git clone https://github.com/Isaiah-Essien/Negpod6-GCS-1-project.git /opt/cryptodash
cd /opt/cryptodash

# Install dependencies
cd backend
npm install

# Create environment file
cp .env.production.template .env

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure Nginx
sudo nano /etc/nginx/sites-available/cryptodash
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.tech www.yourdomain.tech;

    location / {
        root /opt/cryptodash;
        try_files $uri $uri/ @backend;
        index index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location @backend {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/cryptodash /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.tech -d www.yourdomain.tech
```

---

## 🔥 Deployment Option 3: Firebase Hosting (100% Free)

### Why Firebase Hosting?
- **Completely free**: 10 GB storage, 360 MB/day transfer
- **Global CDN**: Fast worldwide delivery
- **Auto SSL**: Free HTTPS certificates
- **Easy deployment**: Single command deploy

### For Static Frontend + External API

```powershell
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init hosting

# Configure firebase.json
@"
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "backend/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
"@ | Out-File -FilePath firebase.json -Encoding UTF8

# Deploy to Firebase
firebase deploy --only hosting
```

### Connect Custom Domain

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Hosting → Add custom domain
4. Enter `yourdomain.tech`
5. Add DNS records to your .tech domain

---

## 💡 Hybrid Approach (Recommended)

### Frontend: Firebase Hosting (Free)
### Backend: Cloud Run (Free)

This gives you:
- **Free frontend hosting** with global CDN
- **Free backend API** with auto-scaling
- **Free SSL certificates** for both
- **Custom domain support**

### Setup Steps:

1. **Deploy backend to Cloud Run** (steps above)
2. **Deploy frontend to Firebase Hosting**
3. **Update frontend to point to Cloud Run API**

```javascript
// Update your frontend JavaScript
const API_BASE_URL = 'https://cryptodash-xyz123.a.run.app/api';
// Replace with your actual Cloud Run URL
```

---

## 🌐 Domain Configuration for .tech

### DNS Records for Cloud Run
```
Type: CNAME
Name: @
Value: ghs.googlehosted.com
TTL: 300
```

### DNS Records for Compute Engine
```
Type: A
Name: @
Value: [VM External IP]
TTL: 300
```

### DNS Records for Firebase
```
Type: A
Name: @
Value: 199.36.158.100
TTL: 300

Type: CNAME
Name: www
Value: yourdomain.tech
TTL: 300
```

---

## 📊 Cost Comparison

### Option 1: Cloud Run (Serverless)
- **Monthly cost**: $0 (within free tier)
- **Requests**: 2 million/month free
- **Memory**: 512 MB
- **Auto-scaling**: Yes

### Option 2: Compute Engine (VM)
- **Monthly cost**: $0 (f1-micro always free)
- **Memory**: 0.6 GB
- **Storage**: 10 GB
- **Always running**: Yes

### Option 3: Firebase Hosting
- **Monthly cost**: $0
- **Storage**: 10 GB
- **Transfer**: 360 MB/day
- **Global CDN**: Yes

---

## ✅ Testing Your Deployment

### Test Cloud Run
```powershell
# Test API health
curl https://your-cloud-run-url/api/auth/status

# Expected: {"status":"ok","environment":"production"}
```

### Test Compute Engine
```powershell
# Get VM external IP
gcloud compute instances describe cryptodash-vm --zone=us-west1-b --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# Test the application
curl http://[VM-IP]/api/auth/status
```

### Test Firebase
```powershell
# Test frontend
curl https://yourdomain.tech

# Should return your index.html
```

---

## 🔧 Monitoring (Free)

### Google Cloud Monitoring
```powershell
# Enable monitoring API
gcloud services enable monitoring.googleapis.com

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=cryptodash" --limit 50

# View metrics in Console
# Go to: https://console.cloud.google.com/monitoring
```

### Free Monitoring Features
- **Cloud Logging**: 50 GB/month free
- **Cloud Monitoring**: Basic metrics free
- **Error Reporting**: Free
- **Cloud Trace**: Free tier available

---

## 🚀 Your CryptoDash is Now Live!

**Congratulations!** Your cryptocurrency trading platform is now running on Google Cloud Platform completely free!

### What You Get:
- ✅ Professional hosting infrastructure
- ✅ Auto-scaling and high availability
- ✅ Free SSL certificates
- ✅ Global CDN delivery
- ✅ Monitoring and logging
- ✅ Custom domain support

### Next Steps:
1. **Configure your API keys** in the environment
2. **Test all functionality** thoroughly
3. **Set up monitoring alerts**
4. **Plan for scaling** when you outgrow free tier
5. **Consider upgrading** to paid tiers for production

**Your platform is live at**: `https://yourdomain.tech`

**Total Monthly Cost**: $0 🎉
