FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies including MySQL client and OpenSSL
RUN apk add --no-cache bash mysql-client openssl

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
RUN npm install -g web-push

# Copy application source
COPY . .

# Set up permissions and directories
RUN chmod +x generate_env.sh scripts/init-certs.sh && \
    mkdir -p public/uploads && \
    mkdir -p database_dumps && \
    mkdir -p certs

# Generate VAPID keys
RUN web-push generate-vapid-keys > vapid.json

# Expose port
EXPOSE 61860

# Run the environment script and start the application
CMD ["/bin/bash", "-c", "export PUBLIC_VAPID_KEY=$(grep -A 1 'Public Key:' vapid.json | tail -n 1) && export PRIVATE_VAPID_KEY=$(grep -A 1 'Private Key:' vapid.json | tail -n 1) && ./generate_env.sh && echo '📄 Contenu du fichier .env:' && cat .env && echo '\n🚀 Démarrage du serveur...' && npm start"]
