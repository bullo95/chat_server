#!/bin/bash

# Configuration variables
DOMAIN="bdomenech.freeboxos.fr"
EMAIL="domenech.bruno@me.com"  # Change this to your email
ACME_PORT="${ACME_PORT:-8080}"
SSL_DIR="/usr/src/app/ssl"

# Function to check certificate validity
check_certificate() {
    local cert_file="$SSL_DIR/fullchain.pem"
    local key_file="$SSL_DIR/privkey.pem"
    
    # Check if files exist
    if [[ ! -f "$cert_file" ]] || [[ ! -f "$key_file" ]]; then
        echo "❌ SSL certificates not found"
        return 1
    fi

    # Check if certificate is readable
    if ! openssl x509 -in "$cert_file" -text -noout &>/dev/null; then
        echo "❌ Invalid certificate format"
        return 1
    fi

    # Get expiration date
    local end_date=$(openssl x509 -in "$cert_file" -enddate -noout | cut -d= -f2)
    local end_epoch=$(date -d "$end_date" +%s)
    local now_epoch=$(date +%s)
    local days_left=$(( ($end_epoch - $now_epoch) / 86400 ))

    if [[ $days_left -lt 0 ]]; then
        echo "❌ Certificate expired $((days_left * -1)) days ago"
        return 1
    elif [[ $days_left -lt 30 ]]; then
        echo "⚠️ Certificate will expire in $days_left days"
        return 1
    else
        echo "✅ Certificate valid for $days_left more days"
        # Get certificate info
        echo "Certificate details:"
        openssl x509 -in "$cert_file" -text -noout | grep -E "Subject:|Issuer:|Not Before:|Not After :"
        return 0
    fi
}

# Create directory for certificates
mkdir -p "$SSL_DIR"

# Check existing certificates first
echo "Checking existing SSL certificates..."
if check_certificate; then
    echo "✅ Using existing valid certificates"
    exit 0
fi

echo "Proceeding with certificate generation..."

# Register account
~/.acme.sh/acme.sh --register-account -m "$EMAIL"

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

# Setup auto-renewal (acme.sh handles this automatically)
~/.acme.sh/acme.sh --upgrade --auto-upgrade

echo "SSL setup completed!"
