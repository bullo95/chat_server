const express = require('express');
const cors = require('cors');
const path = require('path');
const readline = require('readline');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const YAML = require('yamljs');
const fs = require('fs');
const https = require('https');



// Debug logging
console.log('Starting server initialization...');
console.log('Current working directory:', process.cwd());
console.log('Node version:', process.version);

// Vérifier la présence du fichier .env
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.warn(' Fichier .env non trouvé');
  console.log(' Pour une configuration personnalisée :');
  console.log('  1. Créez un fichier .env à partir du modèle .env.example');
  console.log('  2. Ou utilisez le script : ./generate_env.sh');
}

require('dotenv').config();

// Log environment variables (excluding sensitive data)
console.log('Environment configuration:');
console.log('- DOMAIN:', process.env.DOMAIN);
console.log('- PORT:', process.env.PORT);
console.log('- SERVER_IP:', process.env.SERVER_IP);

// Afficher le contenu de l'environnement
console.log(' Contenu des variables d\'environnement :');
Object.keys(process.env).sort().forEach(key => {
  // Ne pas afficher les valeurs sensibles en entier
  const value = process.env[key];
  const displayValue = key.includes('KEY') || key.includes('PASSWORD') 
    ? value ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : '(vide)'
    : value || '(vide)';
  console.log(`${key}=${displayValue}`);
});

// Vérifier les variables d'environnement requises
const requiredEnvVars = [
  'PORT',
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'SERVER_IP'
];

// Variables qui peuvent être vides
const optionalEmptyVars = ['DB_PASSWORD', 'PUBLIC_VAPID_KEY', 'PRIVATE_VAPID_KEY', 'EMAIL', 'GIPHY_API_KEY'];

console.log('\n Vérification des variables d\'environnement...');
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn(' Variables d\'environnement manquantes:', missingVars.join(', '));
  console.log(' Utilisation des valeurs par défaut :');
  missingVars.forEach(varName => {
    switch(varName) {
      case 'PORT':
        process.env.PORT = '3000';
        break;
      case 'DB_HOST':
        process.env.DB_HOST = 'localhost';
        break;
      case 'DB_USER':
        process.env.DB_USER = 'root';
        break;
      case 'DB_NAME':
        process.env.DB_NAME = 'dating_app';
        break;
      case 'SERVER_IP':
        process.env.SERVER_IP = '127.0.0.1';
        break;
    }
    console.log(`  ${varName}=${process.env[varName]}`);
  });
}

// Initialiser les variables optionnelles si elles sont vides
optionalEmptyVars.forEach(varName => {
  if (!process.env[varName]) {
    process.env[varName] = '';
    console.log(` Variable optionnelle ${varName} initialisée avec une valeur vide`);
  }
});

console.log(' Configuration de base terminée\n');

const jwt = require('jsonwebtoken');
const { pool, setupDatabase } = require('./config/database');
const { router: notificationsRouter } = require('./src/routes/notifications');
const conversationsRouter = require('./src/routes/conversations');
const mediaRouter = require('./src/routes/media');

// Configuration Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dating App API',
      version: '1.0.0',
      description: 'API Documentation for Dating App including REST and Socket.IO endpoints',
    },
    servers: [
      {
        url: `http://${process.env.SERVER_IP}:${process.env.PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: ['./src/routes/*.js', './server.js'],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

const app = express();

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Configuration CORS with detailed logging
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      `http://${process.env.DOMAIN}`,
      `http://${process.env.DOMAIN}:61860`,
      'http://localhost:3000',
      'http://localhost:61860'
    ];
    console.log('Incoming request origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add ACME challenge endpoint
app.get('/.well-known/acme-challenge/:token', (req, res) => {
  const token = req.params.token;
  const wellKnownDir = path.join(__dirname, '.well-known', 'acme-challenge');
  const tokenPath = path.join(wellKnownDir, token);

  try {
    if (fs.existsSync(tokenPath)) {
      const content = fs.readFileSync(tokenPath, 'utf8');
      res.setHeader('Content-Type', 'text/plain');
      res.send(content);
    } else {
      res.status(404).send('Challenge token not found');
    }
  } catch (error) {
    console.error('Error serving ACME challenge:', error);
    res.status(500).send('Internal server error');
  }
});

// Add test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    protocol: req.protocol,
    secure: req.secure,
    headers: req.headers
  });
});

// Configure Socket.IO with CORS
const io = new Server(null, {
  cors: {
    origin: corsOptions.origin,
    methods: corsOptions.methods,
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Log all requests
app.use((req, res, next) => {
  console.log('\n=== New Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Body before parsing:', req.body);
  next();
});

// Middleware pour servir les fichiers statiques du dossier uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Documentation Swagger UI avec options d'export
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete'],
  },
}));

// Export de la documentation
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=api-docs.json');
  res.send(swaggerSpec);
});

app.get('/api-docs.yaml', (req, res) => {
  const yamlString = YAML.stringify(swaggerSpec, 10);
  res.setHeader('Content-Type', 'text/yaml');
  res.setHeader('Content-Disposition', 'attachment; filename=api-docs.yaml');
  res.send(yamlString);
});

// Export de la documentation en HTML statique
app.get('/api-docs-static', (req, res) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Dating App API Documentation</title>
      <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui.css">
      <style>
        .topbar { display: none }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-bundle.js"></script>
      <script>
        window.onload = function() {
          const ui = SwaggerUIBundle({
            spec: ${JSON.stringify(swaggerSpec)},
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIBundle.SwaggerUIStandalonePreset
            ],
          });
        }
      </script>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', 'attachment; filename=api-docs.html');
  res.send(htmlContent);
});

