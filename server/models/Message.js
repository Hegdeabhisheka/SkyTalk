import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  fileType: {
    type: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  // Deletion fields
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: {
    type: String, // 'sender' or 'receiver'
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
messageSchema.index({ sender: 1, receiver: 1, timestamp: -1 });

export default mongoose.model('Message', messageSchema);
