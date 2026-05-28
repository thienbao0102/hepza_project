import { io } from 'socket.io-client';
import { HOST } from '@constants/constants';

let socket;

export const initSocket = () => {

  if (!socket) {
    socket = io(HOST, {
      withCredentials: true,
      path: '/socket.io',
    });

    socket.on('connect', () => {
      console.log('[Socket FE] Connected');
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message);
      if (err.message.includes('hết hạn') || err.message.includes('không hợp lệ')) {
        handleSocketError(err.message);
      } else if (err.message !== 'Bạn chưa đăng nhập') {
        console.warn('Non-auth socket error:', err.message);
      }
    });

    socket.on('reconnect', (attempt) => {

    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        handleSocketError('Phiên đăng nhập của bạn đã bị thu hồi');
      }
    });
    socket.on('token_invalidated', (data) => {

      handleSocketError(data.message || 'Phiên đăng nhập hết hạn');
    });

    socket.on('error', (message) => {
      if (message !== 'Bạn chưa đăng nhập') {
        handleSocketError(message);
      }
    });
  }
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

const handleSocketError = (message) => {
  window.dispatchEvent(new CustomEvent('socket-logout', { detail: { message } }));
};
