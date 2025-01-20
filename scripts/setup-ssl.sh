#!/bin/bash
set -e

# Configuration variables
DOMAIN="${DOMAIN:-t2m.vigilys.fr}"
EMAIL="${EMAIL:-domenech.bruno@me.com}"
SSL_DIR="/usr/src/app/ssl"

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"
mkdir -p /var/www/html/.well-known/acme-challenge

echo "Setting up Let's Encrypt certificates..."

# Stop any process that might be using ports
for port in 8080 61860; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "Stopping processes using port $port..."
        lsof -Pi :$port -sTCP:LISTEN -t | xargs kill || true
    fi
done

# Stop nginx temporarily
service nginx stop || true

# Wait for ports to be free
for port in 8080 61860; do
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; do
        echo "Waiting for port $port to be free..."
        sleep 1
    done
done

# Request the certificate using standalone method
echo "Requesting certificate for $DOMAIN..."
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domain "$DOMAIN" \
    --http-01-port 8080 \
    --cert-name "$DOMAIN" \
    --keep-until-expiring \
    --expand \
    --debug

# Check if certificate was obtained
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Failed to obtain certificates"
    exit 1
fi

# Copy certificates to our SSL directory
echo "Copying certificates to $SSL_DIR..."
mkdir -p "$SSL_DIR"
cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"
cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
cp "/etc/letsencrypt/live/$DOMAIN/cert.pem" "$SSL_DIR/cert.pem"

# Set proper permissions
chmod 600 "$SSL_DIR/privkey.pem"
chmod 600 "$SSL_DIR/cert.pem"
chmod 600 "$SSL_DIR/fullchain.pem"

# Setup auto-renewal with pre and post hooks
echo "Setting up auto-renewal..."
cat > /etc/cron.d/certbot-renew <<EOF
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

0 */12 * * * root certbot renew --quiet --standalone --http-01-port 8080 --pre-hook "service nginx stop" --post-hook "service nginx start && service cron reload"
EOF

chmod 0644 /etc/cron.d/certbot-renew
service cron start || true

echo "Certificate setup complete!"
echo "Certificate Information:"
certbot certificates

# Don't start nginx here, let the main script handle it
exit 0
