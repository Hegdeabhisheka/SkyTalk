import express from 'express';
import mongoose from 'mongoose';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { sendFriendRequestEmail } from '../config/email.js';

const router = express.Router();

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

// All routes require authentication
router.use(verifyToken);

// ============================================
// CONSOLE LOGGING HELPERS
// ============================================

const logSection = (title) => {
  console.log('\n' + '═'.repeat(60));
  console.log(`👥 ${title}`);
  console.log('═'.repeat(60));
};

const logSuccess = (message) => {
  console.log(`✅ ${message}`);
};

const logWarning = (message) => {
  console.log(`⚠️  ${message}`);
};

const logError = (message) => {
  console.log(`❌ ${message}`);
};

// ============================================
// TEST ROUTE
// ============================================

router.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: '👥 Friends routes working!',
    user: req.user.username 
  });
});

// ============================================
// 1. SEARCH USERS (INSTAGRAM-STYLE)
// ============================================

router.get('/search', async (req, res) => {
  try {
    logSection('SEARCH USERS');
    
    const { query } = req.query;

    console.log('🔍 Search Query:', query);

    if (!query || query.trim().length < 1) {
      logWarning('Query too short');
      return res.status(400).json({ 
        success: false,
        message: 'Please enter at least 1 character to search' 
      });
    }

    // Search by exact username match first, then partial matches
    console.log('🔎 Searching in database...');
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },           // Not current user
        { _id: { $nin: req.user.friends } },      // Not already friends
        {
          $or: [
            { username: { $regex: `^${query}`, $options: 'i' } }, // Starts with query
            { username: { $regex: query, $options: 'i' } },       // Contains query
            { email: { $regex: query, $options: 'i' } }           // Email contains query
          ]
        }
      ]
    })
    .select('username email avatar createdAt')
    .limit(20)
    .sort({ username: 1 });

    logSuccess(`Found ${users.length} users`);

    // Check if friend request already exists with these users
    console.log('📝 Checking existing friend requests...');
    const userIds = users.map(u => u._id);
    const existingRequests = await FriendRequest.find({
      $or: [
        { sender: req.user._id, receiver: { $in: userIds }, status: 'pending' },
        { sender: { $in: userIds }, receiver: req.user._id, status: 'pending' }
      ]
    });

    console.log(`   Found ${existingRequests.length} existing requests`);

    // Mark users with pending requests
    const usersWithStatus = users.map(user => {
      const request = existingRequests.find(
        r => r.sender.toString() === user._id.toString() || 
             r.receiver.toString() === user._id.toString()
      );

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        joinedDate: user.createdAt,
        requestStatus: request ? (
          request.sender.toString() === req.user._id.toString() ? 'sent' : 'received'
        ) : null
      };
    });

    console.log('═'.repeat(60) + '\n');

    res.json({
      success: true,
      count: usersWithStatus.length,
      users: usersWithStatus
    });

  } catch (error) {
    logError('Search error');
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during search' 
    });
  }
});

// ============================================
// 2. SEND FRIEND REQUEST
// ============================================

router.post('/request', async (req, res) => {
  try {
    logSection('SEND FRIEND REQUEST');
    
    const { receiverId } = req.body;

    console.log('👤 Sender:', req.user.username);
    console.log('👥 Receiver ID:', receiverId);

    // Validation
    if (!receiverId) {
      logError('Receiver ID missing');
      return res.status(400).json({ 
        success: false,
        message: 'Receiver ID is required' 
      });
    }

    // Check if trying to add yourself
    if (receiverId === req.user._id.toString()) {
      logError('Cannot send request to self');
      return res.status(400).json({ 
        success: false,
        message: 'You cannot send a friend request to yourself' 
      });
    }

    // Check if receiver exists
    console.log('🔍 Checking if user exists...');
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      logError('Receiver not found');
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    logSuccess('Receiver found: ' + receiver.username);

    // Check if already friends
    console.log('🤝 Checking friend status...');
    if (req.user.friends.some(friendId => friendId.toString() === receiverId)) {
      logWarning('Already friends');
      return res.status(400).json({ 
        success: false,
        message: 'You are already friends with this user' 
      });
    }

    // Check for existing request (both directions)
    console.log('📋 Checking for existing requests...');
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { sender: receiverId, receiver: req.user._id }
      ],
      status: 'pending'
    });

    if (existingRequest) {
      if (existingRequest.sender.toString() === receiverId) {
        logWarning('User already sent request to you');
        return res.status(400).json({ 
          success: false,
          message: 'This user has already sent you a friend request. Check your pending requests!' 
        });
      }
      logWarning('Request already sent');
      return res.status(400).json({ 
        success: false,
        message: 'Friend request already sent' 
      });
    }

    // Create friend request
    console.log('📤 Creating friend request...');
    const friendRequest = new FriendRequest({
      sender: req.user._id,
      receiver: receiverId
    });

    await friendRequest.save();
    logSuccess('Friend request created');

    // Send email notification (non-blocking)
    console.log('📧 Sending email notification...');
    sendFriendRequestEmail(receiver.email, req.user.username)
      .catch(err => {
        logWarning('Email notification failed: ' + err.message);
      });

    console.log('═'.repeat(60) + '\n');

    res.status(201).json({ 
      success: true,
      message: `Friend request sent to ${receiver.username}! 🚀`,
      request: {
        id: friendRequest._id,
        receiver: {
          id: receiver._id,
          username: receiver.username,
          avatar: receiver.avatar
        },
        status: friendRequest.status,
        createdAt: friendRequest.createdAt
      }
    });

  } catch (error) {
    logError('Send request error');
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while sending friend request' 
    });
  }
});

