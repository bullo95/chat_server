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
      title: 'Chat API',
      version: '1.0.0',
      description: 'API documentation for the chat application'
    },
    servers: [
      {
        url: `http://${process.env.DOMAIN}:8080/api`,
        description: 'Development server'
      }
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
  origin: true, // reflects the request origin
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

async function setupServer() {
  console.log('Setting up server...');
  
  const sslDir = path.join(__dirname, 'ssl');
  const certPath = path.join(sslDir, 'fullchain.pem');
  const keyPath = path.join(sslDir, 'privkey.pem');

  try {
    // Try to read SSL certificates
    const credentials = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      minVersion: 'TLSv1.2'
    };

    console.log('SSL certificates found, starting HTTPS server...');
    return https.createServer(credentials, app);
  } catch (error) {
    console.log('SSL certificates not found, starting HTTP server...');
    return require('http').createServer(app);
  }
}

// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Add test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DOMAIN: process.env.DOMAIN,
      SERVER_IP: process.env.SERVER_IP
    }
  });
});

// Serve Swagger UI
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Middleware pour servir les fichiers statiques du dossier uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Documentation Swagger UI avec options d'export
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

// Start server
async function start() {
  try {
    console.log('Starting database setup...');
    await setupDatabaseAndServer();
    console.log('✅ Database setup completed');

    const server = await setupServer();
    io.listen(server);

    const port = process.env.PORT || 61860;
    const domain = process.env.DOMAIN || process.env.SERVER_IP;
    
    // Log server configuration before starting
    console.log('\nServer Configuration:');
    console.log(`- Domain: ${domain}`);
    console.log(`- Port: ${port}`);
    
    // Start the server
    await new Promise((resolve, reject) => {
      server.listen(port, '0.0.0.0')
        .once('error', reject)
        .once('listening', () => {
          const protocol = server instanceof https.Server ? 'HTTPS' : 'HTTP';
          console.log(`\n✅ ${protocol} Server started successfully on port ${port}`);
          resolve();
        });
    });
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${process.env.PORT} is already in use`);
      console.error('Please make sure no other service is using this port');
    } else {
      console.error('\n❌ Startup error:', error);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Start the application
start();
