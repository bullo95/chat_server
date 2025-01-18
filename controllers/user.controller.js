const { pool } = require('../config/database');

// Rechercher des utilisateurs
async function searchUsers(gender = null) {
  try {
    let query = `
      SELECT id, username, photo_url as photoUrl, gender, age, 
             meeting_type as meetingType, description, 
             created_at as createdAt 
      FROM users
    `;
    let params = [];
    
    if (gender) {
      query += ' WHERE gender = ?';
      params.push(gender);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [users] = await pool.query(query, params);
    return users;
  } catch (error) {
    console.error('Erreur lors de la recherche d\'utilisateurs:', error);
    throw error;
  }
}
async function createUser(userData) {
  try {
    console.log('=== Création utilisateur ===');
    console.log('Données reçues brutes:', userData);

       // Vérifier si le username existe déjà
       const usernameTaken = await isUsernameTaken(userData.username);
       if (usernameTaken) {
         throw new Error('Ce nom d\'utilisateur est déjà pris');
       }

    // Générer id et createdAt
    const id = `user_${Date.now()}`;
    const createdAt = Date.now();
    
    // Fusionner les données avec id et createdAt
    const fullUserData = {
      ...userData,  // Garder toutes les données originales
      id,
      createdAt
    };
    
    // Déstructurer après la fusion
    const { username, pinCode, photoUrl, gender, age, meetingType, description } = fullUserData;

    console.log('Age reçu:', age, 'type:', typeof age);
    console.log('=== Avant requête SQL === PLOP');

    const query = `
      INSERT INTO users (
        id, username, pin_code, photo_url, gender, age, 
        meeting_type, description, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      id, username, pinCode, photoUrl, gender, age, 
      meetingType, description, createdAt
    ];
    
    console.log('Paramètres SQL:', params);
    
    await pool.query(query, params);
    
    // Retourner l'utilisateur sans le pin_code
    return {
      id,
      username,
      photoUrl,
      gender,
      age,
      meetingType,
      description,
      createdAt
    };
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    throw error;
  }
}


async function isUsernameTaken(username) {
  const query = 'SELECT COUNT(*) as count FROM users WHERE username = ?';
  const [rows] = await pool.query(query, [username]);
  return rows[0].count > 0;
}


// Trouver un utilisateur par username et pinCode
async function findUserByCredentials(username, pinCode) {
  try {
    const query = `
      SELECT id, username, photo_url as photoUrl, gender, age, 
             meeting_type as meetingType, description, 
             created_at as createdAt
      FROM users 
      WHERE username = ? AND pin_code = ?
    `;
    
    const [users] = await pool.query(query, [username, pinCode]);
    
    if (users.length === 0) {
      return null;
    }
    
    return users[0];
  } catch (error) {
    console.error('Erreur lors de la recherche de l\'utilisateur:', error);
    throw error;
  }
}

module.exports = {
  searchUsers,
  createUser,
  findUserByCredentials
};
