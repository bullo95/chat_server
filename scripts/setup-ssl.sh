#!/bin/bash
set -e

# Configuration variables
DOMAIN="bdomenech.freeboxos.fr"
EMAIL="domenech.bruno@me.com"
ACME_PORT="61860"  # Use the main application port
SSL_DIR="/usr/src/app/ssl"
ACME_HOME="/root/.acme.sh"

# Function to check if acme.sh is installed
check_acme() {
    if [ ! -f "$ACME_HOME/acme.sh" ]; then
        echo "Installing acme.sh..."
        cd /tmp
        curl -O https://raw.githubusercontent.com/acmesh-official/acme.sh/master/acme.sh
        chmod +x acme.sh
        ./acme.sh --install --home "$ACME_HOME" --config-home "$ACME_HOME/data" \
            --cert-home "$SSL_DIR" --accountemail "$EMAIL" --no-cron
        rm -f /tmp/acme.sh
    fi
}

# Create directories
mkdir -p "$SSL_DIR"
mkdir -p "$ACME_HOME"

echo "Setting up Let's Encrypt certificates..."

# Ensure acme.sh is installed
check_acme

# Register account if needed
"$ACME_HOME/acme.sh" --register-account -m "$EMAIL" || true

# Issue certificate using standalone mode with port 61860
echo "Using port $ACME_PORT for ACME challenge..."
"$ACME_HOME/acme.sh" --issue \
    -d "$DOMAIN" \
    --standalone \
    --httpport "$ACME_PORT" \
    --listen-v4 \
    --server letsencrypt \
    --keylength 2048 \
    --cert-file "$SSL_DIR/cert.pem" \
    --key-file "$SSL_DIR/privkey.pem" \
    --fullchain-file "$SSL_DIR/fullchain.pem" \
    --reloadcmd "touch $SSL_DIR/reload" \
    --debug 2 \
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
