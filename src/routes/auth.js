const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../../config/database');
const authMiddleware = require('../middleware/auth.middleware');

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, '../../public/uploads');
fs.mkdir(uploadsDir, { recursive: true })
  .then(() => console.log('✅ Dossier uploads créé ou existant:', uploadsDir))
  .catch(err => console.error('❌ Erreur lors de la création du dossier uploads:', err));

// Configuration de multer pour le stockage des fichiers
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('\n=== Upload de fichier ===');
    console.log('Fichier reçu:', file);
    console.log('Mimetype:', file.mimetype);
    
    // Liste des types MIME acceptés
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/heif',
      'image/webp',
      'image/gif'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      console.log('✅ Type de fichier accepté');
      cb(null, true);
    } else {
      console.log('❌ Type de fichier refusé');
      cb(new Error('Format de fichier non supporté. Types acceptés: JPG, PNG, HEIC, HEIF, WEBP, GIF'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// Fonction pour traiter et sauvegarder l'image
async function processAndSaveImage(buffer, mimetype) {
  console.log('\n=== Traitement de l\'image ===');
  console.log('Type MIME:', mimetype);
  
  try {
    // S'assurer que le dossier uploads existe
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Convertir HEIC/HEIF en JPEG si nécessaire
    if (mimetype === 'image/heic' || mimetype === 'image/heif') {
      console.log('Conversion HEIC/HEIF vers JPEG');
      buffer = await sharp(buffer)
        .jpeg()
        .toBuffer();
      mimetype = 'image/jpeg';
    }

    // Générer un nom de fichier unique
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.jpg`;
    const filepath = path.join(uploadsDir, filename);
    
    console.log('Sauvegarde dans:', filepath);
    
    // Redimensionner et optimiser l'image
    await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toFile(filepath);

    console.log('✅ Image traitée et sauvegardée:', filename);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('❌ Erreur lors du traitement de l\'image:', error);
    throw error;
  }
}

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: API d'authentification
 */

/**
 * @swagger
 * /register:
 *   post:
 *     tags: [Authentication]
 *     summary: Inscription d'un nouvel utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - pinCode
 *               - gender
 *               - age
 *               - meetingType
 *               - description
 *             properties:
 *               username:
 *                 type: string
 *               pinCode:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               age:
 *                 type: integer
 *                 minimum: 18
 *               meetingType:
 *                 type: string
 *                 enum: [friendship, dating, both]
 *               description:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Données invalides
 */

/**
 * @swagger
 * /login:
 *   post:
 *     tags: [Authentication]
 *     summary: Connexion d'un utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - pinCode
 *             properties:
 *               username:
 *                 type: string
 *               pinCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Identifiants invalides
 */

/**
 * @swagger
 * /logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Déconnexion d'un utilisateur
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *       401:
 *         description: Token invalide
 */

/**
 * @swagger
 * /verify:
 *   get:
 *     tags: [Authentication]
 *     summary: Vérification du token d'un utilisateur
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token valide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *       401:
 *         description: Token invalide
 */

router.post('/register', upload.single('photo'), async (req, res) => {
  try {
    console.log('\n=== Route /register ===');
    const { username, pinCode, gender, age, meetingType, description } = req.body;
    
    console.log('Données reçues:', {
      username,
      gender,
      age,
      meetingType,
      description,
      photo: req.file ? 'Present' : 'Absent'
    });

    // Vérifier si l'utilisateur existe déjà
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      console.log('❌ Utilisateur déjà existant');
      return res.status(400).json({
        success: false,
        error: 'Nom d\'utilisateur déjà pris'
      });
    }

    // Traiter l'image si présente
    let photoUrl = null;
    if (req.file) {
      console.log('Traitement de la photo...');
      photoUrl = await processAndSaveImage(req.file.buffer, req.file.mimetype);
    }

    // Générer un UUID pour l'utilisateur
    const userId = uuidv4();
    console.log('UUID généré:', userId);

    // Créer l'utilisateur
    await pool.query(
      'INSERT INTO users (id, username, pin_code, gender, age, meeting_type, description, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, username, pinCode, gender, parseInt(age, 10), meetingType, description, photoUrl]
    );

    console.log('✅ Utilisateur créé avec ID:', userId);

    // Emit new user event through Socket.IO to the new_users_room
    const io = req.app.get('io');
    console.log('Emitting new user to new_users_room:', {
      id: userId,
      username,
      gender,
      age: parseInt(age, 10),
      photoUrl
    });
    
    io.to('new_users_room').emit('newUser', {
      id: userId,
      username,
      gender,
      age: parseInt(age, 10),
      photoUrl
    });

    // Générer un token
    const token = crypto.randomBytes(32).toString('hex');
    console.log('Token généré:', token);

    // Sauvegarder le token
    await pool.query(
      'INSERT INTO tokens (user_id, token) VALUES (?, ?)',
      [userId, token]
    );

    // Récupérer l'utilisateur créé
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          gender: user.gender,
          age: user.age,
          meetingType: user.meeting_type,
          description: user.description,
          photoUrl: user.photo_url
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'inscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'inscription'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, pinCode } = req.body;
    console.log('Route /login - Tentative de connexion pour:', username);

    // Vérifier les identifiants
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND pin_code = ?',
      [username, pinCode]
    );

    if (users.length === 0) {
      console.log('Route /login - Utilisateur non trouvé');
      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides'
      });
    }

    const user = users[0];
    console.log('Route /login - Utilisateur trouvé:', user);

    // Générer un nouveau token
    const token = crypto.randomBytes(32).toString('hex');
    console.log('Route /login - Nouveau token généré:', token);

    // Sauvegarder le token
    await pool.query(
      'INSERT INTO tokens (user_id, token) VALUES (?, ?)',
      [user.id, token]
    );

    // Nettoyer les anciens tokens de l'utilisateur
    await pool.query(
      'DELETE FROM tokens WHERE user_id = ? AND token != ?',
      [user.id, token]
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          gender: user.gender,
          age: user.age,
          meetingType: user.meeting_type,
          description: user.description,
          photoUrl: user.photo_url
        }
      }
    });
  } catch (error) {
    console.error('Route /login - Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la connexion'
    });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    console.log('Route /logout - Déconnexion pour:', req.user);

    // Supprimer le token
    await pool.query(
      'DELETE FROM tokens WHERE token = ?',
      [req.user.token]
    );

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Route /logout - Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la déconnexion'
    });
  }
});

// Verify
router.get('/verify', authMiddleware, async (req, res) => {
  try {
    console.log('Route /verify - Vérification du token pour:', req.user);
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          username: req.user.username
        }
      }
    });
  } catch (error) {
    console.error('Route /verify - Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification du token'
    });
  }
});

module.exports = router;
