const { pool } = require('../../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    console.log('\n=== Auth Middleware ===');
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
    console.log('Authorization Header:', req.headers.authorization);

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      console.log('❌ Pas de token Bearer dans le header');
      return res.status(401).json({
        success: false,
        error: 'Session expirée'
      });
    }

    const token = req.headers.authorization.split(' ')[1];
    console.log('Token extrait:', token);

    // Vérifier si le token existe dans la base de données
    const query = 'SELECT t.*, u.username FROM tokens t JOIN users u ON t.user_id = u.id WHERE t.token = ?';
    console.log('Query:', query);
    console.log('Params:', [token]);

    const [tokens] = await pool.query(query, [token]);
    console.log('Résultat de la requête:', tokens);

    if (tokens.length === 0) {
      console.log('❌ Token non trouvé en base');
      return res.status(401).json({
        success: false,
        error: 'Session expirée'
      });
    }

    // Ajouter les informations de l'utilisateur à la requête
    req.user = {
      id: tokens[0].user_id,
      username: tokens[0].username,
      token: token
    };
    console.log('✅ Utilisateur authentifié:', req.user);
    console.log('=== Fin Auth Middleware ===\n');

    next();
  } catch (error) {
    console.error('❌ Erreur dans le middleware d\'authentification:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification de l\'authentification'
    });
  }
};

module.exports = authMiddleware;
