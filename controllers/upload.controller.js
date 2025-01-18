const fs = require('fs');
const path = require('path');

exports.uploadImage = (req, res) => {
  console.log('=== Début uploadImage ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  try {
    const { image, filename } = req.body;
    
    if (!image || !filename) {
      console.error('Image ou filename manquant');
      return res.status(400).json({ error: 'Image et filename requis' });
    }

    console.log('Filename reçu:', filename);
    
    // Créer le dossier uploads s'il n'existe pas
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(filename);
    const newFilename = uniqueSuffix + ext;
    const filepath = path.join(uploadDir, newFilename);

    console.log('Sauvegarde dans:', filepath);

    // Convertir le base64 en buffer et sauvegarder
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filepath, imageBuffer);

    // Construire l'URL de l'image avec l'IP du serveur
    const imageUrl = `http://${req.serverIP}:${process.env.PORT || 61860}/uploads/${newFilename}`;
    console.log('URL générée:', imageUrl);

    res.status(200).json({
      url: imageUrl,
      filename: newFilename
    });
  } catch (error) {
    console.error('Erreur dans uploadImage:', error);
    res.status(500).json({ error: error.message });
  }
};
