#!/bin/bash

# Directory setup
MYSQL_CERTS_DIR="./mysql/certs"
mkdir -p "$MYSQL_CERTS_DIR"

# Generate CA key and certificate
openssl genrsa 2048 > "$MYSQL_CERTS_DIR/ca-key.pem"
openssl req -new -x509 -nodes -days 3600 \
    -key "$MYSQL_CERTS_DIR/ca-key.pem" \
    -out "$MYSQL_CERTS_DIR/ca.pem" \
    -subj "/CN=MySQL_CA"

# Generate server key and certificate
openssl req -newkey rsa:2048 -nodes \
    -keyout "$MYSQL_CERTS_DIR/server-key.pem" \
    -out "$MYSQL_CERTS_DIR/server-req.pem" \
    -subj "/CN=MySQL_Server"

openssl x509 -req -days 3600 \
    -in "$MYSQL_CERTS_DIR/server-req.pem" \
    -CA "$MYSQL_CERTS_DIR/ca.pem" \
    -CAkey "$MYSQL_CERTS_DIR/ca-key.pem" \
    -set_serial 01 \
    -out "$MYSQL_CERTS_DIR/server-cert.pem"

# Generate client key and certificate
openssl req -newkey rsa:2048 -nodes \
    -keyout "$MYSQL_CERTS_DIR/client-key.pem" \
    -out "$MYSQL_CERTS_DIR/client-req.pem" \
    -subj "/CN=MySQL_Client"

openssl x509 -req -days 3600 \
    -in "$MYSQL_CERTS_DIR/client-req.pem" \
    -CA "$MYSQL_CERTS_DIR/ca.pem" \
    -CAkey "$MYSQL_CERTS_DIR/ca-key.pem" \
    -set_serial 02 \
    -out "$MYSQL_CERTS_DIR/client-cert.pem"

# Verify certificates
openssl verify -CAfile "$MYSQL_CERTS_DIR/ca.pem" \
    "$MYSQL_CERTS_DIR/server-cert.pem" \
    "$MYSQL_CERTS_DIR/client-cert.pem"

# Set proper permissions
chmod 600 "$MYSQL_CERTS_DIR"/*.pem