// ============================================
// 3. GET PENDING FRIEND REQUESTS (RECEIVED)
// ============================================

router.get('/requests/pending', async (req, res) => {
  try {
    logSection('GET PENDING REQUESTS');
    
    console.log('👤 User:', req.user.username);
    console.log('🔍 Fetching pending requests...');

    const requests = await FriendRequest.find({
      receiver: req.user._id,
      status: 'pending'
    })
    .populate('sender', 'username email avatar createdAt')
    .sort({ createdAt: -1 });

    logSuccess(`Found ${requests.length} pending requests`);
    console.log('═'.repeat(60) + '\n');

    res.json({
      success: true,
      count: requests.length,
      requests: requests.map(req => ({
        id: req._id,
        sender: {
          id: req.sender._id,
          username: req.sender.username,
          email: req.sender.email,
          avatar: req.sender.avatar
        },
        status: req.status,
        createdAt: req.createdAt
      }))
    });

  } catch (error) {
    logError('Get pending requests error');
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching requests' 
    });
  }
});

// ============================================
// 4. GET SENT FRIEND REQUESTS
// ============================================

router.get('/requests/sent', async (req, res) => {
  try {
    logSection('GET SENT REQUESTS');
    
    console.log('👤 User:', req.user.username);
    console.log('🔍 Fetching sent requests...');

    const requests = await FriendRequest.find({
      sender: req.user._id,
      status: 'pending'
    })
    .populate('receiver', 'username email avatar')
    .sort({ createdAt: -1 });

    logSuccess(`Found ${requests.length} sent requests`);
    console.log('═'.repeat(60) + '\n');

    res.json({
      success: true,
      count: requests.length,
      requests: requests.map(req => ({
        id: req._id,
        receiver: {
          id: req.receiver._id,
          username: req.receiver.username,
          email: req.receiver.email,
          avatar: req.receiver.avatar
        },
        status: req.status,
        createdAt: req.createdAt
      }))
    });

  } catch (error) {
    logError('Get sent requests error');
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching sent requests' 
    });
  }
});

// ============================================
// 5. ACCEPT FRIEND REQUEST
// ============================================

router.post('/request/accept/:requestId', async (req, res) => {
  try {
    logSection('ACCEPT FRIEND REQUEST');
    
    const { requestId } = req.params;

    console.log('📝 Request ID:', requestId);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      logError('Invalid request ID');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid request ID' 
      });
    }

    // Find request
    console.log('🔍 Finding friend request...');
    const request = await FriendRequest.findById(requestId)
      .populate('sender', 'username email avatar');

    if (!request) {
      logError('Request not found');
      return res.status(404).json({ 
        success: false,
        message: 'Friend request not found' 
      });
    }

    logSuccess('Request found from ' + request.sender.username);

    // Check if current user is the receiver
    if (request.receiver.toString() !== req.user._id.toString()) {
      logError('Unauthorized accept attempt');
      return res.status(403).json({ 
        success: false,
        message: 'You can only accept requests sent to you' 
      });
    }

    // Check if already accepted
    if (request.status === 'accepted') {
      logWarning('Request already accepted');
      return res.status(400).json({ 
        success: false,
        message: 'Friend request already accepted' 
      });
    }

    // Update request status
    console.log('⬆️  Updating request status to accepted...');
    request.status = 'accepted';
    await request.save();
    logSuccess('Request status updated');

    // Add to both users' friend lists
    console.log('👫 Adding users to friend lists...');
    await User.findByIdAndUpdate(request.sender._id, {
      $addToSet: { friends: request.receiver }
    });

    await User.findByIdAndUpdate(request.receiver, {
      $addToSet: { friends: request.sender._id }
    });

    logSuccess('Users added as friends');
    console.log('═'.repeat(60) + '\n');

    res.json({ 
      success: true,
      message: `You are now friends with ${request.sender.username}! 🎉`,
      friend: {
        id: request.sender._id,
        username: request.sender.username,
        email: request.sender.email,
        avatar: request.sender.avatar
      }
    });

  } catch (error) {
    logError('Accept request error');
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while accepting request' 
    });
  }
});

