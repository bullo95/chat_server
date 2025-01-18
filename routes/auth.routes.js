const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Inscription
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Le pseudo doit faire au moins 3 caractères')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Le pseudo ne peut contenir que des lettres, chiffres et _'),
    body('pinCode')
      .isLength({ min: 4, max: 4 })
      .withMessage('Le code PIN doit faire exactement 4 caractères')
      .matches(/^\d+$/)
      .withMessage('Le code PIN doit être composé uniquement de chiffres'),
    body('photoUrl')
      .notEmpty()
      .withMessage('L\'URL de la photo est requise')
      .custom((value) => {
        return value.startsWith('https://') || value.startsWith('http://192.168.');
      })
      .withMessage('L\'URL de la photo doit être une URL valide'),
    body('gender')
      .isIn(['Homme', 'Femme', 'Autre'])
      .withMessage('Le genre doit être "Homme", "Femme" ou "Autre"'),
    body('age')
      .isInt({ min: 18 })
      .withMessage('Vous devez avoir au moins 18 ans'),
    body('meetingType')
      .isIn(['Amitié', 'Amour', 'Les deux'])
      .withMessage('Type de rencontre invalide'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('La description ne peut pas dépasser 200 caractères'),
  ],
  authController.register
);

// Connexion
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Le pseudo est requis'),
    body('pinCode')
      .isLength({ min: 4, max: 4 })
      .withMessage('Le code PIN doit faire exactement 4 caractères')
      .matches(/^\d+$/)
      .withMessage('Le code PIN doit être composé uniquement de chiffres'),
  ],
  authController.login
);

// Obtenir les informations de l'utilisateur connecté
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
