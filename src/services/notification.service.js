// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SERVICE
// Currently a stub — structured and ready for FCM/email integration
//
// MIGRATION CHECKLIST (when ready to add push notifications):
// [ ] Install firebase-admin → npm install firebase-admin
// [ ] Add to .env:
//       FCM_PROJECT_ID=
//       FCM_CLIENT_EMAIL=
//       FCM_PRIVATE_KEY=
// [ ] Uncomment FCM setup block below
// [ ] Implement sendPushNotification() body
// [ ] Done — nothing else in the codebase changes
// ─────────────────────────────────────────────────────────────────────────────

// MIGRATION → Uncomment this block when adding FCM
// import admin from 'firebase-admin';
// admin.initializeApp({
//   credential: admin.credential.cert({
//     projectId: process.env.FCM_PROJECT_ID,
//     clientEmail: process.env.FCM_CLIENT_EMAIL,
//     privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//   }),
// });

// ─── Notification types ───────────────────────────────────────────────────────
export const NOTIFICATION_TYPES = {
  NEW_MESSAGE: 'new_message',
  NEW_REACTION: 'new_reaction',
  MESSAGE_REQUEST: 'message_request',
};

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Send push notification to a single user
 * MIGRATION → Replace body with FCM sendEachForMulticast or send()
 *
 * @param {Object} params
 * @param {string} params.fcmToken     - recipient's FCM token
 * @param {string} params.title        - notification title
 * @param {string} params.body         - notification body text
 * @param {Object} params.data         - extra payload (conversationId etc)
 */
const sendPushNotification = async ({ fcmToken, title, body, data = {} }) => {
  if (!fcmToken) return;

  try {
    // MIGRATION → Replace this block with:
    // await admin.messaging().send({
    //   token: fcmToken,
    //   notification: { title, body },
    //   data,
    //   android: { priority: 'high' },
    //   apns: { payload: { aps: { sound: 'default' } } },
    // });

    // Stub — log only for now
    console.log('[NotificationService] Push notification stub:', {
      fcmToken: fcmToken.slice(0, 10) + '...',
      title,
      body,
      data,
    });
  } catch (error) {
    // Never let notification failure break the chat flow
    console.error('[NotificationService] Push failed:', error.message);
  }
};

/**
 * Send new message notification
 * Called when receiver is offline (not in presence service)
 *
 * @param {Object} params
 * @param {string} params.fcmToken       - receiver's FCM token
 * @param {string} params.senderName     - sender's display name
 * @param {string} params.messageType    - text | image | video | audio | document
 * @param {string} params.message        - text content (truncated)
 * @param {string} params.conversationId - for deep link on tap
 */
const sendMessageNotification = async ({
  fcmToken,
  senderName,
  messageType,
  message,
  conversationId,
}) => {
  // Build preview text based on message type
  const bodyMap = {
    text: message?.slice(0, 100) || '',
    image: '📷 Image',
    video: '🎥 Video',
    audio: '🎵 Audio message',
    document: '📄 Document',
  };

  await sendPushNotification({
    fcmToken,
    title: senderName,
    body: bodyMap[messageType] || 'New message',
    data: {
      type: NOTIFICATION_TYPES.NEW_MESSAGE,
      conversationId,
    },
  });
};

/**
 * Send reaction notification
 * Called when someone reacts to your message
 *
 * @param {Object} params
 * @param {string} params.fcmToken    - receiver's FCM token
 * @param {string} params.senderName  - who reacted
 * @param {string} params.emoji       - the reaction emoji
 */
const sendReactionNotification = async ({ fcmToken, senderName, emoji }) => {
  await sendPushNotification({
    fcmToken,
    title: senderName,
    body: `Reacted ${emoji} to your message`,
    data: {
      type: NOTIFICATION_TYPES.NEW_REACTION,
    },
  });
};

// ─── Export ───────────────────────────────────────────────────────────────────
const NotificationService = {
  sendMessageNotification,
  sendReactionNotification,
  sendPushNotification,
  NOTIFICATION_TYPES,
};

export default NotificationService;