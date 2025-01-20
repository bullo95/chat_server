FROM node:18

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    socat \
    mariadb-client \
    cron \
    certbot \
    python3-certbot \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create required directories and set permissions
RUN mkdir -p /var/www/html/.well-known/acme-challenge \
    /etc/letsencrypt \
    /usr/src/app/public/uploads \
    /usr/src/app/database_dumps \
    && chown -R node:node /var/www/html \
    && chmod -R 755 /var/www/html

# Make scripts executable
RUN chmod +x ./scripts/*.sh

# Expose ports
EXPOSE 61860 443

# Start the application
CMD ["./scripts/init-certs.sh"]
