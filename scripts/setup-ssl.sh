#!/bin/bash
set -e

# Configuration variables
DOMAIN="${DOMAIN:-t2m.vigilys.fr}"
EMAIL="${EMAIL:-domenech.bruno@me.com}"
SSL_DIR="/usr/src/app/ssl"

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

echo "Setting up Let's Encrypt certificates..."

# Stop any process that might be using port 80
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null ; then
    echo "Stopping processes using port 80..."
    lsof -Pi :80 -sTCP:LISTEN -t | xargs kill
fi

# Request the certificate
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domain "$DOMAIN" \
    --http-01-port 80

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
echo "0 0 * * * root certbot renew --quiet --standalone --http-01-port 80" > /etc/cron.d/certbot-renew
chmod 0644 /etc/cron.d/certbot-renew
service cron start

# Display certificate information
echo -e "\nCertificate information:"
echo "------------------------"
openssl x509 -in "$SSL_DIR/fullchain.pem" -text -noout | grep -A1 "Subject:"
openssl x509 -in "$SSL_DIR/fullchain.pem" -text -noout | grep -A1 "Validity"
echo -e "\nCertificate fingerprint:"
openssl x509 -in "$SSL_DIR/fullchain.pem" -noout -fingerprint

echo -e "\nSSL certificates generated successfully!"
echo "Auto-renewal has been configured to run daily."

# Start the Node.js application
exec node server.js
