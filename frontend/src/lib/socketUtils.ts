// lib/socketUtils.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Initialize socket connection
export const initializeSocket = (userId?: string) => {
  if (!socket) {
    // Create new socket connection
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });
 
    // Authenticate with userId if provided
    if (userId) {
      socket.emit('authenticate', userId);
    }

    socket.on('connect', () => {
      console.log('Socket connected successfully');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  } else if (!socket.connected) {
    // If socket exists but not connected, try to reconnect
    socket.connect();
  }

  return socket;
};

// Get the socket instance
export const getSocket = () => {
  return socket;
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};