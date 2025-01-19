FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    socat \
    mariadb-client \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create required directories
RUN mkdir -p /usr/src/app/ssl \
    /usr/src/app/public/uploads \
    /usr/src/app/database_dumps \
    && chmod +x /usr/src/app/scripts/*.sh

# Install acme.sh
RUN curl https://get.acme.sh | sh -s email=domenech.bruno@me.com

# Expose ports
EXPOSE 61860 8080

# Start the application
CMD ["./scripts/init-certs.sh"]
