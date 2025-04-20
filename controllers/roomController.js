const Room = require('../models/Room');
const TextHistory = require('../models/TextHistory');
const User = require('../models/User');

// Get room
exports.getRoom = async (req, res) => {
  try {
    const roomName = req.params.roomName || 'default';
    
    // Check if user is authenticated
    const userId = req.session.userId;
    const isAuthenticated = !!userId;
    let user = null;
    
    if (isAuthenticated) {
      user = await User.findById(userId);
    }
    
    // Check if room exists and is claimed
    let room = await Room.findOne({ name: roomName });
    let isClaimed = false;
    let canAccess = true;
    let isOwner = false;
    
    if (room) {
      isClaimed = !!room.claimedBy;
      
      // If room is claimed, check if user is authorized
      if (isClaimed) {
        canAccess = isAuthenticated && room.claimedBy.equals(userId);
        isOwner = canAccess;
      }
    }
    
    // If cannot access, redirect to default room
    if (!canAccess) {
      return res.redirect('/');
    }
    
    // Render room page
    return res.render('room', {
      roomName,
      isClaimed,
      isAuthenticated,
      isVerified: user ? user.isVerified : false,
      isOwner,
      showClaimOption: !isClaimed && isAuthenticated && user && user.isVerified,
      email: user ? user.email : null
    });
  } catch (error) {
    console.error('Room access error:', error);
    return res.redirect('/');
  }
};

// Claim room
exports.claimRoom = async (req, res) => {
  try {
    const { roomName } = req.body;
    
    // Check if user is authenticated and verified
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const user = await User.findById(userId);
    if (!user || !user.isVerified) {
      return res.status(403).json({ success: false, message: 'Email verification required' });
    }
    
    // Check if room exists and is not claimed
    let room = await Room.findOne({ name: roomName });
    
    if (room && room.claimedBy) {
      return res.status(400).json({ success: false, message: 'Room already claimed' });
    }
    
    // Create or update room
    if (room) {
      room.claimedBy = userId;
    } else {
      room = new Room({
        name: roomName,
        claimedBy: userId
      });
    }
    
    await room.save();
    
    return res.status(200).json({ success: true, message: 'Room claimed successfully' });
  } catch (error) {
    console.error('Room claim error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get text history
exports.getTextHistory = async (req, res) => {
  try {
    const roomName = req.params.roomName;
    
    // Check if user is authenticated
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    // Find room
    const room = await Room.findOne({ name: roomName });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    
    // Check if user owns this room
    if (!room.claimedBy || !room.claimedBy.equals(userId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    // Get text history
    const history = await TextHistory.find({ room: room._id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    return res.status(200).json({ success: true, history });
  } catch (error) {
    console.error('Get text history error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};