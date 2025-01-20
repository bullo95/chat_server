#!/bin/bash

# Function to check if SSL certificates are valid
check_ssl() {
    local cert_file="/usr/src/app/ssl/fullchain.pem"
    local key_file="/usr/src/app/ssl/privkey.pem"
    
    # Check if files exist
    if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
        return 1
    fi
    
    # Check certificate validity
    if ! openssl x509 -in "$cert_file" -noout -checkend 0 > /dev/null 2>&1; then
        return 1
    fi
    
    return 0
}

# Function to configure Nginx
configure_nginx() {
    local mode=$1  # 'http' or 'https'
    
    if [ "$mode" = "http" ]; then
        echo "Configuring Nginx for HTTP only..."
        cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 8080 default_server;
    server_name t2m.vigilys.fr;
    
    root /var/www/html;
    index index.html;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:61860/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    else
        echo "Configuring Nginx for HTTP and HTTPS..."
        cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 8080 default_server;
    listen 8080 ssl;
    server_name t2m.vigilys.fr;
    
    ssl_certificate /usr/src/app/ssl/fullchain.pem;
    ssl_certificate_key /usr/src/app/ssl/privkey.pem;
    
    root /var/www/html;
    index index.html;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:61860/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    fi
}

# Step 1: Clone and build frontend if not already present
echo "Setting up frontend..."
if [ ! -d "/usr/src/frontend" ]; then
    git clone https://github.com/bullo95/chat_frontend.git /usr/src/frontend
    cd /usr/src/frontend
    npm install
    npm run build
    cd /usr/src/app
fi

# Copy frontend files to Nginx directory
echo "Copying frontend files to Nginx directory..."
mkdir -p /var/www/html
rm -rf /var/www/html/*
cp -r /usr/src/frontend/dist/* /var/www/html/

# Step 2: Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
while ! mysqladmin ping -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" --silent; do
    sleep 1
done
echo "MySQL is ready"

# Step 3: Start Node.js
echo "Starting Node.js application..."
node server.js &
NODE_PID=$!

# Wait for Node.js to start
echo "Waiting for Node.js to be ready..."
until curl -s http://localhost:61860/health >/dev/null 2>&1; do
    if ! kill -0 $NODE_PID 2>/dev/null; then
        echo "Node.js process died"
        exit 1
    fi
    sleep 1
done
echo "Node.js is ready"

# Step 4: Check SSL certificates and configure Nginx
if check_ssl; then
    echo "Valid SSL certificates found, configuring HTTPS..."
    configure_nginx https
else
    echo "No valid SSL certificates found, starting with HTTP only..."
    configure_nginx http
    
    # Try to get new certificates
    echo "Attempting to obtain SSL certificates..."
    if ./scripts/setup-ssl.sh && check_ssl; then
        echo "Successfully obtained SSL certificates, reconfiguring for HTTPS..."
        configure_nginx https
    else
        echo "Failed to obtain SSL certificates, continuing with HTTP only"
    fi
fi

# Start Nginx
echo "Starting Nginx..."
nginx -t && service nginx start

# Monitor processes
while true; do
    if ! kill -0 $NODE_PID 2>/dev/null; then
        echo "Node.js process died"
        exit 1
    fi
    if ! service nginx status >/dev/null 2>&1; then
        echo "Nginx process died"
        exit 1
    fi
    sleep 10
done
