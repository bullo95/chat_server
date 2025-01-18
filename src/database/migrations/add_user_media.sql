-- Create user_media table
CREATE TABLE IF NOT EXISTS user_media (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  media_type ENUM('photo', 'video') NOT NULL,
  media_url VARCHAR(255) NOT NULL,
  is_profile_picture BOOLEAN DEFAULT FALSE,
  position INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  -- Ensure each user has max 12 media items
  CONSTRAINT check_media_count CHECK (
    position <= 12
  ),
  -- Ensure positions are unique per user
  UNIQUE KEY unique_user_position (user_id, position)
);

-- Add indexes
CREATE INDEX idx_user_media_user ON user_media(user_id);
CREATE INDEX idx_user_media_type ON user_media(media_type);

-- Migrate existing profile photos
INSERT INTO user_media (id, user_id, media_type, media_url, is_profile_picture, position)
SELECT 
  UUID() as id,
  id as user_id,
  'photo' as media_type,
  photo_url as media_url,
  TRUE as is_profile_picture,
  1 as position
FROM users 
WHERE photo_url IS NOT NULL;
