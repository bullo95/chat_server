FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install web-push globally for key generation
RUN npm install -g web-push

# Copy application source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Copy the environment generation script
COPY generate_env.sh /usr/src/app/generate_env.sh

# Make the script executable
RUN chmod +x /usr/src/app/generate_env.sh && ls -la /usr/src/app/generate_env.sh

# Generate VAPID keys and environment file
RUN web-push generate-vapid-keys > vapid.json

# Expose port
EXPOSE 61860

# Run the environment script and start the application
CMD ["sh", "-c", "export PUBLIC_VAPID_KEY=$(grep -A 1 'Public Key:' vapid.json | tail -n 1) && export PRIVATE_VAPID_KEY=$(grep -A 1 'Private Key:' vapid.json | tail -n 1) && /usr/src/app/generate_env.sh && echo '📄 Contenu du fichier .env:' && cat .env && echo '\n🚀 Démarrage du serveur...' && npm start"]
