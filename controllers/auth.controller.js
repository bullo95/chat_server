const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/database');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

exports.verifyQRCode = async (req, res) => {
  const { code } = req.params;

  try {
    const [event] = await db.query(
      'SELECT * FROM events WHERE qr_code = ? AND start_time <= NOW() AND end_time >= NOW()',
      [code]
    );

    if (!event.length) {
      return res.status(400).json({
        valid: false,
        message: 'QR Code invalide ou événement terminé'
      });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Error verifying QR code:', error);
    res.status(500).json({
      valid: false,
      message: 'Erreur lors de la vérification du QR code'
    });
  }
};

exports.register = async (req, res) => {
  console.log('Données reçues:', req.body);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Erreurs de validation:', errors.array());
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const {
    username,
    pinCode,
    photoUrl,
    gender,
    age,
    meetingType,
    description
  } = req.body;

  try {
    // Vérifier si le pseudo est déjà pris
    console.log('Vérification du pseudo:', username);
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    console.log('Résultat de la recherche:', existingUser);

    if (existingUser.length > 0) {
      return res.status(400).json({
        error: 'Ce pseudo est déjà pris'
      });
    }

    // Hasher le code PIN
    console.log('Hashage du code PIN');
    const hashedPin = await bcrypt.hash(pinCode, 10);

    // Insérer le nouvel utilisateur
    console.log('Insertion du nouvel utilisateur avec les données:', {
      username,
      photoUrl,
      gender,
      age,
      meetingType,
      description: description || null
    });

    const [result] = await db.query(
      'INSERT INTO users (username, pin_code, photo_url, gender, age, meeting_type, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPin, photoUrl, gender, age, meetingType, description || null]
    );
    console.log('Résultat de l\'insertion:', result);

    const token = generateToken(result.insertId);
    console.log('Token généré pour l\'utilisateur:', result.insertId);

    const userData = {
      id: result.insertId,
      username,
      photoUrl,
      gender,
      age,
      meetingType,
      description
    };

    res.status(201).json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'inscription'
    });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { username, pinCode } = req.body;

  try {
    // Trouver l'utilisateur par son pseudo
    const [users] = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Identifiants invalides'
      });
    }

    const user = users[0];

    // Vérifier le code PIN
    const isValidPin = await bcrypt.compare(pinCode, user.pin_code);

    if (!isValidPin) {
      return res.status(401).json({
        error: 'Identifiants invalides'
      });
    }

    const token = generateToken(user.id);

    const userData = {
      id: user.id,
      username: user.username,
      photoUrl: user.photo_url,
      gender: user.gender,
      age: user.age,
      meetingType: user.meeting_type,
      description: user.description
    };

    res.json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      error: 'Erreur lors de la connexion'
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, photo_url, gender, age, meeting_type, description FROM users WHERE id = ?',
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    const user = users[0];

    const userData = {
      id: user.id,
      username: user.username,
      photoUrl: user.photo_url,
      gender: user.gender,
      age: user.age,
      meetingType: user.meeting_type,
      description: user.description
    };

    res.json(userData);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de l\'utilisateur'
    });
  }
};
