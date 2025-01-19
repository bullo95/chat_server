const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const pool = require('../../config/database').pool;
const auth = require('../middleware/auth');

// Configure web-push
const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;
const email = process.env.EMAIL || 'example@example.com';

// Vérifier les clés VAPID
console.log('\n🔑 Configuration des notifications push...');
if (!publicVapidKey || !privateVapidKey) {
  console.error('❌ Erreur: Les clés VAPID ne sont pas définies correctement');
  console.log('Clés actuelles :');
  console.log('PUBLIC_VAPID_KEY=', publicVapidKey || '(non définie)');
  console.log('PRIVATE_VAPID_KEY=', privateVapidKey || '(non définie)');
  process.exit(1);
}

try {
  webpush.setVapidDetails(
    'mailto:' + email,
    publicVapidKey,
    privateVapidKey
  );
  console.log('✅ Configuration VAPID réussie');
  console.log('📧 Email de contact:', email);
} catch (error) {
  console.error('❌ Erreur lors de la configuration VAPID:', error.message);
  console.log('Détails de la configuration :');
  console.log('Email:', email);
  console.log('Public Key:', publicVapidKey);
  console.log('Private Key:', privateVapidKey);
  process.exit(1);
}

// Store subscription
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    // Store subscription in database
    await pool.query(
      'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET endpoint = $2, p256dh = $3, auth = $4',
      [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );

    res.status(201).json({ message: 'Subscription added successfully' });
  } catch (error) {
    console.error('Error storing push subscription:', error);
    res.status(500).json({ error: 'Failed to store subscription' });
  }
});

// Helper function to send push notification
async function sendPushNotification(userId, payload) {
  try {
    const result = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) return;

    const subscription = {
      endpoint: result.rows[0].endpoint,
      keys: {
        p256dh: result.rows[0].p256dh,
        auth: result.rows[0].auth
      }
    };

    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

module.exports = { router, sendPushNotification };
