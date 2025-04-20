const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../config/nodemailer');

// Register new user
exports.signup = async (req, res) => {
  try {
    const { email, password, roomName } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = new User({
      email,
      password: hashedPassword
    });
    
    // Generate verification token
    const verificationToken = newUser.generateVerificationToken();
    
    // Save user
    await newUser.save();
    
    // Send verification email
    await sendEmail(
      email,
      'Verify Your Txtly Account',
      emailTemplates.verification(verificationToken)
    );
    
    // If a room name was provided, store it in session for claiming after verification
    if (roomName) {
      req.session.roomToClaim = roomName;
    }
    
    // Set user session
    req.session.userId = newUser._id;
    
    return res.status(201).json({ 
      success: true, 
      message: 'Registration successful! Please check your email to verify your account.',
      verified: false
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find user with matching token
    const user = await User.findOne({ 
      verificationToken: token,
      verificationExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.render('verification', { 
        success: false, 
        message: 'Invalid or expired verification token' 
      });
    }
    
    // Mark as verified and remove token
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();
    
    // Set user session
    req.session.userId = user._id;
    
    // Check if there's a room to claim
    const roomToClaim = req.session.roomToClaim;
    
    // Clear the session variable
    req.session.roomToClaim = undefined;
    
    // Redirect to appropriate page
    if (roomToClaim) {
      return res.redirect(`/${roomToClaim}?claim=true`);
    } else {
      return res.render('verification', { 
        success: true, 
        message: 'Email verification successful! You can now claim rooms.'
      });
    }
  } catch (error) {
    console.error('Email verification error:', error);
    return res.render('verification', { 
      success: false, 
      message: 'Verification failed. Please try again.'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password, roomName } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Set user session
    req.session.userId = user._id;
    
    // If user is not verified, remind them
    if (!user.isVerified) {
      return res.status(200).json({ 
        success: true, 
        message: 'Login successful, but please verify your email to claim rooms',
        verified: false
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Login successful',
      verified: true,
      roomName: roomName
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Logout user
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logout successful' });
  });
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();
    
    // Send password reset email
    await sendEmail(
      email,
      'Reset Your Txtly Password',
      emailTemplates.passwordReset(resetToken)
    );
    
    return res.status(200).json({ 
      success: true, 
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    // Find user with matching token
    const user = await User.findOne({ 
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update password and remove token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};