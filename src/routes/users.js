const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const authMiddleware = require('../middleware/auth.middleware');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Wrong file type. Only jpg and png are allowed.');
      error.code = 'INCORRECT_FILETYPE';
      return cb(error, false);
    }
    cb(null, true);
  }
});

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestion des utilisateurs et des profils
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *           description: Identifiant unique de l'utilisateur
 *         username:
 *           type: string
 *           example: "john_doe"
 *           description: Nom d'utilisateur
 *         photoUrl:
 *           type: string
 *           example: "/uploads/1737065326422-36b06a568507561b.jpg"
 *           description: URL de la photo de profil
 *         gender:
 *           type: string
 *           example: "female"
 *           description: Genre de l'utilisateur
 *         age:
 *           type: integer
 *           example: 25
 *           description: Âge de l'utilisateur
 *         meetingType:
 *           type: string
 *           example: "Both"
 *           description: Type de rencontre souhaité
 *         description:
 *           type: string
 *           example: "Description here"
 *           description: Description du profil
 *     UserProfileResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *           description: Indique si la requête a réussi
 *         data:
 *           $ref: '#/components/schemas/UserProfile'
 */

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     tags: [Users]
 *     summary: Récupère la liste des utilisateurs en fonction des critères de recherche
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Numéro de page
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Nombre d'utilisateurs par page
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *         description: Genre des utilisateurs à rechercher
 *       - in: query
 *         name: meetingTypes
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Types de rencontre des utilisateurs à rechercher
 *       - in: query
 *         name: minAge
 *         schema:
 *           type: integer
 *         description: Âge minimum des utilisateurs à rechercher
 *       - in: query
 *         name: maxAge
 *         schema:
 *           type: integer
 *         description: Âge maximum des utilisateurs à rechercher
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   username:
 *                     type: string
 *                   photoUrl:
 *                     type: string
 *                   gender:
 *                     type: string
 *                   age:
 *                     type: integer
 *                   meetingType:
 *                     type: string
 *                   description:
 *                     type: string
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */

// Route de recherche des utilisateurs
router.post('/search', authMiddleware, async (req, res) => {
  try {
    const { page = 0, pageSize = 20, gender, meetingTypes, minAge = 18, maxAge = 99 } = req.body;
    // Fix offset calculation to start from 0
    const offset = Math.max(0, parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    console.log('Parsed parameters:', {
      page: page + ' (type: ' + typeof page + ')',
      pageSize: pageSize + ' (type: ' + typeof pageSize + ')',
      gender: gender + ' (type: ' + typeof gender + ')',
      meetingTypes: meetingTypes + ' (type: ' + typeof meetingTypes + ')',
      minAge: minAge + ' (type: ' + typeof minAge + ')',
      maxAge: maxAge + ' (type: ' + typeof maxAge + ')',
      calculatedOffset: offset
    });

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE id != ? AND age BETWEEN ? AND ?';
    const countParams = [req.user.id, parseInt(minAge), parseInt(maxAge)];

    if (gender && gender.length > 0) {
      const genderValues = Array.isArray(gender) ? gender : [gender];
      countQuery += ' AND gender IN (?)';
      countParams.push(genderValues);
    }

    if (meetingTypes && meetingTypes.length > 0) {
      const types = Array.isArray(meetingTypes) ? meetingTypes : [meetingTypes];
      if (types.includes('Networking')) {
        countQuery += ' AND (meeting_type IN (?) OR meeting_type = \'Both\')';
      } else {
        countQuery += ' AND meeting_type IN (?)';
      }
      countParams.push(types);
    }

    // Construire la requête SQL
    let query = 'SELECT * FROM users WHERE id != ? AND age BETWEEN ? AND ?';
    const params = [req.user.id, parseInt(minAge), parseInt(maxAge)];

    if (gender && gender.length > 0) {
      const genderValues = Array.isArray(gender) ? gender : [gender];
      query += ' AND gender IN (?)';
      params.push(genderValues);
    }

    if (meetingTypes && meetingTypes.length > 0) {
      const types = Array.isArray(meetingTypes) ? meetingTypes : [meetingTypes];
      if (types.includes('Networking')) {
        query += ' AND (meeting_type IN (?) OR meeting_type = \'Both\')';
      } else {
        query += ' AND meeting_type IN (?)';
      }
      params.push(types);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Log the actual SQL query that will be executed
    const mysql = require('mysql2');
    const sql = mysql.format(query, params);
    console.log('Actual SQL query to be executed:', sql);

    // Get total count
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;
    console.log('Total matching records:', total);

    // Execute search query
    const [users] = await pool.query(query, params);
    console.log('Found users:', users.length);

    // Formater les résultats
    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      photoUrl: user.photo_url,
      gender: user.gender,
      age: user.age,
      meetingType: user.meeting_type === 'Both' ? 'Networking' : user.meeting_type,
      description: user.description
    }));

    // Send pagination info along with results
    res.json({
      users: formattedUsers,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('Erreur lors de la recherche des utilisateurs:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la recherche des utilisateurs'
    });
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Récupère le profil de l'utilisateur connecté (Format Legacy)
 *     description: |
 *       Retourne les informations du profil de l'utilisateur authentifié.
 *       Note - Cette endpoint utilise un format de réponse legacy avec un wrapper success/data.
 *       Pour les nouvelles intégrations, utilisez plutôt /api/users/userProfile.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil de l'utilisateur récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */

/**
 * @swagger
 * /api/users/userProfile:
 *   get:
 *     tags: [Users]
 *     summary: Récupère le profil d'un utilisateur (Format Recommandé)
 *     description: |
 *       Retourne les informations du profil de l'utilisateur connecté ou d'un utilisateur spécifique.
 *       Cette endpoint retourne directement les données de l'utilisateur sans wrapper.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur (optionnel, si non fourni retourne le profil connecté)
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Profil de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Non authentifié"
 *       404:
 *         description: Utilisateur non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Utilisateur non trouvé"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */

// Route pour récupérer le profil de l'utilisateur
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    console.log('Récupération du profil pour l\'utilisateur:', req.user.id);

    const [users] = await pool.query(
      'SELECT id, username, photo_url, gender, age, meeting_type, description FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    const user = users[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        photoUrl: user.photo_url,
        gender: user.gender,
        age: user.age,
        meetingType: user.meeting_type,
        description: user.description
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du profil'
    });
  }
});

