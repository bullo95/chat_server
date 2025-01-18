const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

// Vérification du token
router.get('/', authMiddleware, async (req, res) => {
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
