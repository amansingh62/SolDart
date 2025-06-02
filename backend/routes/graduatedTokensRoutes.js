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
    const apiKey = process.env.COIN_MARKET_API_KEY;

    if (!apiKey) {
      console.error('CoinMarketCap API key is not configured');
      return [];
    }

    console.log('Fetching graduated tokens from CoinMarketCap API');

    // First, get the list of all tokens with their market data
    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        params: {
          start: 1,
          limit: 100,
          convert: 'USD',
          sort: 'market_cap',
          sort_dir: 'desc'
        },
      }
    );

    if (!response.data || !response.data.data) {
      console.error('Invalid response format from CoinMarketCap API:', response.data);
      return [];
    }

    // Get token IDs for metadata request
    const tokenIds = response.data.data.map(token => token.id).join(',');

    // Fetch detailed metadata including platform and date_added
    const metadataResponse = await axios.get(
      'https://pro-api.coinmarketcap.com/v2/cryptocurrency/info',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        params: {
          id: tokenIds,
          aux: 'platform,date_added,logo'
        },
      }
    );

    const metadataMap = metadataResponse.data.data || {};

    // Graduation criteria
    const MIN_DAYS_FOR_GRADUATION = 7; // Reduced from 30 to 7 days
    const MIN_MARKET_CAP = 1000000; // Reduced from $10M to $1M
    const MIN_VOLUME_24H = 100000; // Minimum 24h volume of $100k

    // Transform the data to match our frontend needs
    const tokens = response.data.data.map(token => {
      const metadata = metadataMap[token.id] || {};
      const dateAdded = new Date(metadata.date_added);
      const now = new Date();
      const daysSinceAdded = Math.floor((now - dateAdded) / (1000 * 60 * 60 * 24));

      // More lenient graduation criteria
      const isGraduated = (
        daysSinceAdded > MIN_DAYS_FOR_GRADUATION &&
        token.quote.USD.market_cap > MIN_MARKET_CAP &&
        token.quote.USD.volume_24h > MIN_VOLUME_24H
      );

      return {
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        slug: token.slug,
        price: token.quote.USD.price,
        percent_change_24h: token.quote.USD.percent_change_24h || 0,
        market_cap: token.quote.USD.market_cap || 0,
        volume_24h: token.quote.USD.volume_24h || 0,
        rank: token.cmc_rank || 0,
        is_graduated: isGraduated,
        logo: metadata.logo || null,
        platform: metadata.platform || null,
        days_since_added: daysSinceAdded,
        graduation_criteria: {
          min_days: MIN_DAYS_FOR_GRADUATION,
          min_market_cap: MIN_MARKET_CAP,
          min_volume_24h: MIN_VOLUME_24H
        }
      };
    });

    const graduatedTokens = tokens.filter(token => token.is_graduated);
    console.log(`Found ${graduatedTokens.length} graduated tokens out of ${tokens.length} total tokens`);

    return graduatedTokens;

  } catch (error) {
    console.error('Error in fetchGraduatedTokens:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return [];
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

  // Start periodic updates (every 60 seconds)
  const updateInterval = 60 * 1000; // 60 seconds

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