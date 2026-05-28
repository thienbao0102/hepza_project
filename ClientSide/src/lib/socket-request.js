import ApiError from '@/utils/ApiError';
import { getSocket } from '@/utils/socket';

const DEFAULT_TIMEOUT = 15000;

const createCorrelationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const socketRequest = (event, payload = {}, opts = {}) => {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  const socket = getSocket();

  if (!socket || !socket.connected) {
    throw new ApiError('Socket disconnected', 503, 'SOCKET_DISCONNECTED');
  }

  return new Promise((resolve, reject) => {
    const correlationId = createCorrelationId();
    const timer = setTimeout(() => {
      reject(new ApiError('Socket timeout', 504, 'SOCKET_TIMEOUT'));
    }, timeoutMs);

    socket.emit(event, { ...payload, _meta: { correlationId } }, (ack) => {
      clearTimeout(timer);

      if (!ack || ack.isSuccess !== true) {
        return reject(
          new ApiError(
            ack?.error || 'Socket request failed',
            ack?.meta?.statusCode || 400,
            ack?.meta?.code || 'SOCKET_BUSINESS_ERROR'
          )
        );
      }

      resolve(ack.data ?? ack);
    });
  });
};
