const pool = require('../config/database');

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, messageType, content, gifId } = req.body;
    const senderId = req.userData.userId;

    // Insérer le message
    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, message_type, content, gif_id) VALUES (?, ?, ?, ?, ?)',
      [senderId, receiverId, messageType, content, gifId]
    );

    // Mettre à jour ou créer la conversation
    await pool.query(`
      INSERT INTO conversations (user1_id, user2_id, last_message_id)
      VALUES (LEAST(?, ?), GREATEST(?, ?), ?)
      ON DUPLICATE KEY UPDATE last_message_id = ?, updated_at = CURRENT_TIMESTAMP
    `, [senderId, receiverId, senderId, receiverId, result.insertId, result.insertId]);

    // Si c'est une image, sauvegarder dans media_files
    if (messageType === 'image') {
      await pool.query(
        'INSERT INTO media_files (message_id, file_path, file_type) VALUES (?, ?, ?)',
        [result.insertId, content, 'image']
      );
    }

    res.status(201).json({
      message: 'Message sent successfully',
      messageId: result.insertId
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.userData;
    const { otherUserId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Récupérer les messages
    const [messages] = await pool.query(`
      SELECT 
        m.*,
        u_sender.username as sender_username,
        u_sender.photo_url as sender_photo
      FROM messages m
      JOIN users u_sender ON m.sender_id = u_sender.id
      WHERE 
        (sender_id = ? AND receiver_id = ?) OR
        (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, otherUserId, otherUserId, userId, parseInt(limit), offset]);

    // Marquer les messages comme lus
    await pool.query(`
      UPDATE messages 
      SET is_read = TRUE 
      WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE
    `, [otherUserId, userId]);

    res.json({
      messages: messages.reverse(),
      page: parseInt(page),
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ message: 'Error retrieving messages' });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const { userId } = req.userData;

    const [conversations] = await pool.query(`
      SELECT 
        c.*,
        u.username,
        u.photo_url,
        u.meeting_type,
        m.content as last_message,
        m.message_type as last_message_type,
        m.created_at as last_message_time,
        (SELECT COUNT(*) FROM messages 
         WHERE receiver_id = ? 
         AND sender_id = IF(c.user1_id = ?, c.user2_id, c.user1_id)
         AND is_read = FALSE) as unread_count
      FROM conversations c
      JOIN users u ON (c.user1_id = ? AND c.user2_id = u.id) OR (c.user2_id = ? AND c.user1_id = u.id)
      LEFT JOIN messages m ON c.last_message_id = m.id
      ORDER BY c.updated_at DESC
    `, [userId, userId, userId, userId]);

    res.json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ message: 'Error retrieving conversations' });
  }
};
