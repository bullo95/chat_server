#!/bin/bash
set -e

# Function to check if MySQL is ready
wait_for_mysql() {
    echo "Waiting for MySQL to be ready..."
    while ! mysqladmin ping -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" --silent; do
        echo "MySQL is unavailable - sleeping"
        sleep 1
    done
    echo "MySQL is ready!"
}

# Wait for MySQL first
wait_for_mysql

# Run SSL certificate setup
echo "Setting up SSL certificates..."
./scripts/setup-ssl.sh

# Generate environment file if needed
if [ ! -f .env ]; then
    echo "Generating .env file..."
    ./generate_env.sh
fi

# Start the Node.js application
echo "Starting Node.js application..."
exec npm start
