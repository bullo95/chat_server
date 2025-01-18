/**
 * @socketio
 * @event connection
 * @description Émis lorsqu'un client se connecte au serveur Socket.IO
 * @requires auth.token Format: 'token_userId'
 * @example
 * // Client-side connection
 * const socket = io(`http://${process.env.SERVER_IP}:${process.env.PORT}`, {
 *   auth: {
 *     token: 'token_123'
 *   }
 * });
 */

/**
 * @socketio
 * @event disconnect
 * @description Émis lorsqu'un client se déconnecte du serveur Socket.IO
 */

/**
 * @socketio
 * @event message
 * @description Émis lorsqu'un message est envoyé
 * @param {Object} data
 * @param {string} data.receiverId - ID du destinataire
 * @param {string} data.content - Contenu du message
 * @param {string} [data.messageType=text] - Type de message (text, image, etc.)
 */
