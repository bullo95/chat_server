#!/bin/bash
set -e

# Configuration variables
DOMAIN="bdomenech.freeboxos.fr"
EMAIL="domenech.bruno@me.com"
ACME_PORT="${ACME_PORT:-8080}"
SSL_DIR="/usr/src/app/ssl"

# Create directory for certificates
mkdir -p "$SSL_DIR"

# Generate self-signed certificate if not in production
if [[ "$NODE_ENV" != "production" ]]; then
    echo "Generating self-signed certificates for development..."
    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "$SSL_DIR/privkey.pem" \
        -out "$SSL_DIR/fullchain.pem" \
        -days 365 \
        -subj "/CN=$DOMAIN"
    
    chmod 600 "$SSL_DIR/privkey.pem"
    chmod 600 "$SSL_DIR/fullchain.pem"
    echo "Self-signed certificates generated successfully"
    exit 0
fi

# Production environment - use Let's Encrypt
echo "Setting up Let's Encrypt certificates..."

# Register account if needed
~/.acme.sh/acme.sh --register-account -m "$EMAIL" || true

# Issue certificate using standalone mode
~/.acme.sh/acme.sh --issue \
    -d "$DOMAIN" \
    --standalone \
    --httpport "$ACME_PORT" \
    --server letsencrypt \
    --keylength 2048 \
    --cert-file "$SSL_DIR/cert.pem" \
    --key-file "$SSL_DIR/privkey.pem" \
    --fullchain-file "$SSL_DIR/fullchain.pem" \
    --reloadcmd "touch $SSL_DIR/reload"

# Set proper permissions
chmod 600 "$SSL_DIR/privkey.pem"
chmod 600 "$SSL_DIR/cert.pem"
chmod 600 "$SSL_DIR/fullchain.pem"

echo "SSL certificates generated successfully!"
