FROM node:18

# Install system dependencies including Nginx
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    socat \
    mariadb-client \
    cron \
    certbot \
    python3-certbot \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Copy Nginx configuration
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Create required directories and set permissions
RUN mkdir -p /var/www/html/.well-known/acme-challenge \
    /etc/letsencrypt \
    /usr/src/app/public/uploads \
    /usr/src/app/database_dumps \
    /usr/src/app/ssl \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && mkdir -p /var/log/nginx \
    && touch /var/log/nginx/error.log \
    && touch /var/log/nginx/access.log

# Make scripts executable
RUN chmod +x ./scripts/*.sh

# Create startup script
RUN echo '#!/bin/bash\n\
echo "Testing Nginx configuration..."\n\
nginx -t\n\
if [ $? -eq 0 ]; then\n\
    echo "Starting Nginx..."\n\
    service nginx start\n\
    if [ $? -ne 0 ]; then\n\
        echo "Nginx failed to start. Checking logs:"\n\
        cat /var/log/nginx/error.log\n\
    fi\n\
else\n\
    echo "Nginx configuration test failed"\n\
    exit 1\n\
fi\n\
./scripts/init-certs.sh' > /usr/src/app/start.sh \
    && chmod +x /usr/src/app/start.sh

# Expose ports
EXPOSE 61860 80 443

# Start both Nginx and Node.js
CMD ["/usr/src/app/start.sh"]
