const mysql = require('mysql2/promise');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Configuration de la base de données
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dating_app'
};

// Création du pool de connexions
const pool = mysql.createPool(dbConfig);

// Fonction pour s'assurer que la base de données existe et est sélectionnée
async function ensureDatabase() {
  try {
    // Se connecter sans spécifier de base de données
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Créer la base de données si elle n'existe pas
    await connection.query('CREATE DATABASE IF NOT EXISTS dating_app');
    
    // Fermer la connexion temporaire
    await connection.end();

    // Se connecter à la base de données
    await pool.query('USE dating_app');
  } catch (error) {
    console.error('❌ Erreur lors de la création/sélection de la base de données:', error);
    throw error;
  }
}

// Fonction pour vérifier la structure de la base de données
async function checkDatabaseStructure() {
  try {
    // Vérifier si la base de données existe
    await pool.query('USE dating_app');
    
    // Récupérer la liste des tables
    const [tables] = await pool.query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'dating_app'
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);

    // Structure attendue des tables
    const expectedTables = {
      'users': new Set(['id', 'username', 'pin_code', 'photo_url', 'gender', 'meeting_type', 'description', 'created_at', 'updated_at']),
      'conversations': new Set(['id', 'created_at']),
      'conversation_participants': new Set(['conversation_id', 'user_id', 'created_at']),
      'messages': new Set(['id', 'conversation_id', 'sender_id', 'content', 'type', 'gif_id', 'created_at'])
    };

    // Vérifier que toutes les tables et colonnes attendues existent
    const existingTables = {};
    tables.forEach(column => {
      if (!existingTables[column.TABLE_NAME]) {
        existingTables[column.TABLE_NAME] = new Set();
      }
      existingTables[column.TABLE_NAME].add(column.COLUMN_NAME);
    });

    // Comparer avec la structure attendue
    for (const [tableName, expectedColumns] of Object.entries(expectedTables)) {
      if (!existingTables[tableName]) {
        return false;
      }
      for (const column of expectedColumns) {
        if (!existingTables[tableName].has(column)) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la vérification de la structure:', error);
    return false;
  }
}

// Fonction pour supprimer toutes les tables
async function dropAllTables() {
  try {
    // Désactiver les contraintes de clés étrangères
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    // Supprimer les tables dans l'ordre inverse des dépendances
    const tables = ['messages', 'conversation_participants', 'conversations', 'users'];
    for (const table of tables) {
      await pool.query(`DROP TABLE IF EXISTS ${table}`);
    }

    // Réactiver les contraintes de clés étrangères
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ Toutes les tables ont été supprimées');
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des tables:', error);
    throw error;
  }
}

// Fonction pour nettoyer une requête SQL
function cleanSqlQuery(query) {
  return query
    .split('\n')
    .filter(line => !line.trim().startsWith('--')) // Supprimer les commentaires
    .join('\n')
    .trim();
}

// Fonction pour initialiser la base de données
async function initDatabase() {
  try {
    // S'assurer que la base de données existe
    await ensureDatabase();

    // Supprimer toutes les tables existantes
    await dropAllTables();

    // Lire et exécuter le fichier SQL
    console.log('🔄 Exécution du fichier database.sql...');
    const sqlPath = path.join(__dirname, '..', 'database.sql');
    const sqlContent = await fsPromises.readFile(sqlPath, 'utf8');

    // Diviser le contenu en requêtes individuelles et les exécuter
    const queries = sqlContent
      .split(';')
      .map(cleanSqlQuery)
      .filter(query => query.length > 0);

    // Exécuter les requêtes dans l'ordre
    for (const query of queries) {
      try {
        await pool.query(query);
      } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la requête:', query);
        throw error;
      }
    }

    console.log('✅ Base de données initialisée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  }
}

// Fonction pour faire un dump de la base de données
async function dumpDatabase() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dumpDir = path.join(__dirname, '..', 'database_dumps');
    
    // Créer le dossier dumps s'il n'existe pas
    if (!fs.existsSync(dumpDir)) {
      await fsPromises.mkdir(dumpDir, { recursive: true });
    }

    const dumpPath = path.join(dumpDir, `dump_${timestamp}.sql`);
    
    // Construire la commande mysqldump avec les credentials de la connexion
    const mysqldumpCommand = `mysqldump -h ${dbConfig.host} -u ${dbConfig.user}${dbConfig.password ? ` -p${dbConfig.password}` : ''} ${dbConfig.database} > "${dumpPath}"`;
    
    // Exécuter mysqldump
    await exec(mysqldumpCommand);
    console.log(`✅ Dump de la base de données sauvegardé dans: ${dumpPath}`);
    
    return dumpPath;
  } catch (error) {
    console.error('❌ Erreur lors du dump de la base de données:', error);
    throw error;
  }
}

// Fonction pour initialiser la base de données
async function setupDatabase() {
  try {
    const isValid = await checkDatabaseStructure();
    if (!isValid) {
      console.log('❗ Structure de la base de données non conforme');
      try {
        // Faire un dump avant la réinitialisation
        const dumpPath = await dumpDatabase();
        console.log('✅ Sauvegarde de la base de données effectuée');
        
        // Réinitialiser la base de données
        console.log('🔄 Réinitialisation de la base de données...');
        await initDatabase();
        console.log('✅ Base de données réinitialisée avec succès');
      } catch (error) {
        if (error.code === 'ER_BAD_DB_ERROR') {
          // La base de données n'existe pas encore, pas besoin de faire un dump
          console.log('📝 Première initialisation de la base de données...');
          await initDatabase();
          console.log('✅ Base de données initialisée avec succès');
        } else {
          throw error;
        }
      }
    } else {
      console.log('✅ Structure de la base de données conforme');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification/initialisation de la base de données:', error);
    throw error;
  }
}

module.exports = {
  pool,
  initDatabase,
  checkDatabaseStructure,
  dumpDatabase,
  setupDatabase
};
