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
router.post("/connect-account", auth, async (req, res) => {
  const { walletType, walletAddress } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if user already has a wallet address
    if (user.walletAddress) {
      // If the wallet address matches, return success
      if (user.walletAddress === walletAddress) {
        return res.json({ 
          success: true, 
          message: "Wallet already linked",
          walletAddress: user.walletAddress
        });
      }
      // If it's a different wallet, return error
      return res.status(400).json({ 
        success: false, 
        message: "User already has a registered wallet" 
      });
    }

    // Check if this wallet is already linked to another account
    const existingUser = await User.findOne({ walletAddress });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "This wallet is already linked to another account" 
      });
    }
    
    // Set the wallet address
    user.walletAddress = walletAddress;
    await user.save();
    
    res.json({ 
      success: true, 
      message: "Wallet linked successfully",
      walletAddress: user.walletAddress
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to disconnect wallet
router.post("/disconnect", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Clear the wallet address
    user.walletAddress = null;
    await user.save();
    
    res.json({ 
      success: true, 
      message: "Wallet disconnected successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's wallet information
router.get("/user-wallet", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({
      success: true,
      walletAddress: user.walletAddress || null
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