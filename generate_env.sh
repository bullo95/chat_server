#!/bin/bash

# Fichier .env à mettre à jour
ENV_FILE=".env"

# Sauvegarde de l'ancien .env si nécessaire
if [ -f "$ENV_FILE" ]; then
    mv "$ENV_FILE" "${ENV_FILE}.bak"
    echo "Ancien fichier .env sauvegardé dans ${ENV_FILE}.bak"
fi

# Variables extraites du docker-compose.yml
cat <<EOL > $ENV_FILE
# Fichier généré automatiquement à partir de docker-compose.yml
PORT=$(grep -A 1 'ports:' docker-compose.yml | grep -oP '\d+(?=:)' | head -1)
DB_HOST=db
DB_USER=root
DB_PASSWORD=root_password
DB_NAME=dating_app
GIPHY_API_KEY=votre_api_key_giphy
SERVER_IP=$(grep -oP '(?<=SERVER_IP=\$\{SERVER_IP\})' docker-compose.yml || echo "127.0.0.1")
PUBLIC_VAPID_KEY=$(grep -oP '(?<=PUBLIC_VAPID_KEY=\$\{PUBLIC_VAPID_KEY\})' docker-compose.yml || echo "default_public_key")
PRIVATE_VAPID_KEY=$(grep -oP '(?<=PRIVATE_VAPID_KEY=\$\{PRIVATE_VAPID_KEY\})' docker-compose.yml || echo "default_private_key")
EMAIL=$(grep -oP '(?<=EMAIL=\$\{EMAIL\})' docker-compose.yml || echo "your_email@example.com")
EOL

echo "Fichier .env mis à jour avec les données du docker-compose.yml."
