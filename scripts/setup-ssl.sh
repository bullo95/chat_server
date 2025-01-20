#!/bin/bash
set -e

# Configuration variables
DOMAIN="${DOMAIN:-t2m.vigilys.fr}"
EMAIL="${EMAIL:-domenech.bruno@me.com}"
SSL_DIR="/usr/src/app/ssl"

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

echo "Setting up Let's Encrypt certificates..."

# Ensure nginx is not running
if pgrep nginx > /dev/null; then
    echo "Stopping nginx..."
    service nginx stop
fi

# Wait a moment for the port to be fully released
sleep 2

# Request the certificate using standalone mode
echo "Requesting certificate for $DOMAIN..."
if ! certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domain "$DOMAIN" \
    --preferred-challenges http \
    --debug-challenges \
    --verbose 2>&1 | tee /var/log/certbot.log; then
    
    echo "Certbot failed. Displaying logs:"
    echo "=== certbot.log ==="
    cat /var/log/certbot.log
    echo "=== letsencrypt.log ==="
    cat /var/log/letsencrypt/letsencrypt.log
    exit 1
fi

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
    echo "Failed to generate certificates. Check logs above for details."
    exit 1
fi

# Start the Node.js application
exec node server.js
