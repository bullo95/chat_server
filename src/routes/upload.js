const express = require('express');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const router = express.Router();

/**
 * @swagger
 * /api/upload:
 *   post:
 *     tags:
 *       - Upload
 *     summary: Upload un fichier média (image ou vidéo)
 *     description: Permet d'uploader une image ou une vidéo avec une limite de 50MB
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: Fichier à uploader (image ou vidéo)
 *     responses:
 *       200:
 *         description: Upload réussi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: URL du fichier uploadé
 *                 type:
 *                   type: string
 *                   enum: [image, video]
 *                   description: Type de média
 *                 filename:
 *                   type: string
 *                   description: Nom du fichier
 *                 size:
 *                   type: number
 *                   description: Taille du fichier en bytes
 *                 mimetype:
 *                   type: string
 *                   description: Type MIME du fichier
 *       400:
 *         description: Erreur de validation ou fichier manquant
 *       413:
 *         description: Fichier trop volumineux (> 50MB)
 */

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Ajout d'un timestamp pour éviter les conflits de noms
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit pour permettre les vidéos
  },
  fileFilter: (req, file, cb) => {
    // Types de fichiers autorisés
    const allowedImageTypes = /jpeg|jpg|png|gif|webp|svg|bmp|tiff|heic|raw/i;
    const allowedVideoTypes = /mp4/i;
    
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    
    // Vérification pour les images
    const isImage = 
      allowedImageTypes.test(ext.substring(1)) && 
      mime.startsWith('image/');
    
    // Vérification pour les vidéos
    const isVideo = 
      allowedVideoTypes.test(ext.substring(1)) && 
      mime.startsWith('video/');

    if (isImage || isVideo) {
      return cb(null, true);
    } else {
      cb(new Error('Format de fichier non autorisé. Formats acceptés : JPEG, JPG, PNG, GIF, WEBP, SVG, BMP, TIFF, HEIC, RAW, MP4'));
    }
  }
});

// Upload endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('Aucun fichier uploadé');
    }

    // Déterminer le type de média
    const isVideo = req.file.mimetype.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'image';

    const fileUrl = `http://${process.env.SERVER_IP}:${process.env.PORT}/uploads/${req.file.filename}`;
    
    res.status(200).json({ 
      url: fileUrl,
      type: mediaType,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
});

module.exports = router;
