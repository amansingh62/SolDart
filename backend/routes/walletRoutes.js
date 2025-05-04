// routes/walletRoutes.js
const express = require("express");
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');
const { Metadata } = require('@metaplex-foundation/mpl-token-metadata');
const bs58 = require('bs58');
require('dotenv').config();

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

function safeNumber(val) {
  return typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : '-';
}

// Get wallet portfolio data using Birdeye API
router.get("/portfolio/:walletAddress", async (req, res) => {
  const { walletAddress } = req.params;

  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
    return res.status(400).json({
      success: false,
      message: "Invalid wallet address format"
    });
  }

  // API keys
  const birdeyeApiKey = process.env.BIRDEYE_API_KEY;
  const heliusApiKey = process.env.HELIUS_API_KEY;

  // API URLs
  const birdeyeUrl = birdeyeApiKey ? `https://public-api.birdeye.so/v1/wallet/token_list?wallet=${walletAddress}` : null;
  const heliusUrl = heliusApiKey ? `https://api.helius.xyz/v0/addresses/${walletAddress}/balances?api-key=${heliusApiKey}` : null;
  const solscanUrl = `https://pro-api.solscan.io/v2.0/account/portfolio?address=${walletAddress}`;

  // Try Birdeye
  if (birdeyeUrl) {
    try {
      const response = await axios.get(birdeyeUrl, {
        headers: { 'X-API-KEY': birdeyeApiKey, 'x-chain': 'solana', 'accept': 'application/json' },
        timeout: 10000
      });
      if (response.data && Array.isArray(response.data.data?.tokens) && response.data.data.tokens.length > 0) {
        const portfolio = response.data.data.tokens.map(token => ({
          name: token.token_info?.name || 'Unknown Token',
          address: token.mint_address,
          price: safeNumber(token.price),
          value: safeNumber(token.value),
          amount: token.amount,
          decimals: token.token_info?.decimals,
          symbol: token.token_info?.symbol || token.mint_address,
          logo: token.token_info?.icon || null
        }));
        return res.json({ success: true, portfolio });
      }
    } catch (e) {/* continue to next fallback */}
  }

  // Try Helius
  if (heliusUrl) {
    try {
      const response = await axios.get(heliusUrl, { timeout: 10000 });
      if (response.data && Array.isArray(response.data.tokens) && response.data.tokens.length > 0) {
        const portfolio = response.data.tokens.map(token => {
          const price = safeNumber(token.price);
          const value = (typeof token.price === 'number' && typeof token.amount === 'number' && typeof token.decimals === 'number' && token.price > 0)
            ? safeNumber((token.amount / Math.pow(10, token.decimals)) * token.price)
            : '-';
          return {
            name: token.tokenName || 'Unknown Token',
            address: token.mint,
            price,
            value,
            amount: token.amount,
            decimals: token.decimals,
            symbol: token.tokenSymbol || token.mint,
            logo: token.logoURI || null
          };
        });
        return res.json({ success: true, portfolio });
      }
    } catch (e) {/* continue to next fallback */}
  }

  // Try Solscan
  try {
    const response = await axios.get(solscanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Origin': 'https://solscan.io',
        'Referer': 'https://solscan.io/',
        'token': process.env.SOLSCAN_API_KEY      },
      timeout: 10000
    });
    if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
      const portfolio = response.data.data.map(token => ({
        name: token.name || 'Unknown Token',
        address: token.mint,
        price: safeNumber(token.price),
        value: safeNumber(token.value),
        amount: token.amount,
        decimals: token.decimals,
        symbol: token.symbol || token.mint,
        logo: token.logo || null
      }));
      return res.json({ success: true, portfolio });
    }
  } catch (e) {/* all fallbacks failed */}

  // If all fail, return empty
  return res.json({ success: true, portfolio: [] });
});

module.exports = router;