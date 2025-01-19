#!/bin/bash

# Create directories
mkdir -p /etc/mysql/ssl

# Generate CA private key and certificate
openssl genrsa 2048 > /etc/mysql/ssl/ca-key.pem
openssl req -new -x509 -nodes -days 365000 -key /etc/mysql/ssl/ca-key.pem -out /etc/mysql/ssl/ca-cert.pem -subj "/CN=MySQL_CA"

# Generate server private key and certificate signing request
openssl req -newkey rsa:2048 -nodes -days 365000 -keyout /etc/mysql/ssl/server-key.pem -out /etc/mysql/ssl/server-req.pem -subj "/CN=MySQL_Server"

# Generate server certificate
openssl x509 -req -in /etc/mysql/ssl/server-req.pem -days 365000 -CA /etc/mysql/ssl/ca-cert.pem -CAkey /etc/mysql/ssl/ca-key.pem -set_serial 01 -out /etc/mysql/ssl/server-cert.pem

# Generate client private key and certificate signing request
openssl req -newkey rsa:2048 -nodes -days 365000 -keyout /etc/mysql/ssl/client-key.pem -out /etc/mysql/ssl/client-req.pem -subj "/CN=MySQL_Client"

# Generate client certificate
openssl x509 -req -in /etc/mysql/ssl/client-req.pem -days 365000 -CA /etc/mysql/ssl/ca-cert.pem -CAkey /etc/mysql/ssl/ca-key.pem -set_serial 02 -out /etc/mysql/ssl/client-cert.pem

# Set permissions
chmod 600 /etc/mysql/ssl/*-key.pem
chmod 644 /etc/mysql/ssl/*-cert.pem

# Clean up request files
rm -f /etc/mysql/ssl/*-req.pem

echo "SSL certificates generated successfully."

# Generate environment file if it doesn't exist
./generate_env.sh

# Start the Node.js application
echo "Starting Node.js application..."
exec npm start
