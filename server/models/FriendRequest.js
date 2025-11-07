import mongoose from 'mongoose';

const friendRequestSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Prevent duplicate friend requests between same users
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

// Index for faster queries
friendRequestSchema.index({ receiver: 1, status: 1 });
friendRequestSchema.index({ sender: 1, status: 1 });

export default mongoose.model('FriendRequest', friendRequestSchema);
