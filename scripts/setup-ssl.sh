#!/bin/bash

# Configuration variables
DOMAIN="bdomenech.freeboxos.fr"
EMAIL="domenech.bruno@me.com"  # Change this to your email
ACME_PORT="${ACME_PORT:-8080}"

# Create directory for certificates
mkdir -p /usr/src/app/ssl

# Register account
~/.acme.sh/acme.sh --register-account -m $EMAIL

# Issue certificate using standalone mode
~/.acme.sh/acme.sh --issue \
  -d $DOMAIN \
  --standalone \
  --httpport $ACME_PORT \
  --server letsencrypt \
  --keylength 2048

# Install certificate
~/.acme.sh/acme.sh --install-cert -d $DOMAIN \
  --key-file /usr/src/app/ssl/privkey.pem \
  --fullchain-file /usr/src/app/ssl/fullchain.pem

# Set proper permissions
chmod 600 /usr/src/app/ssl/privkey.pem
chmod 600 /usr/src/app/ssl/fullchain.pem

# Setup auto-renewal (acme.sh handles this automatically)
~/.acme.sh/acme.sh --upgrade --auto-upgrade

echo "SSL setup completed!"
