#!/bin/bash
set -e

# Enable debug mode
set -x

# Configuration variables
DOMAIN="${DOMAIN:-backend.vigilys.fr}"
EMAIL="${EMAIL:-domenech.bruno@me.com}"
SSL_DIR="/usr/src/app/ssl"

echo "Setting up Let's Encrypt certificates (using staging environment)..."
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"

# Ensure proper permissions
chown -R www-data:www-data /etc/letsencrypt
chown -R www-data:www-data /var/log/letsencrypt
chown -R www-data:www-data /var/lib/letsencrypt
chmod -R 755 /etc/letsencrypt

# Clean up any previous certificate attempts
rm -rf /etc/letsencrypt/live/${DOMAIN}* || true
rm -rf /etc/letsencrypt/archive/${DOMAIN}* || true
rm -rf /etc/letsencrypt/renewal/${DOMAIN}* || true

# Stop nginx if it's running
if pgrep nginx > /dev/null; then
    echo "Stopping nginx..."
    nginx -s stop || true
    sleep 2
fi

# Make sure port 80 is free
if lsof -i:80 > /dev/null 2>&1; then
    echo "Port 80 is still in use. Killing processes..."
    lsof -t -i:80 | xargs kill -9 || true
    sleep 2
fi

# Start nginx with a fresh configuration
echo "Starting nginx..."
nginx

# Request the certificate using nginx plugin with staging environment
echo "Requesting certificate for $DOMAIN..."
if ! certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domain "$DOMAIN" \
    --staging \
    --debug \
    --verbose \
    --logs-dir /var/log/letsencrypt \
    --config-dir /etc/letsencrypt \
    --work-dir /var/lib/letsencrypt \
    --force-renewal \
    2>&1 | tee /var/log/certbot.log; then
    
    echo "Certbot failed. Displaying logs:"
    echo "=== certbot.log ==="
    cat /var/log/certbot.log
    echo "=== letsencrypt.log ==="
    cat /var/log/letsencrypt/letsencrypt.log
    exit 1
fi

# Copy certificates to our SSL directory if they were generated
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "Certificates generated successfully. Copying to SSL directory..."
    mkdir -p "$SSL_DIR"
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/"
    chown -R www-data:www-data "$SSL_DIR"
    chmod 644 "$SSL_DIR/fullchain.pem"
    chmod 644 "$SSL_DIR/privkey.pem"
    echo "SSL setup completed successfully! (Note: Using staging certificates)"
    echo "WARNING: These are staging certificates and will show as untrusted in browsers."
    echo "When ready for production, remove the --staging flag and wait until after $(date -d '2025-01-21 20:55:42 UTC')"
else
    echo "Failed to generate certificates. Check logs above for details."
    exit 1
fi

# Restart nginx to apply the new configuration
echo "Restarting nginx with new configuration..."
nginx -s reload || nginx

# Disable debug mode
set +x

# Start the Node.js application
exec node server.js
