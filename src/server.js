import express from 'express';
import cors from 'cors';
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import buyerRoutes from './routes/buyer.routes.js';
import ownerRoutes from './routes/owner.routes.js';
import brokerRoutes from './routes/broker.routes.js';
import lenderRoutes from './routes/lender.routes.js';
import adminRoutes from './routes/admin.routes.js';


import fs from 'fs';
import path from 'path';

dotenv.config();

// Connect to MongoDB
connectDB();

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Setup routes
app.use('/api', authRoutes);
app.use('/api/user', buyerRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/broker', brokerRoutes);
app.use('/api/lender', lenderRoutes);
app.use('/api/admin', adminRoutes);


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is running successfully' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
