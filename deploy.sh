#!/bin/bash

# CryptoDash Production Deployment Script
echo "🚀 Starting CryptoDash deployment..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install MongoDB tools (optional)
sudo apt install -y mongodb-tools

# Clone your repository (replace with your actual repo)
git clone https://github.com/your-username/cryptodash.git
cd cryptodash

# Install dependencies
npm run build

# Create production environment file
cp backend/.env.example backend/.env.production
echo "⚠️  Please edit backend/.env.production with your production credentials"

# Set up SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/cryptodash > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL configuration (will be added by certbot)
    
    # Static files
    location / {
        root /home/ubuntu/cryptodash;
        try_files \$uri \$uri/ /index.html;
    }

    # API routes
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support
    location /ws/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/cryptodash /etc/nginx/sites-enabled/
sudo nginx -t

# Start services
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Enable Nginx
sudo systemctl enable nginx
sudo systemctl restart nginx

echo "✅ Deployment complete!"
echo "📝 Next steps:"
echo "1. Edit backend/.env.production with your production credentials"
echo "2. Update your domain in the Nginx config"
echo "3. Run: sudo certbot --nginx -d your-domain.com"
echo "4. PM2 status: pm2 status"
echo "5. View logs: pm2 logs cryptodash"
