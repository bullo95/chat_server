#!/bin/bash
set -e

# Configuration variables
DOMAIN="${DOMAIN:-t2m.vigilys.fr}"
EMAIL="${EMAIL:-domenech.bruno@me.com}"
SSL_DIR="/usr/src/app/ssl"
WEBROOT="/var/www/html"

# Create required directories
mkdir -p "$SSL_DIR"
mkdir -p "$WEBROOT/.well-known/acme-challenge"
chmod -R 755 "$WEBROOT"

echo "Setting up Let's Encrypt certificates..."

# Ensure nginx is not running
if pgrep nginx > /dev/null; then
    echo "Stopping nginx..."
    service nginx stop
fi

# Request the certificate using webroot method
echo "Requesting certificate for $DOMAIN..."
certbot certonly \
    --webroot \
    --webroot-path "$WEBROOT" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domain "$DOMAIN" \
    --preferred-challenges http-01 \
    -v

# Check if certificates were generated successfully
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "Certificates generated successfully. Copying to SSL directory..."
    
    # Copy certificates to the application SSL directory
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/"
    
    # Set proper permissions
    chmod 644 "$SSL_DIR/fullchain.pem"
    chmod 644 "$SSL_DIR/privkey.pem"
    
    echo "SSL setup completed successfully!"
else
    echo "Failed to generate certificates. Check /var/log/letsencrypt/letsencrypt.log for details."
    exit 1
fi

# Start the Node.js application
exec node server.js
