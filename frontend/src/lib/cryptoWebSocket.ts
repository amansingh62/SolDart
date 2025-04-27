// lib/cryptoWebSocket.ts
import { io, Socket } from 'socket.io-client';
import { TrendingCoin } from './coinMarketCapApi';

let socket: Socket | null = null;
let listeners: ((data: TrendingCoin[]) => void)[] = [];

// Initialize crypto WebSocket connection
export const initCryptoWebSocket = () => {
  if (!socket) {
    // Create new socket connection
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socket.on('connect', () => {
      console.log('Crypto WebSocket connected successfully');
      // Subscribe to crypto updates
      
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
    });

    socket.on('error', (error) => {
      console.error('Crypto WebSocket error:', error);
    });
  } else if (!socket.connected) {
    // If socket exists but not connected, try to reconnect
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

// Disconnect socket
export const disconnectCryptoSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    listeners = [];
  }
};