import { io } from 'socket.io-client';

// Use environment variable for Socket URL, fallback to localhost for development
const SOCKET_URL = process.env.REACT_APP_API_URL 
  ? process.env.REACT_APP_API_URL.replace('/api', '') 
  : 'http://localhost:4000';

let socket = null;

export const initSocket = () => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    console.error('No token found for socket connection');
    return null;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

const socketService = { initSocket, getSocket, disconnectSocket };
export default socketService;
