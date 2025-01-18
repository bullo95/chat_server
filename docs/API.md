# API Documentation

## Configuration

Le serveur utilise les variables d'environnement suivantes :
- `PORT`: Port sur lequel le serveur écoute
- `DB_HOST`: Hôte de la base de données
- `DB_USER`: Utilisateur de la base de données
- `DB_PASSWORD`: Mot de passe de la base de données
- `DB_NAME`: Nom de la base de données
- `GIPHY_API_KEY`: Clé API Giphy
- `SERVER_IP`: Adresse IP du serveur

## Configuration Socket.IO

Le serveur Socket.IO est configuré pour écouter les connexions sur `http://${process.env.SERVER_IP}:${process.env.PORT}` avec les méthodes HTTP GET et POST autorisées.

## Authentification Socket.IO

L'authentification Socket.IO est requise pour toutes les connexions. Le client doit fournir un token d'authentification dans le format suivant :

```javascript
const socket = io(`http://${process.env.SERVER_IP}:${process.env.PORT}`, {
  auth: {
    token: 'token_userId'  // Remplacer userId par l'ID réel de l'utilisateur
  }
});
```

## Événements Socket.IO

### Connexion

```javascript
// Événement émis automatiquement lors de la connexion d'un client
socket.on('connection', (socket) => {
  // L'ID de l'utilisateur est disponible via socket.userId
});
```

### Déconnexion

```javascript
// Événement émis automatiquement lors de la déconnexion d'un client
socket.on('disconnect', () => {
  // Nettoyage des ressources si nécessaire
});
```

## Routes REST API

### Authentication

#### POST /api/auth/register
Inscription d'un nouvel utilisateur.

**Corps de la requête :**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### POST /api/auth/login
Connexion d'un utilisateur.

**Corps de la requête :**
```json
{
  "email": "string",
  "password": "string"
}
```

### Messages

#### GET /api/messages/conversations
Récupère la liste des conversations de l'utilisateur connecté.

#### POST /api/messages/send
Envoie un nouveau message.

**Corps de la requête :**
```json
{
  "receiverId": "string",
  "content": "string",
  "messageType": "text" // optionnel, par défaut "text"
}
```

### Upload

#### POST /api/upload
Upload d'un fichier image ou vidéo.

**Formats supportés :**
- Images : JPEG, JPG, PNG, GIF, WEBP, SVG, BMP, TIFF, HEIC, RAW
- Vidéos : MP4

**Limites :**
- Taille maximale : 50MB

**Corps de la requête :**
```
Content-Type: multipart/form-data
file: <media_file>
```

**Réponse :**
```json
{
  "url": "http://${process.env.SERVER_IP}:${process.env.PORT}/uploads/filename.jpg",
  "type": "image|video",
  "filename": "timestamp-randomnumber.extension",
  "size": 12345,
  "mimetype": "image/jpeg|video/mp4"
}
```

**Codes d'erreur :**
- 400 : Format de fichier non supporté ou fichier manquant
- 413 : Fichier trop volumineux (> 50MB)

### Utilisateurs

#### GET /api/users
Récupère la liste des utilisateurs.

#### GET /api/users/search
Recherche des utilisateurs avec filtres.

**Paramètres de requête :**
- `page` (optionnel, défaut: 0): Numéro de la page
- `pageSize` (optionnel, défaut: 20): Nombre d'utilisateurs par page
- `gender` (optionnel): Genre des utilisateurs à rechercher
- `minAge` (optionnel, défaut: 18): Âge minimum des utilisateurs à rechercher
- `maxAge` (optionnel, défaut: 99): Âge maximum des utilisateurs à rechercher

**Réponse :**
```json
[
  {
    "id": "string",
    "username": "string",
    "photoUrl": "string",
    "gender": "string",
    "age": "number",
    "meetingType": "string",
    "description": "string"
  }
]
```

## Sécurité

- Toutes les routes API nécessitent une authentification via JWT token
- Les connexions Socket.IO nécessitent un token d'authentification
- CORS est configuré pour accepter uniquement les requêtes depuis `http://${process.env.SERVER_IP}:${process.env.PORT}`

## Gestion des erreurs

Les erreurs sont renvoyées dans le format suivant :

```json
{
  "success": false,
  "error": "Description de l'erreur"
}
```

## Codes de statut HTTP

- 200: Succès
- 400: Erreur de requête
- 401: Non authentifié
- 403: Non autorisé
- 500: Erreur serveur

## Exemples d'utilisation Socket.IO (Client)

```javascript
// Connexion au serveur
const socket = io(`http://${process.env.SERVER_IP}:${process.env.PORT}`, {
  auth: {
    token: 'token_userId'
  }
});

// Gestion des événements de connexion
socket.on('connect', () => {
  console.log('Connecté au serveur Socket.IO');
});

// Gestion des erreurs
socket.on('connect_error', (error) => {
  if (error.message === 'Authentication error') {
    console.log('Erreur d\'authentification');
  }
});

// Gestion de la déconnexion
socket.on('disconnect', () => {
  console.log('Déconnecté du serveur Socket.IO');
});
