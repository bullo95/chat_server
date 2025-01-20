#!/bin/bash
set -e

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
while ! mysql -h db -u root -ptcukeb6-tcukeb6 -e "SELECT 1" >/dev/null 2>&1; do
  sleep 1
done

echo "MySQL is ready"

# Initialize database if needed
if ! mysql -h db -u root -ptcukeb6-tcukeb6 dating_app -e "SELECT 1 FROM users LIMIT 1" >/dev/null 2>&1; then
  echo "Initializing database..."
  mysql -h db -u root -ptcukeb6-tcukeb6 < /usr/src/app/database.sql
fi

# Create necessary directories
mkdir -p /usr/src/app/ssl
mkdir -p /usr/src/app/public/uploads

# Function to check if SSL certificates exist and are valid
check_ssl() {
    local cert_file="/usr/src/app/ssl/fullchain.pem"
    local key_file="/usr/src/app/ssl/privkey.pem"
    
    if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
        return 1
    fi
    
    # Check certificate validity
    if ! openssl x509 -in "$cert_file" -noout -checkend 0 > /dev/null 2>&1; then
        return 1
    fi
    
    return 0
}

# Setup SSL certificates
./scripts/setup-ssl.sh

# Start the Node.js application
echo "Starting Node.js application..."
exec node server.js
