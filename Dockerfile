FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies including MariaDB client
RUN apk add --no-cache bash mariadb mariadb-client

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
RUN npm install -g web-push

# Copy application source
COPY . .

# Set up permissions and directories
RUN chmod +x generate_env.sh && \
    mkdir -p public/uploads && \
    mkdir -p database_dumps && \
    mkdir -p certs

# Generate VAPID keys and store them
RUN web-push generate-vapid-keys > vapid.json && \
    export PUBLIC_VAPID_KEY=$(grep -A 1 'Public Key:' vapid.json | tail -n 1) && \
    export PRIVATE_VAPID_KEY=$(grep -A 1 'Private Key:' vapid.json | tail -n 1) && \
    echo "PUBLIC_VAPID_KEY=$PUBLIC_VAPID_KEY" > .env && \
    echo "PRIVATE_VAPID_KEY=$PRIVATE_VAPID_KEY" >> .env

# Expose port
EXPOSE 61860

# Run the application
CMD ["/bin/bash", "-c", "./generate_env.sh && npm start"]
