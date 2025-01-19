FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install web-push globally for key generation
RUN npm install -g web-push

# Copy generate_env.sh first and set permissions
COPY generate_env.sh ./
RUN chmod +x ./generate_env.sh

# Copy application source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Generate VAPID keys and environment file
RUN web-push generate-vapid-keys > vapid.json

# Expose port
EXPOSE 61860

# Run the environment script and start the application
CMD ["sh", "-c", "export PUBLIC_VAPID_KEY=$(grep -A 1 'Public Key:' vapid.json | tail -n 1) && export PRIVATE_VAPID_KEY=$(grep -A 1 'Private Key:' vapid.json | tail -n 1) && ./generate_env.sh && echo '📄 Contenu du fichier .env:' && cat .env && echo '\n🚀 Démarrage du serveur...' && npm start"]
