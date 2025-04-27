const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/graduated-tokens - Get graduated tokens from CoinMarketCap
router.get('/', async (req, res) => {
  try {
    const graduatedTokens = await fetchGraduatedTokens();
    if (graduatedTokens.length === 0) {
      return res.status(404).json({ 
        statusCode: 404, 
        error: 'Not Found', 
        message: 'No graduated tokens found' 
      });
    }
    res.json(graduatedTokens);
  } catch (error) {
    console.error('Error fetching graduated tokens:', error);
    // Provide more detailed error information
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.status?.error_message || 
                         error.response?.data?.message || 
                         error.message || 
                         'Failed to fetch graduated tokens';
    
    res.status(statusCode).json({ 
      statusCode, 
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error', 
      message: errorMessage 
    });
  }
});

// Function to fetch graduated tokens from CoinMarketCap API
async function fetchGraduatedTokens() {
  try {
    // Get API key from environment variables
    const apiKey = process.env.COIN_MARKET_API_KEY;
    
    if (!apiKey) {
      console.error('CoinMarketCap API key is not configured');
      return [];
    }

    // Make request to CoinMarketCap API to get graduated tokens from pump.fun
    // Using the dexer/pairs endpoint to get tokens from pump.fun
    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/dexer/pairs',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        params: {
          dexId: 'pump.fun', // Specific dexscan ID for pump.fun graduated tokens
          aux: 'is_graduated', // Request graduated status
          limit: 20, // Get top 20 tokens
          convert: 'USD', // Convert prices to USD
        },
      }
    );
    
    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      console.error('Invalid response format from CoinMarketCap API:', response.data);
      return [];
    }
    
    // Filter for graduated tokens only
    const graduatedTokens = response.data.data.filter(token => token.is_graduated === true);
    
    // Get token IDs for metadata request
    const tokenIds = graduatedTokens.map(token => token.token_id).join(',');
    
    // Fetch metadata for these tokens (including logos)
    const metadataResponse = await axios.get(
      'https://pro-api.coinmarketcap.com/v2/cryptocurrency/info',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        params: {
          id: tokenIds
        },
      }
    );
    
    const metadataMap = metadataResponse.data.data || {};

    // Transform the data to match our frontend needs
    return graduatedTokens.map(token => ({
      id: token.token_id,
      name: token.token_name,
      symbol: token.token_symbol,
      slug: token.token_slug,
      price: token.quote.USD.price,
      percent_change_24h: token.quote.USD.percent_change_24h || 0,
      market_cap: token.quote.USD.market_cap || 0,
      volume_24h: token.quote.USD.volume_24h || 0,
      rank: token.rank || 0,
      image: metadataMap[token.token_id]?.logo || null, // Add token logo URL
      isGraduated: true,
      graduationTime: Math.floor(Math.random() * 24) + 1 // Random hours between 1-24 for demo
    }));
  } catch (error) {
    console.error('Error fetching graduated tokens:', error.response?.data || error.message);
    throw error; // Propagate the error to be handled by the route handler
  }
}

// Setup WebSocket handlers for graduated token updates
function setupGraduatedTokensWebSocket(io) {
  // Store connected clients interested in graduated token updates
  const graduatedTokensClients = new Set();
  
  // Handle client connections
  io.on('connection', (socket) => {
    // Listen for graduated tokens subscription requests
    socket.on('subscribeToGraduatedTokensUpdates', () => {
      console.log(`Client ${socket.id} subscribed to graduated tokens updates`);
      graduatedTokensClients.add(socket.id);
      
      // Add to graduated-tokens room for easier broadcasting
      socket.join('graduated-tokens-updates');
    });
    
    // Handle disconnections
    socket.on('disconnect', () => {
      if (graduatedTokensClients.has(socket.id)) {
        console.log(`Client ${socket.id} unsubscribed from graduated tokens updates`);
        graduatedTokensClients.delete(socket.id);
      }
    });
  });
  
  // Start periodic updates (every 30 seconds)
  const updateInterval = 30 * 1000; // 30 seconds
  
  // Initial fetch and broadcast
  fetchAndBroadcastGraduatedTokensData(io);
  
  // Set up interval for regular updates
  setInterval(() => fetchAndBroadcastGraduatedTokensData(io), updateInterval);
}

// Fetch and broadcast graduated tokens data to all subscribed clients
async function fetchAndBroadcastGraduatedTokensData(io) {
  try {
    const graduatedTokens = await fetchGraduatedTokens();
    
    if (graduatedTokens.length > 0) {
      console.log(`Broadcasting ${graduatedTokens.length} graduated tokens to clients`);
      
      // Broadcast to all clients in the graduated-tokens-updates room
      io.to('graduated-tokens-updates').emit('graduatedTokensUpdate', graduatedTokens);
      
      // Also broadcast to crypto-updates room for compatibility with existing code
      io.to('crypto-updates').emit('cryptoUpdate', graduatedTokens);
    } else {
      console.log('No graduated tokens to broadcast');
    }
  } catch (error) {
    console.error('Error in graduated tokens update cycle:', error.response?.data || error.message);
    
    // Even on error, send a notification to clients so they know there was an issue
    io.to('graduated-tokens-updates').emit('graduatedTokensError', { 
      message: 'Error fetching graduated tokens data',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = { router, setupGraduatedTokensWebSocket };