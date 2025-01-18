require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function initializeDatabase() {
  let connection;

  try {
    // Créer la connexion
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    // Créer la base de données si elle n'existe pas
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`Base de données ${process.env.DB_NAME} créée ou déjà existante`);

    // Utiliser la base de données
    await connection.query(`USE ${process.env.DB_NAME}`);

    // Créer les tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        pin_code VARCHAR(255) NOT NULL,
        photo_url TEXT,
        gender VARCHAR(50),
        age INT,
        meeting_type VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        sender_id VARCHAR(36),
        receiver_id VARCHAR(36),
        content TEXT,
        type VARCHAR(50),
        media_url TEXT,
        gif_id VARCHAR(255),
        media_duration INT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(36) PRIMARY KEY,
        user1_id VARCHAR(36),
        user2_id VARCHAR(36),
        last_message_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user1_id) REFERENCES users(id),
        FOREIGN KEY (user2_id) REFERENCES users(id),
        FOREIGN KEY (last_message_id) REFERENCES messages(id)
      )`
    ];

    for (const table of tables) {
      await connection.query(table);
      console.log('Table créée avec succès');
    }

    console.log('Initialisation de la base de données terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase();
