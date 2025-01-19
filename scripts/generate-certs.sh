#!/bin/bash

# Create certs directory if it doesn't exist
mkdir -p certs && cd certs

# Generate CA private key and certificate
openssl genrsa 2048 > ca-key.pem
openssl req -new -x509 -nodes -days 365000 -key ca-key.pem -out ca-cert.pem -subj "/CN=MySQL_CA"

# Generate server private key and certificate signing request
openssl req -newkey rsa:2048 -nodes -days 365000 -keyout server-key.pem -out server-req.pem -subj "/CN=MySQL_Server"

# Generate server certificate
openssl x509 -req -in server-req.pem -days 365000 -CA ca-cert.pem -CAkey ca-key.pem -set_serial 01 -out server-cert.pem

# Generate client private key and certificate signing request
openssl req -newkey rsa:2048 -nodes -days 365000 -keyout client-key.pem -out client-req.pem -subj "/CN=MySQL_Client"

# Generate client certificate
openssl x509 -req -in client-req.pem -days 365000 -CA ca-cert.pem -CAkey ca-key.pem -set_serial 02 -out client-cert.pem

# Verify certificates
openssl verify -CAfile ca-cert.pem server-cert.pem client-cert.pem

# Set correct permissions
chmod 600 server-key.pem client-key.pem
chmod 644 ca-cert.pem server-cert.pem client-cert.pem

# Clean up temporary files
rm -f server-req.pem client-req.pem

echo "Certificates generated successfully in the certs directory."
