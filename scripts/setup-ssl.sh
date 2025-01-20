#!/bin/bash
set -e

# Enable debug mode
set -x

# Configuration variables
DOMAIN="${DOMAIN:-backend.vigilys.fr}"
EMAIL="${EMAIL:-domenech.bruno@me.com}"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

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

# Use initial nginx configuration for certificate acquisition
echo "Starting nginx with initial configuration..."
mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
cp /etc/nginx/conf.d/initial.conf /etc/nginx/conf.d/default.conf
nginx -t && nginx

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

# Verify certificates exist
if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    echo "Certificates generated successfully!"
    
    # Set proper permissions
    chmod 644 "$CERT_PATH"
    chmod 644 "$KEY_PATH"
    
    # Restore full nginx configuration
    echo "Restoring full nginx configuration..."
    mv /etc/nginx/conf.d/default.conf.bak /etc/nginx/conf.d/default.conf
    
    # Test nginx configuration before starting
    if nginx -t; then
        echo "Nginx configuration test passed. Starting nginx..."
        nginx -s reload || nginx
        echo "SSL setup completed successfully! (Note: Using staging certificates)"
        echo "WARNING: These are staging certificates and will show as untrusted in browsers."
        echo "When ready for production, remove the --staging flag and wait until after $(date -d '2025-01-21 20:55:42 UTC')"
    else
        echo "Nginx configuration test failed. Check the certificates and configuration."
        exit 1
    fi
else
    echo "Failed to generate certificates. Files not found at expected locations:"
    echo "Certificate: $CERT_PATH"
    echo "Key: $KEY_PATH"
    exit 1
fi

# Disable debug mode
set +x

# Start the Node.js application
exec node server.js