// Servir les fichiers statiques du dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/chat', require('./src/routes/chat'));
app.use('/api/upload', require('./src/routes/upload'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/messages', require('./src/routes/messages'));
app.use('/api/notifications', notificationsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/media', mediaRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

// Interface readline pour l'interaction avec l'utilisateur
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Gestion des connexions Socket.IO
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token || !token.startsWith('Bearer ')) {
      console.error('No valid token provided');
      return next(new Error('Authentication error: No valid token provided'));
    }
    
    const cleanToken = token.split(' ')[1];
    console.log('Verifying token:', cleanToken);
    
    // Query the database to get the user associated with this token
    const [tokens] = await pool.query(
      'SELECT t.*, u.username FROM tokens t JOIN users u ON t.user_id = u.id WHERE t.token = ?',
      [cleanToken]
    );

    if (tokens.length === 0) {
      console.error('Invalid token - no user found');
      return next(new Error('Authentication error: Invalid token'));
    }

    socket.userId = tokens[0].user_id;
    socket.username = tokens[0].username;
    console.log('Socket middleware - User authenticated:', {
      userId: socket.userId,
      username: socket.username
    });
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error(`Authentication error: ${error.message}`));
  }
});

const userSocketMap = new Map();
const connectedRooms = new Map(); // Track users in rooms

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
    userSocketMap.delete(socket.userId);
    
    // Remove user from all rooms they were in
    connectedRooms.forEach((users, room) => {
      users.delete(socket.userId);
    });
  });

  // Handle room joining
  socket.on('join_room', (room, callback) => {
    try {
      console.log(`User ${socket.userId} joining room: ${room}`);
      socket.join(room);
      
      // Track user in room
      if (!connectedRooms.has(room)) {
        connectedRooms.set(room, new Set());
      }
      connectedRooms.get(room).add(socket.userId);
      
      callback({ success: true });
      console.log(`User ${socket.userId} successfully joined room: ${room}`);
    } catch (error) {
      console.error(`Error joining room: ${error.message}`);
      callback({ success: false, error: error.message });
    }
  });

  // Handle room leaving
  socket.on('leave_room', (room, callback) => {
    try {
      console.log(`User ${socket.userId} leaving room: ${room}`);
      socket.leave(room);
      
      // Remove user from room tracking
      if (connectedRooms.has(room)) {
        connectedRooms.get(room).delete(socket.userId);
      }
      
      callback({ success: true });
      console.log(`User ${socket.userId} successfully left room: ${room}`);
    } catch (error) {
      console.error(`Error leaving room: ${error.message}`);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('send_message', (messageData) => {
    console.log('\n=== Message Send Event ===');
    console.log('Raw message data:', JSON.stringify(messageData, null, 2));
    console.log('Sender ID:', socket.userId);
    console.log('Receiver ID:', messageData.receiverId);
    console.log('Current userSocketMap:', Array.from(userSocketMap.entries()));
    
    const receiverSocketId = userSocketMap.get(messageData.receiverId);
    console.log('Found receiver socket ID:', receiverSocketId);
    
    if (receiverSocketId) {
      const messageToSend = {
        ...messageData,
        senderId: socket.userId,
        timestamp: new Date()
      };
      console.log('Emitting message to socket:', receiverSocketId);
      console.log('Message content:', JSON.stringify(messageToSend, null, 2));
      
      io.to(receiverSocketId).emit('new_message', messageToSend);
      
      // Acknowledge message sent
      socket.emit('message_sent', { success: true, messageId: messageData.id });
    } else {
      console.log('Receiver not connected. User ID:', messageData.receiverId);
      console.log('Available users:', Array.from(userSocketMap.keys()));
      socket.emit('message_sent', { success: false, error: 'Receiver not connected' });
    }
  });

  userSocketMap.set(socket.userId, socket.id);
});

app.post('/api/auth/register', async (req, res) => {
  try {
    // Your existing registration logic here
    
    // After successful registration, emit to all users in the new_users_room
    io.to('new_users_room').emit('newUser', {
      id: req.body.id,
      username: req.body.username,
      gender: req.body.gender,
      photoUrl: req.body.photoUrl
    });
    
    res.status(201).json({ /* your response */ });
  } catch (error) {
    // Error handling
  }
});

// Fonction pour initialiser la base de données
async function setupDatabaseAndServer() {
  try {
    await setupDatabase();
  } catch (error) {
    console.error(' Erreur lors de la vérification/initialisation de la base de données:', error);
    throw error;
  }
}


// Charger les certificats SSL
const sslOptions = {
  key: fs.readFileSync(`/etc/letsencrypt/live/${process.env.DOMAIN}/privkey.pem`),
  cert: fs.readFileSync(`/etc/letsencrypt/live/${process.env.DOMAIN}/fullchain.pem`),
};

const httpsServer = https.createServer(sslOptions, app);

httpsServer.listen(process.env.PORT || 443, () => {
  console.log(`✅ HTTPS Server running on https://${process.env.DOMAIN}`);
});

// Démarrer le serveur HTTPS
async function startServer() {
  try {
    console.log('Starting database setup...');
    await setupDatabaseAndServer();
    console.log('✅ Database setup completed');

    const PORT = process.env.PORT || 443;
    const httpsServer = https.createServer(sslOptions, app);

    httpsServer.listen(PORT, process.env.SERVER_IP || '0.0.0.0', () => {
      console.log(`✅ HTTPS Server running on https://${process.env.SERVER_IP || 'localhost'}:${PORT}`);
    });

    io.listen(httpsServer); // Lier Socket.IO au serveur HTTPS
  } catch (error) {
    console.error('\n❌ Startup error:', error);
    process.exit(1);
  }
}

// Lancer le serveur
startServer();