import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import buyerRoutes from './routes/buyer.routes.js';
import ownerRoutes from './routes/owner.routes.js';
import brokerRoutes from './routes/broker.routes.js';
import lenderRoutes from './routes/lender.routes.js';
import chatRoutes from './routes/chat.routes.js';
import initializeChatSocket from './socket/chat.socket.js';



dotenv.config();

// ─── Path setup ───────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// ─── HTTP server ──────────────────────────────────────────────────────────────
// IMPORTANT: Socket.io needs raw http server, not express app directly
const httpServer = createServer(app);

// ─── Socket.io setup ──────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
  // MIGRATION NOTE: When scaling horizontally (multiple servers),
  // add Redis adapter here:
  // adapter: createAdapter(pubClient, subClient)
  // Install: npm install @socket.io/redis-adapter
  pingTimeout: 60000,   // how long to wait for pong before disconnect
  pingInterval: 25000,  // how often to ping client
});

// ─── Initialize chat socket ───────────────────────────────────────────────────
initializeChatSocket(io);

// ─── Core middleware ──────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static files — serve uploads folder ─────────────────────────────────────
// MIGRATION NOTE: When switching to S3/Cloudinary,
// remove this line — files won't be served locally anymore
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
console.log('Static path:', path.join(__dirname, '../uploads'));
// ─── REST Routes ──────────────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api/user', buyerRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/broker', brokerRoutes);
app.use('/api/lender', lenderRoutes);
app.use('/api/chats', chatRoutes);


// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running successfully',
    socketConnections: io.engine.clientsCount,  // bonus — live socket count
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
// IMPORTANT: httpServer.listen not app.listen
// app.listen creates its own http server internally
// which means Socket.io never gets attached to it
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io ready`);
});