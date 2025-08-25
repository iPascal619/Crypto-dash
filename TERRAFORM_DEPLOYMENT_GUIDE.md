# Complete Terraform Deployment Guide for CryptoDash
## Deploying Your .tech Domain to AWS

### 🎯 Overview
This guide will walk you through deploying CryptoDash to AWS using Terraform with your .tech domain. Total setup time: 30-45 minutes.

---

## 📋 Prerequisites Checklist

### 1. Required Accounts & Services
- [x] AWS Account (free tier available)
- [x] .tech domain (you already have this!)
- [x] MongoDB Atlas account (free tier available)
- [x] Stripe account (for payments)
- [x] Binance API account (for crypto data)
- [x] Google Cloud Console (for OAuth)

### 2. Required Software
- [ ] AWS CLI
- [ ] Terraform CLI
- [ ] Git
- [ ] Text editor (VS Code)

---

## 🛠️ Step 1: Install Required Software

### Install AWS CLI (Windows)
```powershell
# Download and install AWS CLI
# Go to: https://awscli.amazonaws.com/AWSCLIV2.msi
# Or use winget:
winget install Amazon.AWSCLI
```

### Install Terraform (Windows)
```powershell
# Option 1: Using Chocolatey (recommended)
choco install terraform

# Option 2: Using winget
winget install HashiCorp.Terraform

# Option 3: Manual download
# Go to: https://www.terraform.io/downloads
# Download Windows AMD64 version
# Extract to C:\terraform\
# Add C:\terraform\ to your PATH
```

### Verify Installations
```powershell
# Check AWS CLI
aws --version

# Check Terraform
terraform --version

# Check Git (should already be installed)
git --version
```

---

## 🔑 Step 2: Configure AWS Credentials

### Create AWS IAM User
1. **Go to AWS Console** → IAM → Users → Create User
2. **Username**: `cryptodash-deployer`
3. **Permissions**: Attach existing policies:
   - `AmazonEC2FullAccess`
   - `AmazonS3FullAccess`
   - `AmazonVPCFullAccess`
   - `ElasticLoadBalancingFullAccess`
   - `AWSCertificateManagerFullAccess`
   - `CloudWatchFullAccess`
   - `IAMFullAccess`

4. **Create Access Keys**:
   - Security credentials tab → Create access key
   - Use case: CLI
   - Download the CSV file

### Configure AWS CLI
```powershell
# Configure AWS credentials
aws configure

# Enter when prompted:
# AWS Access Key ID: [Your access key]
# AWS Secret Access Key: [Your secret key]
# Default region name: us-east-1
# Default output format: json
```

### Test AWS Connection
```powershell
# Test AWS connection
aws sts get-caller-identity
```

---

## 🔐 Step 3: Create EC2 Key Pair

```powershell
# Create EC2 key pair for SSH access
aws ec2 create-key-pair --key-name cryptodash-key --query 'KeyMaterial' --output text > cryptodash-key.pem

# Set proper permissions (Windows)
icacls cryptodash-key.pem /inheritance:r
icacls cryptodash-key.pem /grant:r "%USERNAME%":R
```

---

## 🌐 Step 4: Prepare Your .tech Domain

### DNS Management Options

**Option A: Keep DNS with .tech registrar**
- You'll create CNAME records after deployment
- Easier for beginners

**Option B: Transfer DNS to Route 53 (recommended)**
- Better integration with AWS
- Automatic SSL certificate validation

### If using Route 53 (recommended):

1. **Create Hosted Zone**:
```powershell
# Create hosted zone for your domain
aws route53 create-hosted-zone --name yourdomain.tech --caller-reference $(Get-Date).Ticks
```

2. **Update nameservers** at your .tech registrar:
   - Go to your .tech domain management
   - Update nameservers to the 4 NS records from Route 53

---

## 📝 Step 5: Configure Environment Variables

### Update Production Environment File
```powershell
# Navigate to your project
cd "c:\Users\HP\meme coin"

# Copy the template
cp backend\.env.aws.production backend\.env.production.local
```

### Edit the environment file with your actual credentials:
```powershell
# Open in your text editor
code backend\.env.production.local
```

