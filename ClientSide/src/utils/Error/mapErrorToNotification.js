import { ERROR_MESSAGE_MAP } from './errorMessageMap';
import { resolveErrorCode } from './errorCodeResolver';

export const mapErrorToNotification = (error, context = 'COMMON') => {
  const code = resolveErrorCode(error);
  const contextMap = ERROR_MESSAGE_MAP[context] || ERROR_MESSAGE_MAP.COMMON;

  return contextMap[code] || contextMap.INTERNAL_ERROR || ERROR_MESSAGE_MAP.COMMON.INTERNAL_ERROR;
};
