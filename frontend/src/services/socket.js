import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (socket) socket.disconnect();

  socket = io('http://localhost:5002', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
