#!/usr/bin/env bash
echo "Generating .env file..."

# Fichier .env à mettre à jour
ENV_FILE=".env"

# Sauvegarde de l'ancien .env si nécessaire
if [ -f "$ENV_FILE" ]; then
    mv "$ENV_FILE" "${ENV_FILE}.bak"
    echo "Sauvegarde de l'ancien .env effectuée"
fi

# Vérifier les clés VAPID
echo "Vérification des clés VAPID..."
if [ -z "$PUBLIC_VAPID_KEY" ] || [ -z "$PRIVATE_VAPID_KEY" ]; then
    if [ -f "vapid.json" ]; then
        echo "Utilisation des clés VAPID depuis vapid.json..."
        PUBLIC_VAPID_KEY=$(sed -n '/Public Key:/,/^$/p' vapid.json | tail -n 2 | head -n 1)
        PRIVATE_VAPID_KEY=$(sed -n '/Private Key:/,/^$/p' vapid.json | tail -n 2 | head -n 1)
    else
        echo "Erreur : Impossible de trouver les clés VAPID"
        exit 1
    fi
fi

if [ -z "$PUBLIC_VAPID_KEY" ] || [ -z "$PRIVATE_VAPID_KEY" ]; then
    echo "Erreur : Impossible de générer ou récupérer les clés VAPID"
    exit 1
fi

echo "Clés VAPID configurées avec succès"

# Configuration des variables d'environnement
PORT=${PORT:-61860}
DB_HOST=${DB_HOST:-"db"}
DB_USER=${DB_USER:-"root"}
DB_PASSWORD=${DB_PASSWORD:-"tcukeb6-tcukeb6"}
DB_NAME=${DB_NAME:-"dating_app"}
GIPHY_API_KEY=${GIPHY_API_KEY:-"votre_api_key_giphy"}
SERVER_IP=${SERVER_IP:-"127.0.0.1"}
DOMAIN=${DOMAIN:-"backend.vigilys.fr"}
EMAIL=${EMAIL:-"domenech.bruno@me.com"}

# Génération du fichier .env
cat <<EOL > "$ENV_FILE"
# Fichier généré automatiquement
PORT=$PORT
DB_HOST=$DB_HOST
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
GIPHY_API_KEY=$GIPHY_API_KEY
SERVER_IP=$SERVER_IP
DOMAIN="$DOMAIN"
PUBLIC_VAPID_KEY=$PUBLIC_VAPID_KEY
PRIVATE_VAPID_KEY=$PRIVATE_VAPID_KEY
EMAIL="$EMAIL"
EOL

echo "Fichier .env mis à jour avec succès"
echo "Contenu du fichier .env :"
cat "$ENV_FILE"
