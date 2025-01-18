const router = require('express').Router();
const messagesController = require('../controllers/messages.controller');
const authMiddleware = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

// Configuration de multer pour le stockage des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
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

// Routes protégées par l'authentification
router.use(authMiddleware);

// Envoyer un message
router.post('/send', messagesController.sendMessage);

// Récupérer une conversation spécifique
router.get('/conversation/:otherUserId', messagesController.getConversation);

// Récupérer toutes les conversations
router.get('/conversations', messagesController.getConversations);

// Upload d'image
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image provided' });
  }
  res.json({ 
    filePath: `/uploads/images/${req.file.filename}`,
    message: 'Image uploaded successfully' 
  });
});

module.exports = router;
