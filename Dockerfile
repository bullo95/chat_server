FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    socat \
    mariadb-client \
    cron \
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
    /usr/src/app/database_dumps

# Make scripts executable
RUN chmod +x scripts/*.sh

# Install acme.sh
RUN cd /tmp && \
    curl -O https://raw.githubusercontent.com/acmesh-official/acme.sh/master/acme.sh && \
    chmod +x acme.sh && \
    ./acme.sh --install --home /root/.acme.sh --config-home /root/.acme.sh/data \
    --cert-home /usr/src/app/ssl --accountemail "domenech.bruno@me.com" \
    --no-cron && \
    rm -rf /tmp/*

# Expose ports
EXPOSE 61860 8080 443

# Start the application
CMD ["./scripts/init-certs.sh"]
