-- Suppression des tables si elles existent
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS tokens;
DROP TABLE IF EXISTS users;

-- Création de la table users
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  pin_code VARCHAR(255) NOT NULL,
  gender ENUM('Male', 'Female', 'Other') NOT NULL,
  age TINYINT UNSIGNED NOT NULL CHECK (age >= 18 AND age <= 100),
  meeting_type ENUM('Friendship', 'Dating', 'Both') NOT NULL,
  description TEXT,
  photo_url VARCHAR(255),
  location VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Création de la table tokens
CREATE TABLE tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Création de la table messages
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  sender_id VARCHAR(36) NOT NULL,
  receiver_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  message_type ENUM('text', 'image') NOT NULL DEFAULT 'text',
  is_read BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour optimiser les recherches
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_tokens_token ON tokens(token);
CREATE INDEX idx_tokens_user_id ON tokens(user_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id, created_at);