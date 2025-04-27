// routes/walletRoutes.js
const express = require("express");
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');

// Route to connect wallet - only used to verify the connection was successful
router.post("/connect", async (req, res) => {
  const { walletType, walletAddress } = req.body;
  
  try {
    // Verify the wallet address if needed
    // Note: The actual connection happens on the frontend
    
    // Just return success with the provided address
    res.json({ 
      success: true, 
      walletAddress,
      message: `Successfully connected ${walletType} wallet`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to link wallet to user account
router.post("/connect-account", async (req, res) => {
  const { walletType, walletAddress, email } = req.body;
  
  try {
    let user;
    
    // If we have auth token, get user from auth middleware
    if (req.user && req.user.id) {
      user = await User.findById(req.user.id);
    } 
    // If we have email but no auth, find user by email
    else if (email) {
      user = await User.findOne({ email });
    }
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Check if this wallet already exists for this user
    const existingWallet = user.wallets.find(
      wallet => wallet.address === walletAddress && wallet.type === walletType
    );
    
    if (existingWallet) {
      // If wallet exists but is not default, make it default
      if (!existingWallet.isDefault) {
        // First set all wallets to non-default
        user.wallets.forEach(wallet => wallet.isDefault = false);
        existingWallet.isDefault = true;
        await user.save();
      }
      return res.json({ 
        success: true, 
        message: "Wallet already linked and set as default",
        wallet: existingWallet
      });
    }
    
    // If this is the first wallet, make it default
    const isDefault = user.wallets.length === 0;
    
    // Add the new wallet
    user.wallets.push({
      type: walletType,
      address: walletAddress,
      isDefault
    });
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: "Wallet linked successfully",
      wallet: user.wallets[user.wallets.length - 1]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to set a wallet as default
router.post("/set-default", auth, async (req, res) => {
  const { walletAddress } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // First set all wallets to non-default
    user.wallets.forEach(wallet => {
      wallet.isDefault = wallet.address === walletAddress;
    });
    
    await user.save();
    
    res.json({ success: true, message: "Default wallet updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to disconnect a wallet
router.post("/disconnect", auth, async (req, res) => {
  const { walletAddress } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Find the wallet index
    const walletIndex = user.wallets.findIndex(
      wallet => wallet.address === walletAddress
    );
    
    if (walletIndex === -1) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }
    
    // Check if it was default
    const wasDefault = user.wallets[walletIndex].isDefault;
    
    // Remove the wallet
    user.wallets.splice(walletIndex, 1);
    
    // If it was default and we have other wallets, set the first one as default
    if (wasDefault && user.wallets.length > 0) {
      user.wallets[0].isDefault = true;
    }
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: "Wallet disconnected successfully",
      defaultWallet: user.wallets.find(w => w.isDefault) || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all wallets for the authenticated user
router.get("/user-wallets", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({
      success: true,
      wallets: user.wallets,
      defaultWallet: user.wallets.find(w => w.isDefault) || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;