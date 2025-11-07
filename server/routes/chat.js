import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { uploadImage, uploadFile } from '../config/cloudinary.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Upload image
router.post('/upload-image', uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    res.json({
      success: true,
      fileUrl: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
});

// Upload file
router.post('/upload-file', uploadFile.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    res.json({
      success: true,
      fileUrl: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file'
    });
  }
});

// Get conversation with a friend
// Get conversation with a friend
router.get('/conversation/:friendId', async (req, res) => {
  try {
    const { friendId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid friend ID' 
      });
    }

    // Check if they are friends
    const isFriend = req.user.friends.some(
      friend => friend.toString() === friendId
    );

    if (!isFriend) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only chat with friends' 
      });
    }

    // Get messages between these two users - EXCLUDE DELETED MESSAGES
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: friendId },
        { sender: friendId, receiver: req.user._id }
      ],
      isDeleted: false  // Only get non-deleted messages
    })
    .sort({ timestamp: 1 })
    .limit(100)
    .populate('sender', 'username avatar')
    .populate('receiver', 'username avatar');

    // Mark messages as read
    await Message.updateMany(
      { sender: friendId, receiver: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      messages: messages.map(msg => ({
        id: msg._id,
        sender: {
          id: msg.sender._id,
          username: msg.sender.username,
          avatar: msg.sender.avatar
        },
        receiver: {
          id: msg.receiver._id,
          username: msg.receiver.username,
          avatar: msg.receiver.avatar
        },
        message: msg.message,
        messageType: msg.messageType,
        fileUrl: msg.fileUrl,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        fileType: msg.fileType,
        isRead: msg.isRead,
        timestamp: msg.timestamp
      }))
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching messages' 
    });
  }
});


// Get all conversations
router.get('/conversations', async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id },
        { receiver: req.user._id }
      ]
    })
    .sort({ timestamp: -1 })
    .populate('sender', 'username avatar')
    .populate('receiver', 'username avatar');

    const conversationsMap = new Map();

    messages.forEach(msg => {
      const partnerId = msg.sender._id.toString() === req.user._id.toString() 
        ? msg.receiver._id.toString() 
        : msg.sender._id.toString();

      if (!conversationsMap.has(partnerId)) {
        const partner = msg.sender._id.toString() === req.user._id.toString() 
          ? msg.receiver 
          : msg.sender;

        let lastMessage = msg.message;
        if (msg.messageType === 'image') {
          lastMessage = '📷 Image';
        } else if (msg.messageType === 'file') {
          lastMessage = `📎 ${msg.fileName}`;
        }

        conversationsMap.set(partnerId, {
          friend: {
            id: partner._id,
            username: partner.username,
            avatar: partner.avatar
          },
          lastMessage,
          timestamp: msg.timestamp,
          unreadCount: 0
        });
      }
    });

    for (const [partnerId, conversation] of conversationsMap.entries()) {
      const unreadCount = await Message.countDocuments({
        sender: partnerId,
        receiver: req.user._id,
        isRead: false
      });
      conversation.unreadCount = unreadCount;
    }

    const conversations = Array.from(conversationsMap.values());

    res.json({
      success: true,
      conversations
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching conversations' 
    });
  }
});


// Delete message
router.post('/delete-message/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid message ID' 
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ 
        success: false,
        message: 'Message not found' 
      });
    }

    // Check if user is sender or receiver
    const isSender = message.sender.toString() === req.user._id.toString();
    const isReceiver = message.receiver.toString() === req.user._id.toString();

    if (!isSender && !isReceiver) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only delete your own messages' 
      });
    }

    // Mark as deleted
    message.isDeleted = true;
    message.deletedBy = isSender ? 'sender' : 'receiver';
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted successfully',
      messageId: message._id
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete message' 
    });
  }
});
// Delete message - PERMANENTLY DELETE FROM DATABASE
router.post('/delete-message/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid message ID' 
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ 
        success: false,
        message: 'Message not found' 
      });
    }

    // Check if user is sender or receiver
    const isSender = message.sender.toString() === req.user._id.toString();
    const isReceiver = message.receiver.toString() === req.user._id.toString();

    if (!isSender && !isReceiver) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only delete your own messages' 
      });
    }

    // Permanently delete the message from database
    await Message.findByIdAndDelete(messageId);

    console.log(`🗑️ Message permanently deleted: ${messageId}`);

    res.json({
      success: true,
      message: 'Message deleted permanently',
      messageId: messageId
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete message' 
    });
  }
});


export default router;
