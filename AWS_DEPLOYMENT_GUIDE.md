# 🚀 CryptoDash AWS Deployment Guide

## 🎯 AWS Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   Application   │    │    Database     │
│   (CDN/HTTPS)   │    │  Load Balancer  │    │  MongoDB Atlas  │
│                 │    │      (ALB)      │    │  (or DocumentDB) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   S3 Bucket     │    │   EC2 Instance  │    │   ElastiCache   │
│ (Static Assets) │    │  (Auto Scaling) │    │    (Redis)      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

### **1. AWS Account Setup**
- [ ] AWS Account with billing enabled
- [ ] AWS CLI installed and configured
- [ ] IAM user with appropriate permissions
- [ ] Key pair for EC2 access

### **2. Domain and SSL**
- [ ] Domain name purchased (Route 53 or external)
- [ ] SSL certificate (AWS Certificate Manager)

### **3. Production Credentials**
- [ ] MongoDB Atlas production cluster
- [ ] Stripe live API keys
- [ ] Google OAuth production credentials
- [ ] Binance production API keys

## 🔧 Step-by-Step AWS Deployment

### **Step 1: Create EC2 Instance**

**Launch EC2 Instance:**
1. Go to AWS Console → EC2 → Launch Instance
2. **AMI**: Ubuntu Server 22.04 LTS
3. **Instance Type**: t3.medium (2 vCPU, 4 GB RAM) - minimum
4. **Key Pair**: Create or select existing
5. **Security Group**: Configure ports (80, 443, 22, 3001)
6. **Storage**: 20 GB gp3 SSD minimum

**Security Group Rules:**
```
Type        Protocol    Port Range    Source          Description
SSH         TCP         22           Your IP         SSH access
HTTP        TCP         80           0.0.0.0/0       HTTP traffic
HTTPS       TCP         443          0.0.0.0/0       HTTPS traffic
Custom TCP  TCP         3001         0.0.0.0/0       Node.js app
```

### **Step 2: Connect and Setup Server**

**Connect to EC2:**
```bash
# Replace with your key and instance details
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
```

**Initial Server Setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2, Nginx, and other tools
sudo npm install -g pm2
sudo apt install -y nginx certbot python3-certbot-nginx git htop

# Verify installations
node --version
npm --version
pm2 --version
nginx -v
```

### **Step 3: Deploy Application**

**Clone and Setup:**
```bash
# Clone your repository (update with your actual repo)
git clone https://github.com/Isaiah-Essien/Negpod6-GCS-1-project.git
cd Negpod6-GCS-1-project

# Install dependencies
cd backend
npm install
cd ..

# Create logs directory
mkdir -p logs

# Copy environment file
cp backend/.env backend/.env.production
```

**Configure Production Environment:**
```bash
# Edit production environment
sudo nano backend/.env.production

# Update with production values:
# - MongoDB Atlas production URI
# - Live Stripe keys
# - Production Google OAuth
# - Production domain CORS settings
```

### **Step 4: Configure Nginx**

**Create Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/cryptodash
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration (Let's Encrypt will add certificates)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Root directory for static files
    root /home/ubuntu/Negpod6-GCS-1-project;
    index index.html;
    
    # Serve static files
    location / {
        try_files $uri $uri/ @nodejs;
    }
    
    # API routes to Node.js backend
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
        proxy_read_timeout 86400;
    }
    
    # WebSocket support for real-time data
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Fallback to Node.js for SPA routing
    location @nodejs {
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
    
    # Optimize static asset delivery
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security: Hide sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ /backend/ {
        deny all;
    }
}
```

**Enable Nginx Site:**
```bash
# Create the configuration file
sudo nano /etc/nginx/sites-available/cryptodash
# Paste the configuration above

# Enable the site
sudo ln -s /etc/nginx/sites-available/cryptodash /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Start Nginx
sudo systemctl enable nginx
sudo systemctl restart nginx
```

### **Step 5: SSL Certificate Setup**

**Get Let's Encrypt Certificate:**
```bash
# Make sure your domain points to your EC2 IP first
# Then run:
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run

# Set up automatic renewal
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### **Step 6: Start Application with PM2**

**Start with PM2:**
```bash
# Navigate to project directory
cd /home/ubuntu/Negpod6-GCS-1-project

# Start application
NODE_ENV=production pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown

# Monitor application
pm2 monit
```

## 🔧 Advanced AWS Services Integration

### **Option 1: Application Load Balancer (ALB)**

**Create ALB for High Availability:**
1. Go to EC2 → Load Balancers → Create Application Load Balancer
2. **Scheme**: Internet-facing
3. **IP address type**: IPv4
4. **Listeners**: HTTP (80) and HTTPS (443)
5. **Availability Zones**: Select multiple AZs
6. **Security Groups**: Allow HTTP/HTTPS traffic
7. **Target Groups**: Create target group for EC2 instances

### **Option 2: Auto Scaling Group**

**Create Launch Template:**
```bash
# Create AMI from your configured instance
# EC2 → Instances → Select Instance → Actions → Image and templates → Create image

