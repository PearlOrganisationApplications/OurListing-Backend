// ─────────────────────────────────────────────────────────────────────────────
// PRESENCE SERVICE
// Tracks online users and their socket connections
// Currently uses in-memory Map — Redis-ready for scaling
//
// MIGRATION CHECKLIST (when ready for Redis):
// [ ] Install ioredis → npm install ioredis
// [ ] Add to .env:
//       REDIS_URL=redis://localhost:6379
// [ ] Uncomment Redis setup block below
// [ ] Replace each function body with Redis equivalent (shown in comments)
// [ ] Done — nothing else in the codebase changes
// ─────────────────────────────────────────────────────────────────────────────

// MIGRATION → Uncomment when switching to Redis
// import Redis from 'ioredis';
// const redis = new Redis(process.env.REDIS_URL);
// const ONLINE_KEY = 'online:users';      // Redis hash
// const SOCKET_KEY = 'socket:map';        // Redis hash  userId → socketId
// const LAST_SEEN_KEY = (id) => `lastseen:${id}`;

// ─── In-memory store ──────────────────────────────────────────────────────────
// Map structure:
// onlineUsers  → { userId: socketId }
// userSockets  → { socketId: userId }  (reverse lookup)

const onlineUsers = new Map();   // userId  → socketId
const userSockets = new Map();   // socketId → userId

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Mark user as online when socket connects
 * MIGRATION → Replace with:
 * await redis.hset(ONLINE_KEY, userId, socketId)
 * await redis.hset(SOCKET_KEY, socketId, userId)
 *
 * @param {string} userId
 * @param {string} socketId
 */
const setOnline = (userId, socketId) => {
  onlineUsers.set(userId, socketId);
  userSockets.set(socketId, userId);
};

/**
 * Mark user as offline when socket disconnects
 * MIGRATION → Replace with:
 * await redis.hdel(ONLINE_KEY, userId)
 * await redis.hdel(SOCKET_KEY, socketId)
 *
 * @param {string} socketId
 * @returns {string|null} userId that went offline
 */
const setOffline = (socketId) => {
  const userId = userSockets.get(socketId);

  if (userId) {
    onlineUsers.delete(userId);
    userSockets.delete(socketId);
  }

  return userId || null;
};

/**
 * Check if a user is currently online
 * MIGRATION → Replace with:
 * return await redis.hexists(ONLINE_KEY, userId)
 *
 * @param {string} userId
 * @returns {boolean}
 */
const isOnline = (userId) => {
  return onlineUsers.has(userId);
};

/**
 * Get socket ID for a user — used to emit directly to them
 * MIGRATION → Replace with:
 * return await redis.hget(ONLINE_KEY, userId)
 *
 * @param {string} userId
 * @returns {string|null} socketId
 */
const getSocketId = (userId) => {
  return onlineUsers.get(userId) || null;
};

/**
 * Get all currently online user IDs
 * MIGRATION → Replace with:
 * return await redis.hkeys(ONLINE_KEY)
 *
 * @returns {string[]}
 */
const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

/**
 * Get userId from socketId — used on disconnect
 * MIGRATION → Replace with:
 * return await redis.hget(SOCKET_KEY, socketId)
 *
 * @param {string} socketId
 * @returns {string|null}
 */
const getUserBySocket = (socketId) => {
  return userSockets.get(socketId) || null;
};

/**
 * Get count of online users — useful for monitoring
 * MIGRATION → Replace with:
 * return await redis.hlen(ONLINE_KEY)
 *
 * @returns {number}
 */
const getOnlineCount = () => {
  return onlineUsers.size;
};

/**
 * Check multiple users online status at once
 * Used to batch-check who's online in a conversation list
 * MIGRATION → Replace with:
 * const pipeline = redis.pipeline()
 * userIds.forEach(id => pipeline.hexists(ONLINE_KEY, id))
 * const results = await pipeline.exec()
 *
 * @param {string[]} userIds
 * @returns {Object} { userId: boolean }
 */
const batchCheckOnline = (userIds) => {
  return userIds.reduce((acc, userId) => {
    acc[userId] = onlineUsers.has(userId);
    return acc;
  }, {});
};

// ─── Export ───────────────────────────────────────────────────────────────────
// MIGRATION CHECKLIST (only touch this file):
// [ ] Install ioredis
// [ ] Add REDIS_URL to .env
// [ ] Replace each function body with Redis equivalent shown in comments
// [ ] Make all functions async (add await to callers in chat.socket.js)
// [ ] Done

const PresenceService = {
  setOnline,
  setOffline,
  isOnline,
  getSocketId,
  getOnlineUsers,
  getUserBySocket,
  getOnlineCount,
  batchCheckOnline,
};

export default PresenceService;