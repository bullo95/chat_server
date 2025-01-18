const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const authMiddleware = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Conversations
 *   description: API endpoints for managing conversations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The user's ID
 *         username:
 *           type: string
 *           description: The user's username
 *         photoUrl:
 *           type: string
 *           description: URL to the user's profile photo
 *           nullable: true
 *     Message:
 *       type: object
 *       properties:
 *         content:
 *           type: string
 *           description: The message content
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the message was sent
 *         senderId:
 *           type: string
 *           description: ID of the message sender
 *         isRead:
 *           type: boolean
 *           description: Whether the message has been read
 *     Conversation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the conversation
 *         otherUser:
 *           $ref: '#/components/schemas/User'
 *         lastMessage:
 *           $ref: '#/components/schemas/Message'
 *           nullable: true
 *         unreadCount:
 *           type: integer
 *           description: Number of unread messages in the conversation
 */

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: Get all conversations for the authenticated user
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       500:
 *         description: Internal server error
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      WITH LastMessages AS (
        SELECT m.*
        FROM (
          SELECT 
            LEAST(sender_id, receiver_id) as user1_id,
            GREATEST(sender_id, receiver_id) as user2_id,
            MAX(created_at) as max_created_at
          FROM messages m
          WHERE sender_id = ? OR receiver_id = ?
          GROUP BY LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)
        ) latest
        JOIN messages m ON (
          LEAST(m.sender_id, m.receiver_id) = latest.user1_id AND
          GREATEST(m.sender_id, m.receiver_id) = latest.user2_id AND
          m.created_at = latest.max_created_at
        )
      ),
      UnreadCounts AS (
        SELECT 
          sender_id,
          COUNT(*) as unread_count
        FROM messages
        WHERE receiver_id = ? AND is_read = false
        GROUP BY sender_id
      )
      SELECT 
        CASE 
          WHEN lm.sender_id = ? THEN lm.receiver_id
          ELSE lm.sender_id
        END as id,
        u.username,
        u.photo_url as photoUrl,
        lm.content as messageContent,
        lm.created_at as createdAt,
        lm.sender_id as senderId,
        lm.is_read as isRead,
        COALESCE(uc.unread_count, 0) as unreadCount
      FROM LastMessages lm
      JOIN users u ON (
        CASE 
          WHEN lm.sender_id = ? THEN u.id = lm.receiver_id
          ELSE u.id = lm.sender_id
        END
      )
      LEFT JOIN UnreadCounts uc ON uc.sender_id = 
        CASE 
          WHEN lm.sender_id = ? THEN lm.receiver_id
          ELSE lm.sender_id
        END
      ORDER BY lm.created_at DESC;
    `;

    const result = await pool.query(query, [userId, userId, userId, userId, userId, userId]);
    
    const conversations = result[0].map(row => ({
      id: row.id,
      otherUser: {
        id: row.id,
        username: row.username,
        photoUrl: row.photoUrl
      },
      lastMessage: row.messageContent ? {
        content: row.messageContent,
        createdAt: row.createdAt,
        senderId: row.senderId,
        isRead: row.isRead
      } : undefined,
      unreadCount: parseInt(row.unreadCount)
    }));

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