**Required Variables to Update:**
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cryptodash?retryWrites=true&w=majority

# Stripe (get from https://dashboard.stripe.com/apikeys)
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
STRIPE_SECRET_KEY=sk_live_your_secret_key

# Binance API (get from https://www.binance.com/en/my/settings/api-management)
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_secret_key

# Google OAuth (get from https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secure_random_string_here

# Domain Configuration
DOMAIN_NAME=yourdomain.tech
FRONTEND_URL=https://yourdomain.tech
BACKEND_URL=https://yourdomain.tech/api
```

---

## 🚀 Step 6: Configure Terraform

### Navigate to Terraform Directory
```powershell
cd terraform
```

### Create terraform.tfvars file
```powershell
# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
code terraform.tfvars
```

### Update terraform.tfvars with your settings:
```hcl
# Required Variables
key_pair_name = "cryptodash-key"
domain_name   = "yourdomain.tech"  # Replace with your actual .tech domain

# Optional Variables
project_name  = "cryptodash"
environment   = "production"
aws_region    = "us-east-1"
instance_type = "t3.medium"

# Security - restrict access if needed
allowed_cidr_blocks = [
  "0.0.0.0/0"  # Allows access from anywhere
]

# For better security, you can restrict to specific IPs:
# allowed_cidr_blocks = [
#   "203.0.113.0/24",    # Your office/home network
# ]
```

---

## 🏗️ Step 7: Deploy Infrastructure

### Initialize Terraform
```powershell
# Initialize Terraform (downloads providers)
terraform init
```

### Plan Deployment
```powershell
# Review what will be created
terraform plan
```

### Deploy Infrastructure
```powershell
# Apply the configuration
terraform apply

# Type 'yes' when prompted
```

**Deployment time**: 10-15 minutes

### Get Deployment Outputs
```powershell
# Get important URLs and information
terraform output

# Get Load Balancer URL
terraform output load_balancer_url

# Get SSL Certificate ARN
terraform output certificate_arn
```

---

## 🌍 Step 8: Configure DNS

### Get Load Balancer DNS Name
```powershell
$alb_dns = terraform output -raw load_balancer_dns
Write-Host "ALB DNS: $alb_dns"
```

### Configure DNS Records

**Option A: Manual DNS Configuration**
1. Go to your .tech domain DNS management
2. Create these records:
   ```
   Type: CNAME
   Name: @
   Value: [ALB DNS name from above]
   TTL: 300

   Type: CNAME
   Name: www
   Value: [ALB DNS name from above]
   TTL: 300
   ```

**Option B: Route 53 (if you transferred DNS)**
```powershell
# Get Hosted Zone ID
$zone_id = aws route53 list-hosted-zones --query "HostedZones[?Name=='yourdomain.tech.'].Id" --output text

# Create DNS records
aws route53 change-resource-record-sets --hosted-zone-id $zone_id --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "yourdomain.tech",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "'$alb_dns'"}]
    }
  }]
}'
```

---

## 🔒 Step 9: SSL Certificate Validation

### Automatic Validation (Route 53)
If using Route 53, SSL certificates are automatically validated.

### Manual Validation (.tech registrar DNS)
1. **Check Certificate Status**:
```powershell
# Get certificate ARN
$cert_arn = terraform output -raw certificate_arn

# Check certificate validation
aws acm describe-certificate --certificate-arn $cert_arn
```

2. **Add Validation Records**:
   - AWS will provide CNAME records for validation
   - Add these to your .tech domain DNS
   - Format: `_validation.yourdomain.tech` → `validation-value.acm-validations.aws`

---

## 📱 Step 10: Update OAuth and API Configurations

### Google OAuth Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Update **Authorized redirect URIs**:
   ```
   https://yourdomain.tech/api/auth/google/callback
   ```

### Stripe Configuration
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/settings/account)
2. Update webhook endpoints:
   ```
   https://yourdomain.tech/api/payment/webhook
   ```

### Update Server Environment
```powershell
# SSH to your instance (get IP from AWS console)
ssh -i cryptodash-key.pem ec2-user@your-instance-ip

# Update environment file on server
sudo -u cryptodash nano /opt/cryptodash/backend/.env.production

