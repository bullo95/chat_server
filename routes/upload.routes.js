const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');

// Log middleware spécifique pour les routes d'upload
router.use((req, res, next) => {
  console.log('=== Requête Upload ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('URL:', req.url);
  next();
});

// Route pour l'upload d'image
router.post('/', uploadController.uploadImage);

module.exports = router;
