const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/crypto/trending - Get trending cryptocurrencies
router.get('/trending', async (req, res) => {
  try {
    const trendingCoins = await fetchTrendingCoins();
    if (trendingCoins.length === 0) {
      return res.status(404).json({ error: 'No trending coins found' });
    }
    res.json(trendingCoins);
  } catch (error) {
    console.error('Error fetching trending coins:', error);
    res.status(500).json({ error: 'Failed to fetch trending coins' });
  }
});

// Function to fetch trending coins from CoinMarketCap API
async function fetchTrendingCoins() {
  try {
    // Get API key from environment variables
    const apiKey = process.env.COIN_MARKET_API_KEY;

    if (!apiKey) {
      console.error('CoinMarketCap API key is not configured');
      return [];
    }

    // Make request to CoinMarketCap API
    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        params: {
          limit: 10, // Get top 10 cryptocurrencies
          sort: 'market_cap', // Sort by market cap
          sort_dir: 'desc', // Sort in descending order
          convert: 'USD', // Convert prices to USD
        },
      }
    );

    // Transform the data to match our frontend needs
    return response.data.data.map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      slug: coin.slug,
      price: coin.quote.USD.price,
      percent_change_24h: coin.quote.USD.percent_change_24h,
      market_cap: coin.quote.USD.market_cap,
      volume_24h: coin.quote.USD.volume_24h,
      rank: coin.cmc_rank,
    }));
  } catch (error) {
    console.error('Error fetching trending coins:', error.response?.data || error.message);
    return [];
  }
}

// Setup WebSocket handlers for crypto updates
function setupCryptoWebSocket(io) {
  // Store connected clients interested in crypto updates
  const cryptoClients = new Set();

  // Handle client connections
  io.on('connection', (socket) => {
    // Listen for crypto subscription requests
    socket.on('subscribeToCryptoUpdates', () => {
      console.log(`Client ${socket.id} subscribed to crypto updates`);
      cryptoClients.add(socket.id);

      // Add to crypto-updates room for easier broadcasting
      socket.join('crypto-updates');
    });

    // Handle disconnections
    socket.on('disconnect', () => {
      if (cryptoClients.has(socket.id)) {
        console.log(`Client ${socket.id} unsubscribed from crypto updates`);
        cryptoClients.delete(socket.id);
      }
    });
  });

  // Start periodic updates (every 2 minutes)
  const updateInterval = 120 * 1000; // 120 seconds

  // Initial fetch and broadcast
  fetchAndBroadcastCryptoData(io);

  // Set up interval for regular updates
  setInterval(() => fetchAndBroadcastCryptoData(io), updateInterval);
}

// Fetch and broadcast crypto data to all subscribed clients
async function fetchAndBroadcastCryptoData(io) {
  try {
    const trendingCoins = await fetchTrendingCoins();

    if (trendingCoins.length > 0) {
      // Broadcast to all clients in the crypto-updates room
      io.to('crypto-updates').emit('cryptoUpdate', trendingCoins);
    }
  } catch (error) {
    console.error('Error in crypto update cycle:', error);
  }
}

module.exports = { router, setupCryptoWebSocket };