# Restart application
sudo -u cryptodash pm2 restart all
```

---

## ✅ Step 11: Verify Deployment

### Test Application Health
```powershell
# Test API endpoint
curl https://yourdomain.tech/api/auth/status

# Expected response: {"status":"ok","environment":"production"}
```

### Check Application Logs
```powershell
# SSH to instance
ssh -i cryptodash-key.pem ec2-user@your-instance-ip

# Check PM2 status
sudo -u cryptodash pm2 status

# View logs
sudo -u cryptodash pm2 logs

# Check Nginx
sudo systemctl status nginx
```

### Test Complete Application
1. Visit `https://yourdomain.tech`
2. Test user registration
3. Test Google OAuth login
4. Check trading dashboard
5. Verify real-time market data

---

## 📊 Step 12: Monitoring Setup

### CloudWatch Dashboard
```powershell
# Create CloudWatch dashboard
aws cloudwatch put-dashboard --dashboard-name "CryptoDash-Production" --dashboard-body '{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/EC2", "CPUUtilization", "InstanceId", "your-instance-id"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "EC2 CPU Utilization"
      }
    }
  ]
}'
```

### Set Up Alerts
```powershell
# Create CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "CryptoDash-High-CPU" \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

---

## 💰 Cost Estimation

### Monthly AWS Costs (us-east-1)
- **EC2 t3.medium**: ~$30.37/month
- **Application Load Balancer**: ~$18.25/month
- **Data Transfer**: ~$10-50/month (traffic dependent)
- **CloudWatch**: ~$5-10/month
- **S3 Storage**: ~$1-5/month
- **Route 53** (if used): ~$0.50/month per hosted zone

**Total Estimated Cost**: ~$65-120/month

### Cost Optimization Tips
1. **Reserved Instances**: Save 30-40% with 1-year commitment
2. **Spot Instances**: For development environments
3. **CloudWatch Log Retention**: Set to 7-30 days
4. **S3 Lifecycle Policies**: Archive old logs

---

## 🔧 Troubleshooting Common Issues

### Issue 1: Terraform Apply Fails
```powershell
# Check AWS credentials
aws sts get-caller-identity

# Check Terraform state
terraform state list

# Retry with more verbose output
terraform apply -auto-approve
```

### Issue 2: SSL Certificate Not Validating
```powershell
# Check certificate status
aws acm describe-certificate --certificate-arn [cert-arn]

# Verify DNS records
nslookup _validation.yourdomain.tech
```

### Issue 3: Application Not Starting
```powershell
# SSH to instance
ssh -i cryptodash-key.pem ec2-user@your-instance-ip

# Check application logs
sudo -u cryptodash pm2 logs

# Check environment variables
sudo -u cryptodash cat /opt/cryptodash/backend/.env.production

# Restart application
sudo -u cryptodash pm2 restart all
```

### Issue 4: Domain Not Resolving
```powershell
# Check DNS propagation
nslookup yourdomain.tech

# Test with specific DNS server
nslookup yourdomain.tech 8.8.8.8

# Check ALB health
aws elbv2 describe-target-health --target-group-arn [target-group-arn]
```

---

## 🚀 Optional: CI/CD Pipeline Setup

### GitHub Actions Deployment
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
      - name: Terraform Apply
        run: |
          cd terraform
          terraform init
          terraform apply -auto-approve
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## 🎉 Success! Your CryptoDash is Live

Your cryptocurrency trading platform is now running on AWS with:
- ✅ Auto-scaling infrastructure
- ✅ SSL/HTTPS encryption
- ✅ Load balancing
- ✅ Monitoring and logging
- ✅ Automated backups
- ✅ Production-grade security

**Next Steps:**
1. Set up monitoring alerts
2. Configure backup procedures
3. Plan for scaling
4. Security audit
5. Performance optimization

**Your platform is accessible at**: `https://yourdomain.tech`

---

## 📞 Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Terraform Documentation**: https://www.terraform.io/docs/
- **MongoDB Atlas**: https://docs.atlas.mongodb.com/
- **Stripe API**: https://stripe.com/docs/api
- **Binance API**: https://binance-docs.github.io/apidocs/

Remember: Keep your AWS credentials secure and never commit them to version control!
