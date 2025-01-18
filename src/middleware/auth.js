const { pool } = require('../../config/database');

async function authenticateUser(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'authentification manquant'
      });
    }

    // Le token est au format 'token_userId'
    const userId = token.replace('token_', '');
    
    // Vérifier si l'utilisateur existe toujours dans la base de données
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non trouvé. Veuillez vous reconnecter.'
      });
    }

    // Ajouter l'utilisateur à la requête
    req.user = users[0];
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'authentification'
    });
  }
}

module.exports = authenticateUser;
