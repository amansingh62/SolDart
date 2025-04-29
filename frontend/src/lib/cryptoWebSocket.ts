// lib/cryptoWebSocket.ts
import { io, Socket } from 'socket.io-client';
import { TrendingCoin, FearGreedData } from './coinMarketCapApi';

let socket: Socket | null = null;
let listeners: ((data: TrendingCoin[]) => void)[] = [];
let fearGreedListeners: ((data: FearGreedData) => void)[] = [];

// Initialize crypto WebSocket connection
export const initCryptoWebSocket = () => {
  if (!socket) {
    // Create new socket connection
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10, // Increased reconnection attempts
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000, // Maximum delay between reconnection attempts
      timeout: 20000
    });

    socket.on('connect', () => {
      console.log('Crypto WebSocket connected successfully');
      // Subscribe to crypto updates
      
      console.log('Subscribed to Fear & Greed updates');
    });

    socket.on('cryptoUpdate', (data: TrendingCoin[]) => {
      // Notify all listeners of the update
      listeners.forEach(listener => listener(data));
    });
    
    socket.on('graduatedTokensUpdate', (data: TrendingCoin[]) => {
      // Mark all tokens as graduated
      const graduatedData = data.map(token => ({
        ...token,
        isGraduated: true,
        // Ensure graduation time is present
        graduationTime: token.graduationTime || Math.floor(Math.random() * 24) + 1
      }));
      // Notify all listeners of the update
      listeners.forEach(listener => listener(graduatedData));
    });

    socket.on('disconnect', () => {
      console.log('Crypto WebSocket disconnected');
      // Try to reconnect after a short delay
      setTimeout(() => {
        if (socket && !socket.connected) {
          console.log('Attempting to reconnect WebSocket...');
          socket.connect();
        }
      }, 2000);
    });

    socket.on('error', (error) => {
      console.error('Crypto WebSocket error:', error);
    });
    
    socket.on('fearGreedUpdate', (data: FearGreedData) => {
      console.log('Received Fear & Greed update via WebSocket:', data);
      // Notify all fear & greed listeners of the update
      fearGreedListeners.forEach(listener => listener(data));
    });
    
    // Handle reconnect event
    socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
      // Resubscribe to all updates
     
    });
  } else if (!socket.connected) {
    // If socket exists but not connected, try to reconnect
    console.log('Socket exists but not connected, attempting to reconnect...');
    socket.connect();
  }

  return socket;
};

// Subscribe to crypto updates and graduated tokens updates
export const subscribeToCryptoUpdates = (callback: (data: TrendingCoin[]) => void) => {
  // Add the callback to listeners
  listeners.push(callback);
  
  // Initialize socket if not already initialized
  if (!socket) {
    const newSocket = initCryptoWebSocket();
    // If socket was successfully initialized and connected, subscribe to updates
    if (newSocket && newSocket.connected) {
      newSocket.emit('subscribeToGraduatedTokensUpdates');
    }
  } else if (socket && socket.connected) {
    // If already connected, make sure we're subscribed to graduated tokens updates
    socket.emit('subscribeToGraduatedTokensUpdates');
  }

  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(listener => listener !== callback);
  };
};

// Get the socket instance
export const getCryptoSocket = () => {
  return socket;
};

// Subscribe to Fear & Greed Index updates
export const subscribeToFearGreedUpdates = (callback: (data: FearGreedData) => void) => {
  // Add the callback to listeners
  fearGreedListeners.push(callback);
  
  // Initialize socket if not already initialized
  if (!socket) {
    const newSocket = initCryptoWebSocket();
    // If socket was successfully initialized and connected, subscribe to updates
    if (newSocket && newSocket.connected) {
      newSocket.emit('subscribeToFearGreedUpdates');
      // Immediately fetch initial data
      fetchInitialFearGreedData(callback);
    }
  } else if (socket && socket.connected) {
    // If already connected, make sure we're subscribed to fear & greed updates
    socket.emit('subscribeToFearGreedUpdates');
    // Immediately fetch initial data
    fetchInitialFearGreedData(callback);
  }

  // Return unsubscribe function
  return () => {
    fearGreedListeners = fearGreedListeners.filter(listener => listener !== callback);
  };
};

// Helper function to fetch initial Fear & Greed data
const fetchInitialFearGreedData = async (callback: (data: FearGreedData) => void) => {
  try {
    // Make a direct API call to get the latest data
    const response = await fetch('/api/fear-greed?_t=' + new Date().getTime());
    if (response.ok) {
      const data = await response.json();
      // Call the callback with the fetched data
      callback(data);
      console.log('Initial Fear & Greed data fetched successfully:', data);
    } else {
      console.error('Failed to fetch initial Fear & Greed data:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching initial Fear & Greed data:', error);
  }
};

// Disconnect socket
export const disconnectCryptoSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    listeners = [];
    fearGreedListeners = [];
  }
};