#!/bin/bash
set -e

# Create SSL directory
mkdir -p /etc/mysql/ssl

# Generate SSL certificates
openssl genrsa 2048 > /etc/mysql/ssl/ca-key.pem
openssl req -new -x509 -nodes -days 365000 -key /etc/mysql/ssl/ca-key.pem -out /etc/mysql/ssl/ca-cert.pem -subj "/CN=MySQL_CA"

openssl req -newkey rsa:2048 -nodes -days 365000 -keyout /etc/mysql/ssl/server-key.pem -out server-req.pem -subj "/CN=MySQL_Server"
openssl x509 -req -in server-req.pem -days 365000 -CA /etc/mysql/ssl/ca-cert.pem -CAkey /etc/mysql/ssl/ca-key.pem -set_serial 01 -out /etc/mysql/ssl/server-cert.pem

openssl req -newkey rsa:2048 -nodes -days 365000 -keyout /etc/mysql/ssl/client-key.pem -out client-req.pem -subj "/CN=MySQL_Client"
openssl x509 -req -in client-req.pem -days 365000 -CA /etc/mysql/ssl/ca-cert.pem -CAkey /etc/mysql/ssl/ca-key.pem -set_serial 02 -out /etc/mysql/ssl/client-cert.pem

# Clean up
rm -f server-req.pem client-req.pem

# Set proper permissions
chmod 600 /etc/mysql/ssl/*.pem

# Initialize MySQL
docker-entrypoint.sh mysqld
