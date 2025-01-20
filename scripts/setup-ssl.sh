#!/bin/bash
set -e

# Configuration variables
DOMAIN="${DOMAIN:-t2m.vigilys.fr}"
EMAIL="${EMAIL:-domenech.bruno@me.com}"
SSL_DIR="/usr/src/app/ssl"

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

echo "Setting up Let's Encrypt certificates..."

# Stop any process that might be using port 8080
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "Stopping processes using port 8080..."
    lsof -Pi :8080 -sTCP:LISTEN -t | xargs kill
fi

# Stop nginx temporarily
service nginx stop

# Request the certificate using standalone method
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domain "$DOMAIN" \
    --http-01-port 8080

# Copy certificates to our SSL directory
echo "Copying certificates to $SSL_DIR..."
cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"
cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
cp "/etc/letsencrypt/live/$DOMAIN/cert.pem" "$SSL_DIR/cert.pem"

# Set proper permissions
chmod 600 "$SSL_DIR/privkey.pem"
chmod 600 "$SSL_DIR/cert.pem"
chmod 600 "$SSL_DIR/fullchain.pem"

# Setup auto-renewal
echo "0 0 * * * root certbot renew --quiet --standalone --http-01-port 8080 --pre-hook 'service nginx stop' --post-hook 'service nginx start'" > /etc/cron.d/certbot-renew
chmod 0644 /etc/cron.d/certbot-renew
service cron start

# Start nginx
service nginx start

# Display certificate information
echo -e "\nCertificate information:"
echo "------------------------"
openssl x509 -in "$SSL_DIR/fullchain.pem" -text -noout | grep -A1 "Subject:"
