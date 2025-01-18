const router = require('express').Router();
const usersController = require('../controllers/users.controller');
const authMiddleware = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

// Configuration multer pour les photos de profil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Protection des routes avec l'authentification
router.use(authMiddleware);

// Recherche d'utilisateurs
router.get('/search', usersController.searchUsers);

// Obtenir le profil d'un utilisateur
router.get('/profile/:userId', usersController.getUserProfile);

// Mettre à jour son profil
router.put('/profile', upload.single('photo'), usersController.updateProfile);

module.exports = router;
