const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

// Appliquer le middleware d'authentification à toutes les routes de chat
router.use(authMiddleware);

// Get messages
router.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // TODO: Add database integration
    
    // Mock response
    res.status(200).json({
      messages: [
        {
          id: '1',
          senderId: '1',
          receiverId: userId,
          content: 'Hello!',
          timestamp: new Date().toISOString()
        }
      ]
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Send message
router.post('/messages', async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    
    // TODO: Add database integration
    
    // Mock response
    res.status(201).json({
      message: {
        id: '2',
        senderId: '1',
        receiverId,
        content,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get conversations
router.get('/conversations', async (req, res) => {
  try {
    // TODO: Add database integration
    
    // Mock response
    res.status(200).json({
      conversations: [
        {
          id: '1',
          otherUser: {
            id: '2',
            username: 'Jane',
            photoUrl: 'https://example.com/jane.jpg'
          },
          lastMessage: {
            content: 'Hello!',
            timestamp: new Date().toISOString()
          },
          unreadCount: 1
        }
      ]
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
