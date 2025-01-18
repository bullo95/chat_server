const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../../config/database');
const authMiddleware = require('../middleware/auth.middleware');

// Configure multer for media uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const mediaType = file.mimetype.startsWith('video/') ? 'videos' : 'photos';
    const uploadDir = path.join('uploads', mediaType);
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for photos and videos
const fileFilter = (req, file, cb) => {
  const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/quicktime'];
  
  if ([...allowedPhotoTypes, ...allowedVideoTypes].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP images and MP4, QuickTime videos are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max for videos
    files: 12 // Max 12 files at once
  }
});

// Get user's media
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [media] = await pool.query(
      'SELECT * FROM user_media WHERE user_id = ? ORDER BY position',
      [req.user.id]
    );

    res.json(media);
  } catch (error) {
    console.error('Error fetching user media:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching user media' 
    });
  }
});

// Upload new media
router.post('/upload', authMiddleware, upload.array('media', 12), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get current media count
    const [currentMedia] = await connection.query(
      'SELECT COUNT(*) as count FROM user_media WHERE user_id = ?',
      [req.user.id]
    );

    const currentCount = currentMedia[0].count;
    if (currentCount + req.files.length > 12) {
      throw new Error('Maximum media limit exceeded. You can only have 12 media items.');
    }

    // Get the next available position
    const [maxPosition] = await connection.query(
      'SELECT COALESCE(MAX(position), 0) as maxPos FROM user_media WHERE user_id = ?',
      [req.user.id]
    );
    let nextPosition = maxPosition[0].maxPos + 1;

    // Process each uploaded file
    const mediaPromises = req.files.map(async (file) => {
      const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'photo';
      const mediaUrl = '/' + file.path.replace(/\\/g, '/');

      await connection.query(
        'INSERT INTO user_media (id, user_id, media_type, media_url, position) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), req.user.id, mediaType, mediaUrl, nextPosition++]
      );
    });

    await Promise.all(mediaPromises);
    await connection.commit();

    // Fetch and return updated media list
    const [updatedMedia] = await connection.query(
      'SELECT * FROM user_media WHERE user_id = ? ORDER BY position',
      [req.user.id]
    );

    res.json({
      success: true,
      media: updatedMedia
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error uploading media:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error uploading media' 
    });
  } finally {
    connection.release();
  }
});

// Update media positions
router.put('/reorder', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { positions } = req.body; // { mediaId: newPosition }
    
    // Validate positions
    const positionValues = Object.values(positions);
    if (new Set(positionValues).size !== positionValues.length) {
      throw new Error('Duplicate positions are not allowed');
    }

    // Update positions
    const updatePromises = Object.entries(positions).map(([mediaId, position]) => 
      connection.query(
        'UPDATE user_media SET position = ? WHERE id = ? AND user_id = ?',
        [position, mediaId, req.user.id]
      )
    );

    await Promise.all(updatePromises);
    await connection.commit();

    // Fetch and return updated media list
    const [updatedMedia] = await connection.query(
      'SELECT * FROM user_media WHERE user_id = ? ORDER BY position',
      [req.user.id]
    );

    res.json({
      success: true,
      media: updatedMedia
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error reordering media:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error reordering media' 
    });
  } finally {
    connection.release();
  }
});

// Delete media
router.delete('/:mediaId', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get media info before deleting
    const [mediaInfo] = await connection.query(
      'SELECT * FROM user_media WHERE id = ? AND user_id = ?',
      [req.params.mediaId, req.user.id]
    );

    if (!mediaInfo.length) {
      throw new Error('Media not found or unauthorized');
    }

    // Delete the file
    const filePath = path.join(process.cwd(), mediaInfo[0].media_url);
    await fs.unlink(filePath);

    // Delete from database
    await connection.query(
      'DELETE FROM user_media WHERE id = ? AND user_id = ?',
      [req.params.mediaId, req.user.id]
    );

    // Reorder remaining media
    await connection.query(
      `UPDATE user_media 
       SET position = position - 1 
       WHERE user_id = ? AND position > ?`,
      [req.user.id, mediaInfo[0].position]
    );

    await connection.commit();

    // Fetch and return updated media list
    const [updatedMedia] = await connection.query(
      'SELECT * FROM user_media WHERE user_id = ? ORDER BY position',
      [req.user.id]
    );

    res.json({
      success: true,
      media: updatedMedia
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting media:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error deleting media' 
    });
  } finally {
    connection.release();
  }
});

// Set profile picture
router.put('/:mediaId/set-profile', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Verify media belongs to user and is a photo
    const [mediaInfo] = await connection.query(
      'SELECT * FROM user_media WHERE id = ? AND user_id = ? AND media_type = "photo"',
      [req.params.mediaId, req.user.id]
    );

    if (!mediaInfo.length) {
      throw new Error('Photo not found or unauthorized');
    }

    // Update all user's media to not be profile picture
    await connection.query(
      'UPDATE user_media SET is_profile_picture = FALSE WHERE user_id = ?',
      [req.user.id]
    );

    // Set new profile picture
    await connection.query(
      'UPDATE user_media SET is_profile_picture = TRUE WHERE id = ?',
      [req.params.mediaId]
    );

    // Update users table
    await connection.query(
      'UPDATE users SET photo_url = ? WHERE id = ?',
      [mediaInfo[0].media_url, req.user.id]
    );

    await connection.commit();

    res.json({
      success: true,
      profilePicture: mediaInfo[0].media_url
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error setting profile picture:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error setting profile picture' 
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