// Route pour récupérer le profil d'un utilisateur
router.get('/userProfile', authMiddleware, async (req, res) => {
  try {
    const { id } = req.query;
    const userId = id || req.user.id;

    const [users] = await pool.query(
      'SELECT id, username, photo_url, gender, age, meeting_type, description FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      username: user.username,
      photoUrl: user.photo_url,
      gender: user.gender,
      age: user.age,
      meetingType: user.meeting_type,
      description: user.description
    });
  } catch (error) {
    console.error('Error in GET /userProfile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Met à jour le profil de l'utilisateur connecté
 *     description: Permet de mettre à jour les informations du profil. Seuls les champs fournis seront mis à jour.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "john_doe"
 *                 description: Nouveau nom d'utilisateur
 *               gender:
 *                 type: string
 *                 example: "homme"
 *                 description: Genre de l'utilisateur
 *                 enum: [homme, femme, autre]
 *               age:
 *                 type: integer
 *                 example: 25
 *                 description: Âge de l'utilisateur
 *                 minimum: 18
 *               meetingType:
 *                 type: string
 *                 example: "amitié"
 *                 description: Type de rencontre recherché
 *                 enum: [amitié, amour, les_deux]
 *               description:
 *                 type: string
 *                 example: "Passionné de photographie et de voyages"
 *                 description: Description du profil
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Profil mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     username:
 *                       type: string
 *                       example: "john_doe"
 *                     photoUrl:
 *                       type: string
 *                       example: "http://example.com/uploads/profile123.jpg"
 *                     gender:
 *                       type: string
 *                       example: "homme"
 *                     age:
 *                       type: integer
 *                       example: 25
 *                     meetingType:
 *                       type: string
 *                       example: "amitié"
 *                     description:
 *                       type: string
 *                       example: "Passionné de photographie et de voyages"
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Nom d'utilisateur déjà pris"
 *       401:
 *         description: Non authentifié
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Token d'authentification manquant ou invalide"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Erreur lors de la mise à jour du profil"
 */

// Route pour mettre à jour le profil de l'utilisateur
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    console.log('Mise à jour du profil pour l\'utilisateur:', req.user.id);
    const { username, gender, age, meetingType, description } = req.body;

    // Vérifier si le nom d'utilisateur est déjà pris (sauf par l'utilisateur actuel)
    if (username) {
      const [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, req.user.id]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Nom d\'utilisateur déjà pris'
        });
      }
    }

    // Construire la requête de mise à jour
    const updates = [];
    const params = [];
    
    if (username) {
      updates.push('username = ?');
      params.push(username);
    }
    if (gender) {
      updates.push('gender = ?');
      params.push(gender);
    }
    if (age) {
      updates.push('age = ?');
      params.push(parseInt(age, 10));
    }
    if (meetingType) {
      updates.push('meeting_type = ?');
      params.push(meetingType);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune donnée à mettre à jour'
      });
    }

    params.push(req.user.id);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Récupérer le profil mis à jour
    const [users] = await pool.query(
      'SELECT id, username, photo_url, gender, age, meeting_type, description FROM users WHERE id = ?',
      [req.user.id]
    );

    const user = users[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        photoUrl: user.photo_url,
        gender: user.gender,
        age: user.age,
        meetingType: user.meeting_type,
        description: user.description
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du profil'
    });
  }
});

/**
 * @swagger
 * /api/users/profile/photo:
 *   put:
 *     tags: [Users]
 *     summary: Met à jour la photo de profil de l'utilisateur
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo de profil mise à jour avec succès
 *       400:
 *         description: Erreur dans le format du fichier
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.put('/profile/photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune photo n\'a été fournie' });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `${req.user.id}-${Date.now()}.webp`;
    const filepath = path.join(uploadsDir, filename);

    // Process and save the image
    await sharp(req.file.buffer)
      .resize(800, 800, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(filepath);

    // Update user's photo_url in database
    const photoUrl = `/uploads/${filename}`;
    await pool.query(
      'UPDATE users SET photo_url = ? WHERE id = ?',
      [photoUrl, req.user.id]
    );

    // Delete old photo if it exists
    const [user] = await pool.query('SELECT photo_url FROM users WHERE id = ?', [req.user.id]);
    if (user[0].photo_url && user[0].photo_url !== photoUrl) {
      const oldFilePath = path.join(__dirname, '../..', user[0].photo_url);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    res.json({ 
      message: 'Photo de profil mise à jour avec succès',
      photoUrl 
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la photo de profil:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la photo de profil' });
  }
});

module.exports = router;
