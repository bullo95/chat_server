FROM node:20-alpine

WORKDIR /usr/src/app

# Install required packages
RUN apk add --no-cache \
    bash \
    mariadb-client \
    certbot \
    openssl \
    python3 \
    py3-pip \
    && pip3 install --no-cache-dir certbot-nginx

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
RUN npm install -g web-push

# Copy application source
COPY . .

# Set up permissions and directories
RUN chmod +x generate_env.sh && \
    chmod +x scripts/setup-ssl.sh && \
    mkdir -p public/uploads && \
    mkdir -p database_dumps && \
    mkdir -p certs && \
    mkdir -p ssl

# Generate VAPID keys and store them
RUN web-push generate-vapid-keys > vapid.json && \
    export PUBLIC_VAPID_KEY=$(grep -A 1 'Public Key:' vapid.json | tail -n 1) && \
    export PRIVATE_VAPID_KEY=$(grep -A 1 'Private Key:' vapid.json | tail -n 1) && \
    echo "PUBLIC_VAPID_KEY=$PUBLIC_VAPID_KEY" > .env && \
    echo "PRIVATE_VAPID_KEY=$PRIVATE_VAPID_KEY" >> .env

# Expose ports for HTTP and HTTPS
EXPOSE 61860 443

# Run the application with SSL setup
CMD ["/bin/bash", "-c", "./scripts/setup-ssl.sh && ./generate_env.sh && npm start"]
