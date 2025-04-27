// lib/solanaWebSocket.ts
import { io, Socket } from 'socket.io-client';
import { SolanaToken } from './solscanApi';

let socket: Socket | null = null;
let listeners: ((data: SolanaToken[]) => void)[] = [];

// Initialize Solana WebSocket connection
export const initSolanaWebSocket = () => {
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
      console.log('Solana WebSocket connected successfully');
      // Subscribe to Solana token updates
    });

    socket.on('solanaUpdate', (data: SolanaToken[]) => {
      // Notify all listeners of the update
      listeners.forEach(listener => listener(data));
    });

    socket.on('disconnect', () => {
      console.log('Solana WebSocket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Solana WebSocket error:', error);
    });
  } else if (!socket.connected) {
    // If socket exists but not connected, try to reconnect
    socket.connect();
  }

  return socket;
};

// Subscribe to Solana token updates
export const subscribeToSolanaUpdates = (callback: (data: SolanaToken[]) => void) => {
  // Add the callback to listeners
  listeners.push(callback);
  
  // Initialize socket if not already initialized
  if (!socket) {
    initSolanaWebSocket();
  }

  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(listener => listener !== callback);
  };
};

// Get the socket instance
export const getSolanaSocket = () => {
  return socket;
};

// Disconnect socket
export const disconnectSolanaSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    listeners = [];
  }
};