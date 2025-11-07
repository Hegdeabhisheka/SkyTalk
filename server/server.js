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

// Socket.io configuration
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  }
});

// CORS configuration
// Add your production URLs to CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',              // Development
    'https://your-vercel-domain.vercel.app'  // Production
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/api/test', (req, res) => {
  res.json({ 
    message: '☁️ Sky Talk Server is working!',
    version: '1.0.0',
    status: 'online'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected to Sky Talk Database'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Store online users
const onlineUsers = new Map();

// Socket.io authentication middleware
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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.username} (${socket.userId})`);
  
  // Add to online users
  onlineUsers.set(socket.userId, socket.id);
  
  // Notify friends that user is online
  socket.broadcast.emit('user-online', { userId: socket.userId });

  // Join personal room
  socket.join(socket.userId);

  // Send private message
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

  // Typing indicator
  socket.on('typing', ({ receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user-typing', {
        userId: socket.userId,
        username: socket.username
      });
    }
  });

  // Stop typing
  socket.on('stop-typing', ({ receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user-stop-typing', {
        userId: socket.userId
      });
    }
  });
// Add this inside io.on('connection') handler, before the disconnect event:

// Delete message
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

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.username}`);
    onlineUsers.delete(socket.userId);
    
    // Notify friends user is offline
    socket.broadcast.emit('user-offline', { userId: socket.userId });
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`☁️ Sky Talk Server running on http://localhost:${PORT}`);
  console.log(`🚀 Ready to connect the world!`);
  console.log(`💬 Socket.io ready for real-time chat`);
});
