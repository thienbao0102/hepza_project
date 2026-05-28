import { apiClient } from '@/lib/api-client';
import { socketRequest } from '@/lib/socket-request';
import ApiError from '@/utils/ApiError';

const callHttp = async ({ method, url, payload, config }) => {
  const m = method.toLowerCase();

  if (m === 'get') {
    const rs = await apiClient.get(url, { ...(config || {}), params: payload });
    return rs.data;
  }

  if (m === 'delete') {
    const rs = await apiClient.delete(url, { ...(config || {}), data: payload });
    return rs.data;
  }

  const rs = await apiClient[m](url, payload, config);
  return rs.data;
};

export const requestViaTransport = async ({
  method,
  url,
  event,
  payload = {},
  config,
  useSocket = import.meta.env.VITE_USE_SOCKET_API === 'true',
  allowFallback = true,
  socketOpts,
}) => {
  // Force HTTP for file uploads — FormData cannot be serialized over Socket.IO
  const isFileUpload = payload instanceof FormData ||
    config?.headers?.['Content-Type']?.toLowerCase().includes('multipart');

  // Force HTTP for binary downloads — blob/arraybuffer responses cannot be sent via Socket.IO
  const isBinaryDownload = ['blob', 'arraybuffer'].includes(
    config?.responseType?.toLowerCase()
  );

  if (useSocket && event && !isFileUpload && !isBinaryDownload) {
    try {

      return await socketRequest(event, payload, socketOpts);
    } catch (err) {
      const isTransportError =
        err instanceof ApiError &&
        ['SOCKET_DISCONNECTED', 'SOCKET_TIMEOUT'].includes(err?.code);

      if (allowFallback && isTransportError) {

        return callHttp({ method, url, payload, config });
      }

      throw err;
    }
  }

  return callHttp({ method, url, payload, config });
};
