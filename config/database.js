const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const fsPromises = require('fs').promises;
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Création du pool de connexions
const pool = mysql.createPool(dbConfig);

// Fonction pour initialiser la base de données
async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Créer la base de données si elle n'existe pas
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    console.log('✅ Base de données créée ou existante');

    // Utiliser la base de données
    await connection.query(`USE ${dbConfig.database}`);

    // Fermer la connexion
    await connection.end();
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
    
    // Commande mysqldump simplifiée
    const dumpCommand = `mysqldump -h ${process.env.DB_HOST} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > "${dumpPath}"`;
    
    console.log('📦 Exécution de mysqldump...');
    const { stdout, stderr } = await exec(dumpCommand);
    
    if (stderr && !stderr.includes('Warning')) {
      console.warn('⚠️ Avertissements mysqldump:', stderr);
    }
    
    console.log(`✅ Dump de la base de données sauvegardé dans: ${dumpPath}`);
    return dumpPath;
  } catch (error) {
    console.error('❌ Erreur lors du dump de la base de données:', error);
    throw error;
  }
}

// Fonction pour attendre que la base de données soit prête
async function waitForDatabase(maxAttempts = 30, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 Tentative ${attempt}/${maxAttempts} de connexion à la base de données...`);
      
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      });
      
      await connection.ping();
      await connection.end();
      
      console.log('✅ Base de données prête');
      return true;
    } catch (error) {
      console.error(`❌ Erreur de connexion (tentative ${attempt}/${maxAttempts}):`, error.message);
      
      if (attempt < maxAttempts) {
        console.log(`⏳ Attente de ${delay}ms avant la prochaine tentative...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error('Impossible de se connecter à la base de données après plusieurs tentatives');
}

// Fonction pour configurer la base de données
async function setupDatabase() {
  try {
    await waitForDatabase();
    await initializeDatabase();
    await dumpDatabase();
  } catch (error) {
    console.error('❌ Erreur lors de la vérification/initialisation de la base de données:', error);
    throw error;
  }
}

module.exports = {
  pool,
  setupDatabase,
  dumpDatabase
};
