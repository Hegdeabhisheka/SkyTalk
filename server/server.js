import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.js';
import friendRoutes from './routes/friends.js';
import chatRoutes from './routes/chat.js';
import User from './models/User.js';
import Message from './models/Message.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ============================================
// CORS CONFIGURATION (Updated for Production)
// ============================================

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4000',
    process.env.FRONTEND_URL || '*'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// ✅ FIXED: Remove app.options('*', ...) and just use:
app.use(cors(corsOptions));




app.use(express.json());

// ============================================
// SOCKET.IO CONFIGURATION
// ============================================

const io = new Server(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// ============================================
// TEST ROUTES
// ============================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '☁️ Sky Talk Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      friends: '/api/friends',
      chat: '/api/chat'
    }
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: '✅ Sky Talk Server is working!',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// API ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);

// ============================================
// MONGODB CONNECTION
// ============================================

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected to Sky Talk Database'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// ============================================
// SOCKET.IO - ONLINE USERS
// ============================================

const onlineUsers = new Map();

// ============================================
// SOCKET.IO - AUTHENTICATION MIDDLEWARE
// ============================================

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    socket.userId = user._id.toString();
    socket.username = user.username;
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error'));
  }
});

// ============================================
// SOCKET.IO - CONNECTION HANDLING
// ============================================

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.username} (${socket.userId})`);
  
  // Add to online users
  onlineUsers.set(socket.userId, socket.id);
  
  // Notify friends that user is online
  socket.broadcast.emit('user-online', { userId: socket.userId });

  // Join personal room
  socket.join(socket.userId);

  // ============================================
  // SEND MESSAGE
  // ============================================

  socket.on('send-message', async (data) => {
    try {
      const { receiverId, message, messageType, fileUrl, fileName, fileSize, fileType } = data;

      console.log(`📤 Message from ${socket.username} to ${receiverId}`);

      // Verify friendship
      const sender = await User.findById(socket.userId);
      const isFriend = sender.friends.some(
        friend => friend.toString() === receiverId
      );

      if (!isFriend) {
        socket.emit('error', { message: 'You can only message friends' });
        return;
      }

      // Save message to database
      const newMessage = new Message({
        sender: socket.userId,
        receiver: receiverId,
        message: message || '',
        messageType: messageType || 'text',
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        fileType: fileType || null
      });

      await newMessage.save();
      await newMessage.populate('sender', 'username avatar');
      await newMessage.populate('receiver', 'username avatar');

      const messageData = {
        id: newMessage._id,
        sender: {
          id: newMessage.sender._id,
          username: newMessage.sender.username,
          avatar: newMessage.sender.avatar
        },
        receiver: {
          id: newMessage.receiver._id,
          username: newMessage.receiver.username,
          avatar: newMessage.receiver.avatar
        },
        message: newMessage.message,
        messageType: newMessage.messageType,
        fileUrl: newMessage.fileUrl,
        fileName: newMessage.fileName,
        fileSize: newMessage.fileSize,
        fileType: newMessage.fileType,
        isRead: false,
        timestamp: newMessage.timestamp
      };

      // Send to receiver if online
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive-message', messageData);
        console.log(`✅ Message delivered to ${receiverId}`);
      } else {
        console.log(`⏸️ Receiver ${receiverId} is offline`);
      }

      // Confirm to sender
      socket.emit('message-sent', messageData);

    } catch (error) {
      console.error('❌ Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // ============================================
  // TYPING INDICATORS
  // ============================================

  socket.on('typing', ({ receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user-typing', {
        userId: socket.userId,
        username: socket.username
      });
    }
  });

  socket.on('stop-typing', ({ receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user-stop-typing', {
        userId: socket.userId
      });
    }
  });

  // ============================================
  // DELETE MESSAGE
  // ============================================

  socket.on('delete-message', async (data) => {
    try {
      const { messageId, receiverId } = data;

      const message = await Message.findById(messageId);
      
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      message.isDeleted = true;
      message.deletedBy = socket.userId === message.sender.toString() ? 'sender' : 'receiver';
      await message.save();

      console.log(`🗑️ Message deleted by ${socket.username}`);

      // Notify both users
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message-deleted', {
          messageId: message._id,
          deletedBy: message.deletedBy
        });
      }

      socket.emit('message-deleted', {
        messageId: message._id,
        deletedBy: message.deletedBy
      });

    } catch (error) {
      console.error('❌ Delete message error:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });

  // ============================================
  // DISCONNECT
  // ============================================

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.username}`);
    onlineUsers.delete(socket.userId);
    
    // Notify friends user is offline
    socket.broadcast.emit('user-offline', { userId: socket.userId });
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// START SERVER (Local Development Only)
// ============================================

const PORT = process.env.PORT || 4000;

// Only start server locally, NOT on Vercel
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
  httpServer.listen(PORT, () => {
    console.log('\n' + '═'.repeat(60));
    console.log(`☁️ Sky Talk Server running on http://localhost:${PORT}`);
    console.log(`🚀 Ready to connect the world!`);
    console.log(`💬 Socket.io ready for real-time chat`);
    console.log('═'.repeat(60) + '\n');
  });
}

// ============================================
// EXPORT FOR VERCEL (Important!)
// ============================================

export default app;
export { io, httpServer };
