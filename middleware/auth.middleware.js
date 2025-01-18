const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('No Authorization header');
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Récupérer le token du header Authorization
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('No token found in Authorization header');
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Vérifier le token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decodedToken);
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