# Create Launch Template
# EC2 → Launch Templates → Create launch template
# Use your custom AMI with CryptoDash pre-installed
```

### **Option 3: RDS for Database (Alternative to MongoDB Atlas)**

**Setup MongoDB on DocumentDB:**
1. Go to Amazon DocumentDB
2. Create cluster with production settings
3. Update connection string in .env.production

### **Option 4: ElastiCache for Redis**

**Setup Redis Cache:**
1. Go to ElastiCache → Redis
2. Create cluster for session storage
3. Update application to use Redis sessions

### **Option 5: CloudFront CDN**

**Setup CDN:**
1. Go to CloudFront → Create Distribution
2. **Origin**: Your ALB or EC2 instance
3. **Behaviors**: Cache static assets
4. **SSL**: Use AWS Certificate Manager

## 📊 Monitoring and Logging

### **CloudWatch Setup**

**Install CloudWatch Agent:**
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

**Custom Metrics:**
```javascript
// Add to your Node.js application
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

// Example: Track user registrations
const params = {
    Namespace: 'CryptoDash/Users',
    MetricData: [{
        MetricName: 'UserRegistrations',
        Value: 1,
        Unit: 'Count',
        Timestamp: new Date()
    }]
};

cloudwatch.putMetricData(params).promise();
```

### **Log Aggregation**

**Setup Centralized Logging:**
```bash
# Install AWS Logs Agent
sudo apt install awslogs

# Configure log groups in CloudWatch
# /var/log/awslogs.conf
```

## 🔒 Security Best Practices

### **IAM Roles and Policies**

**Create IAM Role for EC2:**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "cloudwatch:PutMetricData"
            ],
            "Resource": "*"
        }
    ]
}
```

### **Security Groups**

**Restrict Access:**
- SSH (22): Only your IP
- HTTP/HTTPS (80/443): 0.0.0.0/0
- Application (3001): Only from ALB security group

### **VPC Configuration**

**Network Security:**
- Use private subnets for application servers
- Public subnets only for load balancers
- NAT Gateway for outbound internet access
- VPC Flow Logs for monitoring

## 📈 Performance Optimization

### **Database Optimization**
```javascript
// Connection pooling
mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
});
```

### **Caching Strategy**
```javascript
// Redis caching
const redis = require('redis');
const client = redis.createClient({
    host: 'your-elasticache-endpoint'
});

// Cache frequently accessed data
const cacheKey = `prices:${symbol}`;
const cachedData = await client.get(cacheKey);
```

### **Load Testing**
```bash
# Install Artillery for load testing
npm install -g artillery

# Create test script
artillery quick --count 10 --num 100 https://your-domain.com/api/market/prices
```

## 🚨 Disaster Recovery

### **Backup Strategy**
```bash
# Automated EC2 snapshots
aws ec2 create-snapshot --volume-id vol-xxxxxxxxx --description "CryptoDash backup"

# MongoDB Atlas automatic backups (recommended)
# Or manual backup script for self-hosted MongoDB
```

### **Multi-Region Setup**
- Primary region: us-east-1
- Backup region: us-west-2
- Database replication
- DNS failover with Route 53

## 💰 Cost Optimization

### **Instance Sizing**
- **Development**: t3.micro ($8/month)
- **Production**: t3.medium ($30/month)
- **High Traffic**: c5.large ($60/month)

### **Reserved Instances**
- Save 30-60% with 1-3 year commitments
- Use for stable production workloads

### **Spot Instances**
- Use for development/testing environments
- Save up to 90% on compute costs

## 📞 Deployment Commands Summary

```bash
# 1. Launch EC2 instance (via AWS Console)
# 2. Connect via SSH
ssh -i "your-key.pem" ubuntu@your-ec2-ip

# 3. Run deployment commands
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
sudo apt install -y nginx certbot python3-certbot-nginx git

# 4. Clone and setup
git clone https://github.com/Isaiah-Essien/Negpod6-GCS-1-project.git
cd Negpod6-GCS-1-project
cd backend && npm install && cd ..

# 5. Configure Nginx
sudo nano /etc/nginx/sites-available/cryptodash
sudo ln -s /etc/nginx/sites-available/cryptodash /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 6. Setup SSL
sudo certbot --nginx -d your-domain.com

# 7. Start application
NODE_ENV=production pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

## 🎯 Next Steps After Deployment

1. **Domain Setup**: Configure Route 53 or update DNS
2. **SSL Certificate**: Setup automatic renewal
3. **Monitoring**: Configure CloudWatch alarms
4. **Backups**: Setup automated backup strategy
5. **Security**: Enable WAF and GuardDuty
6. **Performance**: Setup CloudFront CDN
7. **Scaling**: Configure Auto Scaling Groups

**Estimated Costs:**
- Basic Setup: $30-50/month
- Production Setup: $100-200/month
- Enterprise Setup: $300-500/month

Ready to start the deployment? Let me know if you need help with any specific step!
