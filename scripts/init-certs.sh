#!/bin/bash

# Run SSL certificate setup
./scripts/setup-ssl.sh

# Start the Node.js application
exec npm start
