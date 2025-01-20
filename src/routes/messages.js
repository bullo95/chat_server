const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const authMiddleware = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');
const { sendPushNotification } = require('./notifications');

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Gestion des messages et conversations
 */

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     tags: [Messages]
 *     summary: Récupère la liste des conversations de l'utilisateur
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   username:
 *                     type: string
 *                   photoUrl:
 *                     type: string
 *                   lastMessage:
 *                     type: string
 *                   lastMessageTime:
 *                     type: string
 *                   unreadCount:
 *                     type: integer
 *       401:
 *         description: Non authentifié
 */

/**
 * @swagger
 * /api/messages/conversation/:userId:
 *   get:
 *     tags: [Messages]
 *     summary: Récupère les messages d'une conversation et les informations des utilisateurs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur avec qui on discute
 *     responses:
 *       200:
 *         description: Messages de la conversation et informations des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 currentUser:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     photoUrl:
 *                       type: string
 *                     age:
 *                       type: integer
 *                     gender:
 *                       type: string
 *                     description:
 *                       type: string
 *                     location:
 *                       type: string
 *                 otherUser:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     photoUrl:
 *                       type: string
 *                     age:
 *                       type: integer
 *                     gender:
 *                       type: string
 *                     description:
 *                       type: string
 *                     location:
 *                       type: string
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       senderId:
 *                         type: string
 *                       receiverId:
 *                         type: string
 *                       content:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       isRead:
 *                         type: boolean
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */

/**
 * @swagger
 * /api/messages/send:
 *   post:
 *     tags: [Messages]
 *     summary: Envoie un message
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - content
 *             properties:
 *               receiverId:
 *                 type: string
 *               content:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [text, image]
 *                 default: text
 *     responses:
 *       200:
 *         description: Message envoyé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 senderId:
 *                   type: string
 *                 receiverId:
 *                   type: string
 *                 content:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                 isRead:
 *                   type: boolean
 *       401:
 *         description: Non authentifié
 */

// Middleware d'authentification pour toutes les routes
router.use(authMiddleware);

// Récupérer les conversations
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer toutes les conversations de l'utilisateur
    const [conversations] = await pool.query(`
      SELECT DISTINCT
        u.id,
        u.username,
        u.photo_url as photoUrl,
        (
          SELECT content
          FROM messages as m2
          WHERE (m2.sender_id = ? AND m2.receiver_id = u.id)
             OR (m2.sender_id = u.id AND m2.receiver_id = ?)
          ORDER BY m2.created_at DESC
          LIMIT 1
        ) as lastMessage,
        (
          SELECT created_at
          FROM messages as m2
          WHERE (m2.sender_id = ? AND m2.receiver_id = u.id)
             OR (m2.sender_id = u.id AND m2.receiver_id = ?)
          ORDER BY m2.created_at DESC
          LIMIT 1
        ) as lastMessageTime,
        (
          SELECT COUNT(*)
          FROM messages as m3
          WHERE m3.sender_id = u.id
            AND m3.receiver_id = ?
            AND m3.is_read = 0
        ) as unreadCount
      FROM messages m
      JOIN users u ON (m.sender_id = u.id OR m.receiver_id = u.id)
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
        AND u.id != ?
      ORDER BY lastMessageTime DESC
    `, [userId, userId, userId, userId, userId, userId, userId, userId]);

    res.json({
      success: true,
      conversations: conversations.map(conv => ({
        id: conv.id,
        username: conv.username,
        photoUrl: conv.photoUrl,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount
      }))
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des conversations'
    });
  }
});

// Récupérer les messages d'une conversation
router.get('/conversation/:userId', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    // Marquer les messages comme lus
    await pool.query(`
      UPDATE messages
      SET is_read = 1
      WHERE sender_id = ?
        AND receiver_id = ?
        AND is_read = 0
    `, [otherUserId, currentUserId]);

    // Récupérer les informations des utilisateurs
    const [users] = await pool.query(`
      SELECT 
        id,
        username,
        photo_url as photoUrl,
        age,
        gender,
        description,
        location
      FROM users
      WHERE id IN (?, ?)
    `, [currentUserId, otherUserId]);

    // Récupérer les messages
    const [messages] = await pool.query(`
      SELECT 
        id,
        sender_id as senderId,
        receiver_id as receiverId,
        content,
        created_at as createdAt,
        is_read as isRead
      FROM messages
      WHERE (sender_id = ? AND receiver_id = ?)
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `, [currentUserId, otherUserId, otherUserId, currentUserId]);

    // Organiser les informations des utilisateurs
    const currentUser = users.find(u => u.id === currentUserId);
    const otherUser = users.find(u => u.id === otherUserId);

    res.json({
      success: true,
      currentUser,
      otherUser,
      messages
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des messages'
    });
  }
});

// Envoyer un message
router.post('/send', async (req, res) => {
  try {
    console.log('\n=== Message Send Endpoint ===');
    console.log('1. Raw request body:', req.body);
    console.log('2. Raw receiverId from body:', req.body.receiverId);
    console.log('3. Raw content from body:', req.body.content);
    
    const { receiverId, content, messageType = 'text' } = req.body;
    console.log('4. Destructured values:');
    console.log('   - receiverId:', receiverId);
    console.log('   - content:', content);
    console.log('   - messageType:', messageType);
    
    const senderId = req.user.id;
    console.log('5. Sender ID from auth:', senderId);
    
    const messageId = uuidv4();
    console.log('6. Generated message ID:', messageId);

    // Vérifier que le destinataire existe
    const [rows, fields] = await pool.query('SELECT id FROM users WHERE id = ?', [receiverId]);
    console.log('7. Database query result:');
    console.log('   - Query:', 'SELECT id FROM users WHERE id = ?');
    console.log('   - Parameters:', [receiverId]);
    console.log('   - Rows:', JSON.stringify(rows));
    console.log('   - Fields:', fields);

    if (!rows || rows.length === 0) {
      console.log('8. Receiver not found in database');
      return res.status(404).json({
        success: false,
        error: 'Destinataire non trouvé'
      });
    }

    console.log('8. Receiver found:', rows[0]);

    // Insérer le message
    await pool.query(
      'INSERT INTO messages (id, sender_id, receiver_id, content, message_type) VALUES (?, ?, ?, ?, ?)',
      [messageId, senderId, receiverId, content, messageType]
    );
    console.log('9. Message inserted into database');

    // Get sender's name for notification
    const [senderResult] = await pool.query(
      'SELECT username FROM users WHERE id = ?',
      [senderId]
    );
    const senderName = senderResult[0].username;

    // Send push notification
    await sendPushNotification(receiverId, {
      title: `New message from ${senderName}`,
      message: content,
      url: `/chat/${senderId}`,
      messageId: messageId
    });

    // Retourner le message créé
    const [message] = await pool.query(
      'SELECT id, sender_id as senderId, receiver_id as receiverId, content, created_at as createdAt, is_read as isRead FROM messages WHERE id = ?',
      [messageId]
    );
    console.log('10. Retrieved created message:', message[0]);

    res.json({
      success: true,
      message: message[0]
    });
  } catch (error) {
    console.error('Error in /send endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi du message'
    });
  }
});

module.exports = router;
