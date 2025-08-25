#!/bin/bash

# CryptoDash User Data Script for AWS EC2
# This script runs when the instance starts

set -e

# Variables (passed from Terraform)
PROJECT_NAME="${project_name}"
ENVIRONMENT="${environment}"
REGION="${region}"

# Update system
echo "Updating system packages..."
yum update -y

# Install dependencies
echo "Installing dependencies..."
yum install -y git curl wget

# Install Node.js 18
echo "Installing Node.js 18..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PM2 globally
echo "Installing PM2..."
npm install -g pm2

# Install Nginx
echo "Installing Nginx..."
amazon-linux-extras install nginx1 -y

# Create application user
echo "Creating application user..."
useradd -m -s /bin/bash cryptodash
usermod -aG wheel cryptodash

# Create application directory
echo "Setting up application directory..."
mkdir -p /opt/cryptodash
chown cryptodash:cryptodash /opt/cryptodash

# Switch to application user for Git operations
sudo -u cryptodash bash << 'EOF'
cd /opt/cryptodash

# Clone the repository
echo "Cloning repository..."
git clone https://github.com/Isaiah-Essien/Negpod6-GCS-1-project.git .

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install --production

# Create logs directory
mkdir -p ../logs
mkdir -p logs

# Create environment file from template
echo "Setting up environment file..."
cp .env.aws.production .env.production

# Update environment file with instance metadata
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
PUBLIC_IP=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)

# Update environment variables
sed -i "s/INSTANCE_ID=.*/INSTANCE_ID=$INSTANCE_ID/" .env.production
sed -i "s/PUBLIC_IP=.*/PUBLIC_IP=$PUBLIC_IP/" .env.production
sed -i "s/AWS_REGION=.*/AWS_REGION=${REGION}/" .env.production

echo "Environment file configured with instance metadata"
EOF

# Configure Nginx
echo "Configuring Nginx..."
cat > /etc/nginx/conf.d/cryptodash.conf << 'EOF'
upstream cryptodash_backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Static files
    location / {
        root /opt/cryptodash;
        try_files $uri $uri/ @backend;
        index index.html;
        
        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API requests
    location /api/ {
        proxy_pass http://cryptodash_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout       60s;
        proxy_send_timeout          60s;
        proxy_read_timeout          60s;
    }
    
    # WebSocket support for real-time data
    location /socket.io/ {
        proxy_pass http://cryptodash_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend fallback
    location @backend {
        proxy_pass http://cryptodash_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Test Nginx configuration
nginx -t

# Enable and start Nginx
systemctl enable nginx
systemctl start nginx

# Install CloudWatch agent
echo "Installing CloudWatch agent..."
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
    "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "root"
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/opt/cryptodash/logs/app.log",
                        "log_group_name": "/aws/${PROJECT_NAME}/${ENVIRONMENT}",
                        "log_stream_name": "{instance_id}/app"
                    },
                    {
                        "file_path": "/opt/cryptodash/backend/logs/payment.log",
                        "log_group_name": "/aws/${PROJECT_NAME}/${ENVIRONMENT}",
                        "log_stream_name": "{instance_id}/payment"
                    },
                    {
                        "file_path": "/var/log/nginx/access.log",
                        "log_group_name": "/aws/${PROJECT_NAME}/${ENVIRONMENT}",
                        "log_stream_name": "{instance_id}/nginx-access"
                    },
                    {
                        "file_path": "/var/log/nginx/error.log",
                        "log_group_name": "/aws/${PROJECT_NAME}/${ENVIRONMENT}",
                        "log_stream_name": "{instance_id}/nginx-error"
                    }
                ]
            }
        }
    },
    "metrics": {
        "namespace": "CryptoDash/${ENVIRONMENT}",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60,
                "totalcpu": false
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "diskio": {
                "measurement": [
                    "io_time"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            },
            "netstat": {
                "measurement": [
                    "tcp_established",
                    "tcp_time_wait"
                ],
                "metrics_collection_interval": 60
            },
            "swap": {
                "measurement": [
                    "swap_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
    -s

# Setup log rotation
cat > /etc/logrotate.d/cryptodash << 'EOF'
/opt/cryptodash/logs/*.log
/opt/cryptodash/backend/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF

# Start the application as cryptodash user
sudo -u cryptodash bash << 'EOF'
cd /opt/cryptodash

# Start application with PM2
echo "Starting CryptoDash application..."
NODE_ENV=production pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup systemd -u cryptodash --hp /home/cryptodash
EOF

# Configure PM2 startup service
systemctl enable pm2-cryptodash
systemctl start pm2-cryptodash

# Setup firewall
echo "Configuring firewall..."
yum install -y firewalld
systemctl enable firewalld
systemctl start firewalld

# Open necessary ports
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload

# Create health check script
cat > /usr/local/bin/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for CryptoDash

APP_URL="http://localhost:3001/api/auth/status"
NGINX_URL="http://localhost/health"

# Check application
if curl -f -s "$APP_URL" > /dev/null; then
    echo "$(date): Application is healthy"
else
    echo "$(date): Application is unhealthy, restarting..."
    sudo -u cryptodash pm2 restart ecosystem.config.js
fi

# Check Nginx
if curl -f -s "$NGINX_URL" > /dev/null; then
    echo "$(date): Nginx is healthy"
else
    echo "$(date): Nginx is unhealthy, restarting..."
    systemctl restart nginx
fi
EOF

chmod +x /usr/local/bin/health-check.sh

# Setup cron job for health checks
echo "*/5 * * * * /usr/local/bin/health-check.sh >> /var/log/health-check.log 2>&1" | crontab -

# Setup automatic security updates
yum install -y yum-cron
systemctl enable yum-cron
systemctl start yum-cron

# Configure automatic security updates
sed -i 's/apply_updates = no/apply_updates = yes/' /etc/yum/yum-cron.conf
sed -i 's/update_level = default/update_level = security/' /etc/yum/yum-cron.conf

echo "CryptoDash deployment completed successfully!"
echo "Application should be available at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "Please check the application logs: sudo -u cryptodash pm2 logs"
echo "Nginx logs: /var/log/nginx/error.log"
