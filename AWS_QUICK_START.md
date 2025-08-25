# AWS Deployment Quick Start Guide

## Prerequisites

Before deploying CryptoDash to AWS, ensure you have:

1. **AWS Account** with appropriate permissions
2. **Domain name** registered and ready for use
3. **AWS CLI** installed and configured
4. **Production credentials** for all external services

## Deployment Options

Choose one of these deployment methods:

### Option 1: CloudFormation (Recommended for beginners)
### Option 2: Terraform (Recommended for advanced users)
### Option 3: Manual EC2 deployment

---

## Option 1: CloudFormation Deployment

### Step 1: Prepare Your Environment

1. **Create EC2 Key Pair:**
```bash
aws ec2 create-key-pair --key-name cryptodash-key --query 'KeyMaterial' --output text > cryptodash-key.pem
chmod 400 cryptodash-key.pem
```

2. **Update Environment Variables:**
   - Edit `backend/.env.aws.production`
   - Add your production API keys and credentials

### Step 2: Deploy with CloudFormation

```bash
# Deploy the stack
aws cloudformation create-stack \
  --stack-name cryptodash-production \
  --template-body file://cloudformation-template.yaml \
  --parameters ParameterKey=KeyPairName,ParameterValue=cryptodash-key \
               ParameterKey=DomainName,ParameterValue=yourdomain.com \
               ParameterKey=InstanceType,ParameterValue=t3.medium \
  --capabilities CAPABILITY_IAM

# Monitor deployment
aws cloudformation describe-stacks --stack-name cryptodash-production
```

### Step 3: Configure DNS

1. Get the Load Balancer DNS name:
```bash
aws cloudformation describe-stacks \
  --stack-name cryptodash-production \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text
```

2. Create CNAME record in your DNS provider pointing to the ALB DNS name

---

## Option 2: Terraform Deployment

### Step 1: Install Terraform

Download from: https://www.terraform.io/downloads

### Step 2: Configure Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
key_pair_name = "your-key-pair-name"
domain_name   = "yourdomain.com"
project_name  = "cryptodash"
environment   = "production"
aws_region    = "us-east-1"
instance_type = "t3.medium"
```

### Step 3: Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply configuration
terraform apply
```

### Step 4: Get Outputs

```bash
# Get Load Balancer URL
terraform output load_balancer_url

# Get SSL Certificate ARN
terraform output certificate_arn
```

---

## Option 3: Manual EC2 Deployment

### Step 1: Launch EC2 Instance

1. **Launch EC2 Instance:**
   - AMI: Amazon Linux 2
   - Instance Type: t3.medium or larger
   - Security Group: Ports 22, 80, 443, 3001
   - Key Pair: Your SSH key

2. **Connect to Instance:**
```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

### Step 2: Run Deployment Script

```bash
# Download and run the deployment script
curl -o aws-deploy.sh https://raw.githubusercontent.com/your-repo/aws-deploy.sh
chmod +x aws-deploy.sh
sudo ./aws-deploy.sh
```

---

## Post-Deployment Configuration

### 1. SSL Certificate Setup

For CloudFormation/Terraform deployments:
- Certificate is automatically requested via AWS Certificate Manager
- DNS validation records will be created
- Add the CNAME records to your DNS provider

For manual deployment:
```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Request SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 2. Environment Variables

Update production environment variables on the server:

```bash
# SSH to your instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Edit environment file
sudo -u cryptodash nano /opt/cryptodash/backend/.env.production

# Restart application
sudo -u cryptodash pm2 restart all
```

Required environment variables:
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `STRIPE_SECRET_KEY`: Your Stripe production secret key
- `BINANCE_API_KEY`: Your Binance API key
- `BINANCE_API_SECRET`: Your Binance API secret
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
- `JWT_SECRET`: Strong random secret for JWT tokens

### 3. Domain Configuration

1. **Point domain to Load Balancer:**
   - Type: CNAME
   - Name: @ (or www)
   - Value: your-alb-dns-name

2. **Verify SSL certificate validation:**
   - Check ACM console for certificate status
   - Add required DNS validation records

### 4. Health Checks

Verify deployment:
```bash
# Check application status
curl https://yourdomain.com/api/auth/status

# Check PM2 processes
sudo -u cryptodash pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check logs
sudo -u cryptodash pm2 logs
```

---

## Monitoring and Maintenance

### CloudWatch Logs

View application logs in AWS CloudWatch:
- Log Group: `/aws/cryptodash/production`
- Streams: app, payment, nginx-access, nginx-error

### Performance Monitoring

Key metrics to monitor:
- EC2 CPU utilization
- Memory usage
- Disk space
- Network traffic
- Application response times

### Backup Strategy

1. **Database Backups:**
   - MongoDB Atlas automatic backups (recommended)
   - Regular exports for additional safety

2. **Application Backups:**
   - S3 bucket for configuration backups
   - AMI snapshots for disaster recovery

### Security Updates

Automatic security updates are configured, but manual checks recommended:
```bash
# Check for updates
sudo yum check-update

# Apply security updates
sudo yum update -y --security
```

---

## Scaling Considerations

### Auto Scaling

The Terraform/CloudFormation templates include Auto Scaling Groups:
- Min instances: 1
- Max instances: 3
- Scaling triggers: CPU > 70% or < 30%

### Database Scaling

For high traffic:
- Upgrade MongoDB Atlas cluster
- Enable sharding if needed
- Add read replicas

### CDN Integration

For better performance:
- Add CloudFront distribution
- Cache static assets
- Optimize image delivery

---

## Troubleshooting

### Common Issues

1. **Application won't start:**
```bash
# Check PM2 logs
sudo -u cryptodash pm2 logs

# Check environment variables
sudo -u cryptodash cat /opt/cryptodash/backend/.env.production

# Restart application
sudo -u cryptodash pm2 restart all
```

2. **SSL certificate issues:**
```bash
# Check certificate status
aws acm list-certificates

# Verify DNS records
dig CNAME _validation.yourdomain.com
```

3. **Connection issues:**
```bash
# Check security groups
aws ec2 describe-security-groups --group-names cryptodash-app-sg

# Check load balancer health
aws elbv2 describe-target-health --target-group-arn your-target-group-arn
```

### Support Resources

- AWS Documentation: https://docs.aws.amazon.com/
- CryptoDash GitHub Issues: [Your repository issues page]
- AWS Support: Available through AWS Console

---

## Cost Optimization

### Expected Monthly Costs (us-east-1)

- **t3.medium EC2**: ~$30/month
- **Application Load Balancer**: ~$18/month
- **Data Transfer**: ~$10-50/month (depending on traffic)
- **CloudWatch Logs**: ~$5-15/month
- **Total**: ~$65-115/month

### Cost Reduction Tips

1. Use Reserved Instances for 1-year commitment (30-40% savings)
2. Set up billing alerts
3. Use Spot Instances for development environments
4. Implement proper log retention policies
5. Monitor and optimize data transfer costs

---

## Next Steps

After successful deployment:

1. **Configure monitoring alerts**
2. **Set up backup procedures**
3. **Implement CI/CD pipeline**
4. **Performance testing and optimization**
5. **Security audit and penetration testing**

Your CryptoDash platform is now ready for production use on AWS!
