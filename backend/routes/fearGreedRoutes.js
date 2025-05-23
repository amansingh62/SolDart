const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/fear-greed - Get current Fear & Greed Index
router.get('/', async (req, res) => {
  try {
    // We'll ignore any query parameters like _t as they're just for cache busting
    console.log('Received request for Fear & Greed Index with query:', req.query);
    const fearGreedData = await fetchFearGreedIndex();
    if (!fearGreedData) {
      console.error('Fear & Greed Index data not found');
      return res.status(404).json({ error: 'Fear & Greed Index data not found' });
    }
    console.log('Returning Fear & Greed data:', fearGreedData.value, fearGreedData.value_classification);
    res.json(fearGreedData);
  } catch (error) {
    console.error('Error fetching Fear & Greed Index:', error);
    res.status(500).json({ error: 'Failed to fetch Fear & Greed Index' });
  }
});

// Function to fetch Fear & Greed Index from CoinMarketCap API
async function fetchFearGreedIndex() {
  try {
    // Get API key from environment variables
    const apiKey = process.env.COIN_MARKET_API_KEY;
    
    if (!apiKey) {
      console.error('CoinMarketCap API key is not configured');
      return null;
    }

    console.log('Fetching Fear & Greed data from CoinMarketCap API...');
    
    // Make request to CoinMarketCap API
    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        // Don't allow axios to add query parameters automatically
        params: {}
      }
    );

    // Calculate Fear & Greed Index based on market metrics
    const data = response.data.data;
    const btcDominance = data.btc_dominance || 0;
    const ethDominance = data.eth_dominance || 0;
    const altDominance = 100 - (btcDominance + ethDominance);
    const totalMarketCap = data.quote.USD.total_market_cap || 0;
    const totalVolume24h = data.quote.USD.total_volume_24h || 0;

    // Calculate value based on market metrics
    // Higher BTC dominance and lower alt dominance typically indicates fear
    // Higher alt dominance and lower BTC dominance typically indicates greed
    // Also factor in market cap and volume
    const volumeToCapRatio = (totalVolume24h / totalMarketCap) * 100;
    
    const value = Math.round(
      50 + // Base neutral value
      (altDominance - 30) * 0.5 + // Alt dominance impact
      (btcDominance - 40) * -0.3 + // BTC dominance impact
      (volumeToCapRatio - 5) * 2 // Volume to market cap ratio impact
    );

    // Clamp value between 0 and 100
    const clampedValue = Math.max(0, Math.min(100, value));

    // Determine classification
    let value_classification = 'Neutral';
    if (clampedValue >= 75) value_classification = 'Extreme Greed';
    else if (clampedValue >= 55) value_classification = 'Greed';
    else if (clampedValue >= 45) value_classification = 'Neutral';
    else if (clampedValue >= 25) value_classification = 'Fear';
    else value_classification = 'Extreme Fear';

    return {
      value: clampedValue,
      value_classification,
      timestamp: new Date().toISOString(),
      time_until_update: '01:00:00', // Next update in 1 hour
      btc_dominance: btcDominance,
      eth_dominance: ethDominance,
      alt_dominance: altDominance,
      volume_to_cap_ratio: volumeToCapRatio
    };
  } catch (error) {
    console.error('Error fetching Fear & Greed Index:', error.response?.data || error.message);
    return null;
  }
}

// Setup WebSocket handlers for Fear & Greed updates
function setupFearGreedWebSocket(io) {
  // Store connected clients interested in fear & greed updates
  const fearGreedClients = new Set();
  
  // Handle client connections
  io.on('connection', (socket) => {
    // Listen for fear & greed subscription requests
    socket.on('subscribeToFearGreedUpdates', async () => {
      console.log(`Client ${socket.id} subscribed to Fear & Greed updates`);
      fearGreedClients.add(socket.id);
      
      // Add to fear-greed room for easier broadcasting
      socket.join('fear-greed-updates');
      
      // Send immediate update to the newly subscribed client
      try {
        const fearGreedData = await fetchFearGreedIndex();
        if (fearGreedData) {
          console.log(`Sending immediate Fear & Greed update to client ${socket.id}:`, fearGreedData.value, fearGreedData.value_classification);
          socket.emit('fearGreedUpdate', fearGreedData);
        }
      } catch (error) {
        console.error(`Error sending immediate Fear & Greed update to client ${socket.id}:`, error);
      }
    });
    
    // Handle disconnections
    socket.on('disconnect', () => {
      if (fearGreedClients.has(socket.id)) {
        console.log(`Client ${socket.id} unsubscribed from Fear & Greed updates`);
        fearGreedClients.delete(socket.id);
      }
    });
  });
  
  // Start periodic updates (every 1 minute for more frequent data)
  const updateInterval = 1 * 60 * 1000; // 1 minute
  
  // Initial fetch and broadcast
  fetchAndBroadcastFearGreedData(io);
  
  // Set up interval for regular updates
  setInterval(() => fetchAndBroadcastFearGreedData(io), updateInterval);
}

// Fetch and broadcast fear & greed data to all subscribed clients
async function fetchAndBroadcastFearGreedData(io) {
  try {
    console.log('Fetching Fear & Greed data for broadcast...');
    const fearGreedData = await fetchFearGreedIndex();
    
    if (fearGreedData) {
      console.log('Broadcasting Fear & Greed data to clients:', fearGreedData.value, fearGreedData.value_classification);
      // Broadcast to all clients in the fear-greed-updates room
      io.to('fear-greed-updates').emit('fearGreedUpdate', fearGreedData);
    } else {
      console.error('Failed to fetch Fear & Greed data for broadcast');
    }
  } catch (error) {
    console.error('Error in fear & greed update cycle:', error);
  }
}

module.exports = { router, setupFearGreedWebSocket };