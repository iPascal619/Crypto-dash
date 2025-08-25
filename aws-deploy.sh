#!/bin/bash

# CryptoDash AWS EC2 Deployment Script
# Run this script on your EC2 instance

set -e

echo "🚀 Starting CryptoDash AWS deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
print_status "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
if node --version; then
    print_status "Node.js installed: $(node --version)"
else
    print_error "Node.js installation failed"
    exit 1
fi

# Install PM2 globally
print_status "Installing PM2..."
sudo npm install -g pm2

# Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx

# Install Certbot for SSL
print_status "Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Install additional tools
print_status "Installing additional tools..."
sudo apt install -y git htop curl wget unzip

# Create application user (optional security improvement)
print_status "Creating application user..."
sudo useradd -m -s /bin/bash cryptodash || true
sudo usermod -aG sudo cryptodash || true

# Clone repository (update with actual repo URL)
print_status "Cloning CryptoDash repository..."
if [ ! -d "/home/ubuntu/cryptodash" ]; then
    git clone https://github.com/Isaiah-Essien/Negpod6-GCS-1-project.git /home/ubuntu/cryptodash
    cd /home/ubuntu/cryptodash
else
    cd /home/ubuntu/cryptodash
    git pull origin main
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
npm install
cd ..

# Create logs directory
print_status "Creating logs directory..."
mkdir -p logs
chmod 755 logs

# Copy environment template
print_status "Setting up environment configuration..."
if [ ! -f "backend/.env.production" ]; then
    cp backend/.env backend/.env.production
    print_warning "Please edit backend/.env.production with your production credentials"
fi

# Create Nginx configuration
print_status "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/cryptodash > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;
    
    # Redirect HTTP to HTTPS (will be updated after SSL setup)
    # return 301 https://$server_name$request_uri;
    
    # Temporary HTTP configuration
    root /home/ubuntu/cryptodash;
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
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    # Fallback to Node.js
    location @nodejs {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Optimize static assets
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
EOF

# Enable Nginx site
print_status "Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/cryptodash /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if sudo nginx -t; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration error"
    exit 1
fi

# Start Nginx
print_status "Starting Nginx..."
sudo systemctl enable nginx
sudo systemctl restart nginx

# Setup firewall
print_status "Configuring UFW firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3001

# Install AWS CloudWatch agent (optional)
print_status "Installing AWS CloudWatch agent..."
wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb || sudo apt-get install -f -y
rm amazon-cloudwatch-agent.deb

# Set correct permissions
print_status "Setting file permissions..."
sudo chown -R ubuntu:ubuntu /home/ubuntu/cryptodash
chmod +x /home/ubuntu/cryptodash/backend/server.js

# Start application with PM2
print_status "Starting CryptoDash with PM2..."
cd /home/ubuntu/cryptodash
NODE_ENV=production pm2 start ecosystem.config.js
pm2 save
pm2 startup | grep -E '^sudo' | bash || true

# Create health check script
print_status "Creating health check script..."
cat > /home/ubuntu/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for CryptoDash

check_service() {
    local service_name=$1
    local url=$2
    
    if curl -f -s "$url" > /dev/null; then
        echo "✅ $service_name is healthy"
        return 0
    else
        echo "❌ $service_name is down"
        return 1
    fi
}

echo "🔍 CryptoDash Health Check $(date)"
echo "================================"

# Check Nginx
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is down"
fi

# Check PM2
if pm2 list | grep -q "online"; then
    echo "✅ PM2 processes are running"
else
    echo "❌ PM2 processes are down"
fi

# Check application endpoints
check_service "Frontend" "http://localhost"
check_service "API" "http://localhost:3001/api/auth/status"

echo "================================"
EOF

chmod +x /home/ubuntu/health-check.sh

# Setup log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/cryptodash > /dev/null <<'EOF'
/home/ubuntu/cryptodash/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        pm2 reload ecosystem.config.js
    endscript
}
EOF

# Create deployment info file
print_status "Creating deployment info..."
cat > /home/ubuntu/deployment-info.txt << EOF
CryptoDash Deployment Information
================================
Deployment Date: $(date)
Node.js Version: $(node --version)
PM2 Version: $(pm2 --version)
Nginx Version: $(nginx -v 2>&1)
Server IP: $(curl -s http://checkip.amazonaws.com/)

Next Steps:
1. Update backend/.env.production with production credentials
2. Configure your domain DNS to point to this server IP
3. Run SSL setup: sudo certbot --nginx -d your-domain.com
4. Monitor application: pm2 monit
5. Check logs: pm2 logs
6. Health check: /home/ubuntu/health-check.sh

Useful Commands:
- Restart app: pm2 restart ecosystem.config.js
- View logs: pm2 logs
- Nginx reload: sudo systemctl reload nginx
- Health check: ./health-check.sh
EOF

print_status "Deployment completed successfully! 🎉"
print_status "Server IP: $(curl -s http://checkip.amazonaws.com/)"
echo ""
print_warning "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Edit backend/.env.production with your production credentials"
echo "2. Configure your domain DNS to point to this server"
echo "3. Setup SSL: sudo certbot --nginx -d your-domain.com"
echo "4. Monitor: pm2 monit"
echo ""
print_status "View deployment info: cat /home/ubuntu/deployment-info.txt"
print_status "Run health check: /home/ubuntu/health-check.sh"