// ============================================
// 6. REJECT FRIEND REQUEST
// ============================================

router.post('/request/reject/:requestId', async (req, res) => {
  try {
    logSection('REJECT FRIEND REQUEST');
    
    const { requestId } = req.params;

    console.log('📝 Request ID:', requestId);

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      logError('Invalid request ID');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid request ID' 
      });
    }

    console.log('🔍 Finding friend request...');
    const request = await FriendRequest.findById(requestId)
      .populate('sender', 'username');

    if (!request) {
      logError('Request not found');
      return res.status(404).json({ 
        success: false,
        message: 'Friend request not found' 
      });
    }

    if (request.receiver.toString() !== req.user._id.toString()) {
      logError('Unauthorized reject attempt');
      return res.status(403).json({ 
        success: false,
        message: 'You can only reject requests sent to you' 
      });
    }

    console.log('❌ Updating request status to rejected...');
    request.status = 'rejected';
    await request.save();

    logSuccess('Request rejected from ' + request.sender.username);
    console.log('═'.repeat(60) + '\n');

    res.json({ 
      success: true,
      message: 'Friend request rejected' 
    });

  } catch (error) {
    logError('Reject request error');
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while rejecting request' 
    });
  }
});

// ============================================
// 7. CANCEL SENT FRIEND REQUEST
// ============================================

router.delete('/request/cancel/:requestId', async (req, res) => {
  try {
    logSection('CANCEL FRIEND REQUEST');
    
    const { requestId } = req.params;

    console.log('📝 Request ID:', requestId);

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      logError('Invalid request ID');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid request ID' 
      });
    }

    console.log('🔍 Finding friend request...');
    const request = await FriendRequest.findById(requestId)
      .populate('receiver', 'username');

    if (!request) {
      logError('Request not found');
      return res.status(404).json({ 
        success: false,
        message: 'Friend request not found' 
      });
    }

    if (request.sender.toString() !== req.user._id.toString()) {
      logError('Unauthorized cancel attempt');
      return res.status(403).json({ 
        success: false,
        message: 'You can only cancel your own requests' 
      });
    }

    console.log('🗑️  Deleting friend request...');
    await FriendRequest.findByIdAndDelete(requestId);

    logSuccess('Request cancelled to ' + request.receiver.username);
    console.log('═'.repeat(60) + '\n');

    res.json({ 
      success: true,
      message: 'Friend request cancelled' 
    });

  } catch (error) {
    logError('Cancel request error');
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while cancelling request' 
    });
  }
});

// ============================================
// 8. GET FRIENDS LIST
// ============================================

router.get('/list', async (req, res) => {
  try {
    logSection('GET FRIENDS LIST');
    
    console.log('👤 User:', req.user.username);
    console.log('🔍 Fetching friends...');

    const user = await User.findById(req.user._id)
      .populate('friends', 'username email avatar createdAt')
      .select('friends');

    logSuccess(`Found ${user.friends.length} friends`);
    console.log('═'.repeat(60) + '\n');

    res.json({
      success: true,
      count: user.friends.length,
      friends: user.friends.map(friend => ({
        id: friend._id,
        username: friend.username,
        email: friend.email,
        avatar: friend.avatar,
        friendSince: friend.createdAt
      }))
    });

  } catch (error) {
    logError('Get friends list error');
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching friends' 
    });
  }
});

// ============================================
// 9. REMOVE FRIEND (UNFRIEND)
// ============================================

router.delete('/:friendId', async (req, res) => {
  try {
    logSection('REMOVE FRIEND');
    
    const { friendId } = req.params;

    console.log('👤 Current User:', req.user.username);
    console.log('👥 Friend ID:', friendId);

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      logError('Invalid friend ID');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid friend ID' 
      });
    }

    // Check if they are friends
    console.log('🔍 Checking friend status...');
    if (!req.user.friends.some(id => id.toString() === friendId)) {
      logWarning('Not in friend list');
      return res.status(400).json({ 
        success: false,
        message: 'This user is not in your friends list' 
      });
    }

    // Get friend info
    const friend = await User.findById(friendId).select('username');
    logSuccess('Friend found: ' + friend.username);

    // Remove from both users' friend lists
    console.log('🗑️  Removing from friend lists...');
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { friends: friendId }
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: req.user._id }
    });

    logSuccess('Friend removed');
    console.log('═'.repeat(60) + '\n');

    res.json({ 
      success: true,
      message: `${friend.username} has been removed from your friends` 
    });

  } catch (error) {
    logError('Remove friend error');
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while removing friend' 
    });
  }
});

// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

router.use((error, req, res, next) => {
  logError('Friends route error');
  console.error(error);
  
  res.status(500).json({
    success: false,
    message: 'An error occurred in friends routes',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;
