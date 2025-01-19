FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Copy docker-compose.yml for environment script
COPY docker-compose.yml /usr/src/app/docker-compose.yml

# Copy the environment generation script
COPY generate_env.sh /usr/src/app/generate_env.sh

# Make the script executable
RUN chmod +x /usr/src/app/generate_env.sh

# Expose port
EXPOSE 61860


# Run the environment script and start the application
CMD ["sh", "-c", "./generate_env.sh && echo '📄 Contenu du fichier .env:' && cat .env && echo '\n🚀 Démarrage du serveur...' && npm start"]
