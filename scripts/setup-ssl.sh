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
    
    # Generate certificates with more detailed subject
    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "$SSL_DIR/privkey.pem" \
        -out "$SSL_DIR/fullchain.pem" \
        -days 365 \
        -subj "/CN=$DOMAIN" \
        -addext "subjectAltName=DNS:$DOMAIN"
    
    # Set proper permissions
    chmod 600 "$SSL_DIR/privkey.pem"
    chmod 600 "$SSL_DIR/fullchain.pem"
    
    # Display certificate information
    echo -e "\nCertificate information:"
    echo "------------------------"
    openssl x509 -in "$SSL_DIR/fullchain.pem" -text -noout | grep -A1 "Subject:" 
    openssl x509 -in "$SSL_DIR/fullchain.pem" -text -noout | grep -A1 "Validity"
    echo -e "\nCertificate fingerprint:"
    openssl x509 -in "$SSL_DIR/fullchain.pem" -noout -fingerprint
    
    echo -e "\nSelf-signed certificates generated successfully"
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
    --reloadcmd "touch $SSL_DIR/reload" \
    --force

# Set proper permissions
chmod 600 "$SSL_DIR/privkey.pem"
chmod 600 "$SSL_DIR/cert.pem"
chmod 600 "$SSL_DIR/fullchain.pem"

# Display certificate information
echo -e "\nCertificate information:"
echo "------------------------"
openssl x509 -in "$SSL_DIR/fullchain.pem" -text -noout | grep -A1 "Subject:"
openssl x509 -in "$SSL_DIR/fullchain.pem" -text -noout | grep -A1 "Validity"
echo -e "\nCertificate fingerprint:"
openssl x509 -in "$SSL_DIR/fullchain.pem" -noout -fingerprint

echo -e "\nSSL certificates generated successfully!"
