#!/bin/bash

# Configuration variables
DOMAIN="bdomenech.freeboxos.fr"
EMAIL="test@example.com"  # Change this to your email
CERTBOT_PATH="/etc/letsencrypt/live/$DOMAIN"

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apk add --no-cache certbot
fi

# Create directory for certificates if it doesn't exist
mkdir -p /etc/letsencrypt
mkdir -p /var/lib/letsencrypt
mkdir -p /var/log/letsencrypt

# Request certificate
echo "Requesting SSL certificate for $DOMAIN..."
certbot certonly \
    --standalone \
    --preferred-challenges http \
    --agree-tos \
    --email $EMAIL \
    --domain $DOMAIN \
    --non-interactive

# Check if certificate was obtained successfully
if [ -d "$CERTBOT_PATH" ]; then
    echo "SSL certificate obtained successfully!"
    
    # Create ssl directory if it doesn't exist
    mkdir -p /usr/src/app/ssl
    
    # Copy certificates to app directory
    cp "$CERTBOT_PATH/privkey.pem" /usr/src/app/ssl/
    cp "$CERTBOT_PATH/fullchain.pem" /usr/src/app/ssl/
    
    # Set proper permissions
    chmod 600 /usr/src/app/ssl/privkey.pem
    chmod 600 /usr/src/app/ssl/fullchain.pem
    
    echo "Certificates copied to /usr/src/app/ssl/"
else
    echo "Failed to obtain SSL certificate"
    exit 1
fi

# Set up auto-renewal
echo "Setting up auto-renewal..."
(crontab -l 2>/dev/null; echo "0 0 1 * * certbot renew --quiet") | crontab -

echo "SSL setup completed!"
