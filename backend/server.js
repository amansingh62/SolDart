require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { router: cryptoRoutes, setupCryptoWebSocket } = require('./routes/cryptoRoutes');
const { router: solanaRoutes, setupSolanaWebSocket } = require('./routes/solanaRoutes');
const { router: graduatedTokensRoutes, setupGraduatedTokensWebSocket } = require('./routes/graduatedTokensRoutes');
const { router: fearGreedRoutes, setupFearGreedWebSocket } = require('./routes/fearGreedRoutes');
const { router: questsRoutes, setupQuestsWebSocket } = require('./routes/questsRoutes');
const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const postRoutes = require("./routes/postRoutes");
const path = require('path');
const connectDB = require("./config/db"); // Adjust path if needed
const User = require('./models/User'); // For tracking online users

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store io instance for use in routes
app.set('io', io);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect Database
connectDB();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(
  session({ secret: "secret", resave: false, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());
require("./config/passport");

// Routes
app.use("/auth", authRoutes);
const checkInRoutes = require('./routes/checkInRoutes');
app.use('/api/check-in', checkInRoutes);
app.use("/wallet", walletRoutes);
app.use("/posts", postRoutes);
app.use("/api/crypto", cryptoRoutes);
app.use("/api/solana", solanaRoutes);
app.use("/api/graduated-tokens", graduatedTokensRoutes);
app.use("/api/fear-greed", fearGreedRoutes);
app.use("/api/quests", questsRoutes);
const userRoutes = require("./routes/userRoutes");
app.use("/users", userRoutes);
const notificationRoutes = require("./routes/notificationRoutes");
app.use("/notifications", notificationRoutes);
const messageRoutes = require("./routes/messageRoutes");
app.use("/messages", messageRoutes);
const liveChatRoutes = require("./routes/liveChatRoutes");
app.use("/live-chat", liveChatRoutes);
const advertisementRoutes = require("./routes/advertisementRoutes");
app.use("/advertisements", advertisementRoutes);

// Google Auth Route
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// In server.js - Update the Google Auth callback
// In your Google callback route in server.js
// server.js - Update the Google Auth callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      const user = req.user;
      
      // Get default wallet if exists
      const defaultWallet = user.wallets && user.wallets.length > 0 
        ? user.wallets.find(w => w.isDefault) || user.wallets[0]
        : null;
      
      // Generate JWT Token
      const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      // Set HTTP-Only Cookie
      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "Lax",
        secure: process.env.NODE_ENV === "production"
      });

      // Redirect with wallet info if available
      const redirectUrl = defaultWallet 
        ? `${process.env.FRONTEND_URL || "http://localhost:3000"}/?walletConnected=true&walletType=${defaultWallet.type}&walletAddress=${defaultWallet.address}` 
        : `${process.env.FRONTEND_URL || "http://localhost:3000"}/`;
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google Auth Error:", error);
      res.redirect(process.env.FRONTEND_URL || "http://localhost:3000/");
    }
  }
);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  let currentUserId = null;
  
  // Handle user authentication for personalized notifications
  socket.on('authenticate', async (userId) => {
    console.log(`User ${userId} authenticated with socket`); 
    currentUserId = userId;
    socket.join(`user-${userId}`); // Join a room specific to this user
    socket.join('global-chat'); // Join global chat room
    
    // Update user's online status
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true, lastActive: new Date() });
      // Broadcast to all clients that this user is online
      io.emit('userStatusChange', { userId, isOnline: true });
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  });
  
  // Listen for new notification events
  socket.on('newNotification', (notification) => {
    // Emit to specific user's room
    if (notification.recipient) {
      io.to(`user-${notification.recipient}`).emit('notification', notification);
    }
  });
  
  // Listen for new message events
  socket.on('newMessage', (message) => {
    // Emit to specific user's room
    if (message.recipient) {
      io.to(`user-${message.recipient}`).emit('message', message);
    }
  });
  
  // Listen for typing indicator events
  socket.on('typing', (data) => {
    if (data.recipientId) {
      io.to(`user-${data.recipientId}`).emit('userTyping', {
        senderId: data.senderId,
        isTyping: data.isTyping
      });
    }
  });
  
  // Live chat typing indicator
  socket.on('liveChatTyping', (data) => {
    // Broadcast to everyone except sender
    socket.broadcast.to('global-chat').emit('liveChatUserTyping', {
      senderId: data.senderId,
      username: data.username,
      isTyping: data.isTyping
    });
  });
  
  socket.on('disconnect', async () => {
    console.log('Client disconnected');
    
    // Update user's online status if they were authenticated
    if (currentUserId) {
      try {
        await User.findByIdAndUpdate(currentUserId, { 
          isOnline: false, 
          lastActive: new Date() 
        });
        // Broadcast to all clients that this user is offline
        io.emit('userStatusChange', { userId: currentUserId, isOnline: false });
      } catch (error) {
        console.error('Error updating user offline status:', error);
      }
    }
  });
});

// Setup WebSocket handlers for cryptocurrency updates
setupCryptoWebSocket(io);

// Setup WebSocket handlers for Solana token updates
setupSolanaWebSocket(io);

// Setup WebSocket handlers for graduated tokens updates
setupGraduatedTokensWebSocket(io);

// Setup WebSocket handlers for Fear & Greed Index updates
setupFearGreedWebSocket(io);

// Setup WebSocket handlers for quest updates
setupQuestsWebSocket(io);

// Migration for savedPosts structure (run once on server start)
const migrateSavedPosts = async () => {
  try {
    console.log('Starting savedPosts migration...');
    const User = require('./models/User');
    
    // Find all users with the old savedPosts structure (array of ObjectIds)
    const users = await User.find({ 'savedPosts.0': { $exists: true, $type: 'objectId' } });
    
    console.log(`Found ${users.length} users with old savedPosts structure`);
    
    for (const user of users) {
      // Convert old format to new format with timestamps
      const oldSavedPosts = [...user.savedPosts]; // Create a copy of the old array
      
      // Clear the array and add new format objects
      user.savedPosts = [];
      
      // Add each post with current timestamp (newest posts will have same timestamp)
      // In a production environment, you might want to add some time variation
      oldSavedPosts.forEach(postId => {
        user.savedPosts.push({
          post: postId,
          savedAt: new Date()
        });
      });
      
      await user.save();
    }
    
    console.log('SavedPosts migration completed successfully');
  } catch (error) {
    console.error('Error during savedPosts migration:', error);
  }
};

// Run migration after database connection is established
migrateSavedPosts();

