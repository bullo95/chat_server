#!/bin/bash

# Fichier .env à mettre à jour
ENV_FILE=".env"

# Chemin vers docker-compose.yml
COMPOSE_FILE="docker-compose.yml"

# Vérifier si le fichier docker-compose.yml existe
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Erreur : Le fichier $COMPOSE_FILE est introuvable."
    exit 1
fi

# Sauvegarde de l'ancien .env si nécessaire
if [ -f "$ENV_FILE" ]; then
    mv "$ENV_FILE" "${ENV_FILE}.bak"
    echo "Ancien fichier .env sauvegardé dans ${ENV_FILE}.bak"
fi

# Vérifier et générer les clés VAPID si nécessaires
if [ -z "$PUBLIC_VAPID_KEY" ] || [ -z "$PRIVATE_VAPID_KEY" ]; then
    echo "Clés VAPID manquantes. Génération de nouvelles clés..."
    VAPID_KEYS=$(npx web-push generate-vapid-keys)
    PUBLIC_VAPID_KEY=$(echo "$VAPID_KEYS" | grep "Public Key" | awk '{print $3}')
    PRIVATE_VAPID_KEY=$(echo "$VAPID_KEYS" | grep "Private Key" | awk '{print $3}')
    echo "Clés VAPID générées avec succès."
else
    echo "Clés VAPID existantes détectées."
fi

# Extraction des variables de docker-compose.yml
PORT=$(grep -A 1 'ports:' "$COMPOSE_FILE" | grep -oE '[0-9]+(?=:)' | head -1)
DB_HOST="db"
DB_USER="root"
DB_PASSWORD=$(grep -A 1 'MYSQL_ROOT_PASSWORD' "$COMPOSE_FILE" | grep -oE '[^ ]+$' | tr -d '"')
DB_NAME=$(grep -A 1 'MYSQL_DATABASE' "$COMPOSE_FILE" | grep -oE '[^ ]+$' | tr -d '"')
GIPHY_API_KEY=${GIPHY_API_KEY:-"votre_api_key_giphy"}
SERVER_IP=${SERVER_IP:-"127.0.0.1"}
EMAIL=${EMAIL:-"your_email@example.com"}

# Génération du fichier .env
cat <<EOL > "$ENV_FILE"
# Fichier généré automatiquement à partir de docker-compose.yml
PORT=$PORT
DB_HOST=$DB_HOST
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
GIPHY_API_KEY=$GIPHY_API_KEY
SERVER_IP=$SERVER_IP
PUBLIC_VAPID_KEY=$PUBLIC_VAPID_KEY
PRIVATE_VAPID_KEY=$PRIVATE_VAPID_KEY
EMAIL=$EMAIL
EOL

echo "Fichier .env mis à jour avec les données du docker-compose.yml."
