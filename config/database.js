const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Configuration de la base de données
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dating_app'
};

// Création du pool de connexions
const pool = mysql.createPool(dbConfig);

// Fonction pour initialiser la base de données
async function initDatabase() {
  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'database.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');

    // Diviser le contenu en requêtes individuelles
    const queries = sqlContent
      .split(';')
      .filter(query => query.trim().length > 0);

    // Exécuter chaque requête
    for (const query of queries) {
      await pool.query(query);
    }

    console.log('✅ Base de données initialisée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  }
}

module.exports = {
  pool,
  initDatabase
};
