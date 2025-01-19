const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const fsPromises = require('fs').promises;
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Fonction pour obtenir l'IP du conteneur MySQL
async function getMySQLContainerIP() {
  try {
    const { stdout } = await exec("getent hosts db | awk '{ print $1 }'");
    return stdout.trim();
  } catch (error) {
    console.error('❌ Impossible d\'obtenir l\'IP du conteneur MySQL:', error);
    return process.env.DB_HOST; // Fallback to DB_HOST
  }
}

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: false,
  sslMode: 'DISABLED',
  authPlugins: {
    mysql_native_password: () => () => {
      return Buffer.from([0]);
    }
  }
};

// Création du pool de connexions
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Fonction pour initialiser la base de données
async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: false,
      sslMode: 'DISABLED',
      authPlugins: {
        mysql_native_password: () => () => {
          return Buffer.from([0]);
        }
      }
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
    
    // Obtenir l'IP du conteneur MySQL
    const dbIP = await getMySQLContainerIP();
    console.log(`📍 IP du conteneur MySQL: ${dbIP}`);
    
    // Utiliser le chemin absolu vers mariadb-dump et désactiver SSL de toutes les façons possibles
    const dumpCommand = `/usr/bin/mariadb-dump --skip-ssl --ssl=0 --ssl-mode=DISABLED --ssl-verify-server-cert=FALSE --no-defaults -h ${dbIP} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} --protocol=TCP ${process.env.DB_NAME} > "${dumpPath}"`;
    
    console.log('📦 Exécution de mariadb-dump...');
    console.log('Commande:', dumpCommand);
    
    const { stdout, stderr } = await exec(dumpCommand);
    
    if (stderr && !stderr.includes('Warning') && !stderr.includes('Deprecated')) {
      console.warn('⚠️ Avertissements mariadb-dump:', stderr);
    }
    
    console.log(`✅ Dump de la base de données sauvegardé dans: ${dumpPath}`);
    return dumpPath;
  } catch (error) {
    console.error('❌ Erreur lors du dump de la base de données:', error);
    console.error('Commande complète:', error.cmd);
    console.error('Sortie standard:', error.stdout);
    console.error('Erreur standard:', error.stderr);
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
        password: process.env.DB_PASSWORD,
        ssl: false,
        sslMode: 'DISABLED',
        authPlugins: {
          mysql_native_password: () => () => {
            return Buffer.from([0]);
          }
        }
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
