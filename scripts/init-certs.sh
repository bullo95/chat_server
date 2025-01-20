#!/bin/bash
set -e

# Wait for MySQL to be ready
wait_for_mysql() {
    echo "Waiting for MySQL to be ready..."
    while ! mysqladmin ping -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" --silent; do
        sleep 1
    done
    echo "MySQL is ready!"
}

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

# Main execution
echo "Starting initialization..."

# Create necessary directories
mkdir -p /usr/src/app/ssl
mkdir -p /usr/src/app/public/uploads

# Wait for MySQL
wait_for_mysql

# Setup SSL certificates
if ! check_ssl; then
    echo "SSL certificates need to be generated..."
    ./scripts/setup-ssl.sh
else
    echo "Using existing SSL certificates"
fi

# Start the Node.js application
echo "Starting Node.js application..."
exec node server.js
