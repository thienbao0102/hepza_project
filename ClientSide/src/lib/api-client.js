// Tính năng chính: Tạo Axios client với interceptors để xử lý authentication, refresh token tự động, và leader election cho multi-tab session management.
// Sử dụng BroadcastChannel để sync giữa các tab, xử lý logout debounce, và proactive refresh token bởi leader tab.

import axios from 'axios';
import { handlerLogout } from '@services/authService';
import { HOST, SIGNIN_ROUTE, REFRESH_TOKEN_ROUTE, LOGOUT_ROUTE } from '@constants/constants';
import { startLoading, finishLoading } from '@lib/nprogress';
import ApiError from '@utils/ApiError';
import Cookies from 'js-cookie';

const COOKIE_NAME = import.meta.env.MODE === 'production' ? '__Secure-csrfToken' : 'csrfToken';

// Định nghĩa thời gian hết hạn token và ngưỡng refresh.
const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // Tính năng: Thời gian hết hạn token (15 phút).
const REFRESH_THRESHOLD_MS = 2 * 60 * 1000; // Tính năng: Ngưỡng thời gian trước khi refresh token (2 phút).

// Tạo instance Axios với config cơ bản.
const apiClient = axios.create({
    baseURL: HOST,
    withCredentials: true, // Tính năng: Gửi cookie với request (cho auth).
    headers: {
        'Content-Type': 'application/json',
    },
});

// Biến toàn cục cho trạng thái refresh, queue request thất bại, broadcast channel, timeout logout, và cancel source.
let isRefreshing = false; // Tính năng: Flag kiểm tra đang refresh token.
let failedQueue = []; // Tính năng: Queue lưu các request thất bại chờ refresh thành công.
const broadcastChannel = new BroadcastChannel('auth_channel'); // Tính năng: Kênh broadcast để sync auth giữa các tab.
let logoutTimeout = null; // Tính năng: Timeout cho logout debounce.
let cancelSource = axios.CancelToken.source(); // Tính năng: Nguồn cancel cho request.

// ===== Leader election =====
// Tính năng: Cơ chế election leader tab để chỉ leader xử lý refresh proactive, tránh duplicate refresh từ nhiều tab.
let isLeader = false; // Flag kiểm tra tab hiện tại có phải leader.
let leaderHeartbeat = null; // Interval cho heartbeat của leader.
const LEADER_KEY = 'auth_leader_tab'; // Key localStorage lưu timestamp leader.
const HEARTBEAT_INTERVAL = 2000; // Khoảng thời gian heartbeat (2s).
const LEADER_TIMEOUT = 5000; // Timeout để coi leader mất (5s).

// Function thử trở thành leader.
const tryBecomeLeader = () => {
    const now = Date.now();
    const currentLeader = localStorage.getItem(LEADER_KEY);

    if (!currentLeader || now - parseInt(currentLeader) > LEADER_TIMEOUT) {
        localStorage.setItem(LEADER_KEY, now.toString());
        isLeader = true;
        startLeaderHeartbeat();
        return true;
    }
    return false;
};

// Bắt đầu heartbeat cho leader.
const startLeaderHeartbeat = () => {
    if (leaderHeartbeat) clearInterval(leaderHeartbeat);

    leaderHeartbeat = setInterval(() => {
        if (isLeader) {
            localStorage.setItem(LEADER_KEY, Date.now().toString());
        }
    }, HEARTBEAT_INTERVAL);
};

// Cleanup leader khi tab đóng.
const cleanupLeader = () => {
    if (isLeader) {
        localStorage.removeItem(LEADER_KEY);
        isLeader = false;
    }
    if (leaderHeartbeat) {
        clearInterval(leaderHeartbeat);
        leaderHeartbeat = null;
    }
};

// Event listener cleanup leader chỉ khi tab thực sự đóng (không phải reload).
window.addEventListener('beforeunload', (e) => {
    if (isLeader) {
        if (e.persisted === false) {
            const navEntries = performance.getEntriesByType('navigation');
            const navType = navEntries[0]?.type || 'navigate';
            if (navType !== 'reload') {
                cleanupLeader();
            }
        }
    }
});

// Khởi tạo leader.
tryBecomeLeader();

// Interval kiểm tra và thử trở thành leader nếu không phải.
setInterval(() => {
    if (!isLeader) {
        tryBecomeLeader();
    }
}, LEADER_TIMEOUT);

// Xử lý queue request thất bại sau refresh.
const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Debounce logout để tránh gọi nhiều lần.
const debounceLogout = async (message) => {
    if (logoutTimeout) return;
    logoutTimeout = setTimeout(async () => {
        try {
            await handlerLogout();
            broadcastChannel.postMessage({ type: 'LOGOUT', message });
        } catch (error) {
            broadcastChannel.postMessage({ type: 'LOGOUT', message });
        } finally {
            logoutTimeout = null;
            cancelSource = axios.CancelToken.source();
        }
    }, 100);
};

const getAuthErrorMessage = (error, fallback = 'Phiên đăng nhập hết hạn') => {
    return error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
        || fallback;
};

const shouldForceLogout = (error) => {
    const status = error?.response?.status;
    if (!status) return false;

    if (status === 401) {
        return true;
    }

    if (status === 403) {
        const errorCode = error?.response?.data?.errorCode;
        return errorCode === 'INVALID_CSRF_TOKEN' || errorCode === 'MISSING_CSRF_TOKEN';
    }

    return false;
};

const isRecoverableAuthErrorMessage = (message) => {
    return ['Bạn chưa đăng nhập', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'].includes(message);
};

// Helper lấy timestamp token issued.
const getTokenIssuedAt = () => {
    return parseInt(localStorage.getItem('tokenIssuedAt') || '0', 10);
};

// Set timestamp token issued.
export const setTokenIssuedAt = (timestamp) => {
    localStorage.setItem('tokenIssuedAt', timestamp.toString());
};

// Remove timestamp.
const removeTokenIssuedAt = () => {
    localStorage.removeItem('tokenIssuedAt');
};

// Kiểm tra session active.
export const hasActiveSession = () => {
    const tokenIssuedAt = getTokenIssuedAt();
    const userId = localStorage.getItem('user_id');
    return !!(tokenIssuedAt && userId);
};

// Kiểm tra token còn valid.
export const isTokenValid = () => {
    const tokenIssuedAt = getTokenIssuedAt();
    if (!tokenIssuedAt) return false;

    const now = Date.now();
    const tokenAge = now - tokenIssuedAt;
    return tokenAge < TOKEN_EXPIRY_MS;
};

// ===== Force refresh token với debounce =====
// Tính năng: Force refresh token, với promise để tránh duplicate call.
let forceRefreshPromise = null;

const forceRefreshToken = async () => {
    if (!hasActiveSession()) {
        return false;
    }

    if (forceRefreshPromise) {
        return forceRefreshPromise;
    }

    forceRefreshPromise = (async () => {
        try {
            await apiClient.post(REFRESH_TOKEN_ROUTE);

            const newTime = Date.now();
            setTokenIssuedAt(newTime);

            broadcastChannel.postMessage({
                type: 'TOKEN_REFRESHED',
                tokenIssuedAt: newTime.toString(),
                forced: true
            });
            processQueue(null);
            return true;
        } catch (error) {
            processQueue(error);
            return false;
        } finally {
            setTimeout(() => {
                forceRefreshPromise = null;
            }, 1000);
        }
    })();

    return forceRefreshPromise;
};

// Refresh token proactive bởi leader.
const refreshTokenProactively = async () => {
    if (!hasActiveSession() || !isLeader || isRefreshing) {
        return;
    }

    const now = Date.now();
    const tokenIssuedAt = getTokenIssuedAt();

    const shouldRefresh = tokenIssuedAt && (now > tokenIssuedAt + TOKEN_EXPIRY_MS - REFRESH_THRESHOLD_MS);

    if (shouldRefresh) {
        isRefreshing = true;
        try {
            await apiClient.post(REFRESH_TOKEN_ROUTE);

            const newTime = Date.now();
            setTokenIssuedAt(newTime);

            broadcastChannel.postMessage({
                type: 'TOKEN_REFRESHED',
                tokenIssuedAt: newTime.toString()
            });
            processQueue(null);
        } catch (error) {
            processQueue(error);
            if (shouldForceLogout(error)) {
                await debounceLogout(getAuthErrorMessage(error));
                throw error;
            }
        } finally {
            isRefreshing = false;
        }
    }
};

// ===== Xử lý broadcast messages =====
// Tính năng: Listener broadcast để sync token, login, và xử lý request refresh từ new tab.
broadcastChannel.onmessage = (event) => {
    const { type, tokenIssuedAt: newTokenTime, userId, requestId } = event.data;

    switch (type) {
        case 'TOKEN_REFRESH':
        case 'TOKEN_REFRESHED':
            if (newTokenTime) {
                setTokenIssuedAt(parseInt(newTokenTime, 10));
            }
            break;

        case 'LOGIN_SUCCESS':
            if (userId) {
                localStorage.setItem('user_id', userId);
                const newTime = Date.now();
                setTokenIssuedAt(newTime);
            }
            break;

        case 'REQUEST_TOKEN_REFRESH':
            if (hasActiveSession()) {
                const tokenIssuedAt = getTokenIssuedAt();
                const now = Date.now();
                const tokenAge = now - tokenIssuedAt;

                broadcastChannel.postMessage({
                    type: 'TOKEN_STILL_VALID',
                    tokenIssuedAt: tokenIssuedAt.toString(),
                    requestId: requestId
                });

                if (isLeader && tokenAge >= TOKEN_EXPIRY_MS - REFRESH_THRESHOLD_MS) {
                    forceRefreshToken();
                }
            }
            break;
    }
};

// Refresh proactive khi tab visible.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        if (isTokenValid() && hasActiveSession()) {
            refreshTokenProactively();
        }
    }
});

// CHANGE: Toàn bộ request interceptor được viết lại để sửa lỗi race condition.
// Request interceptor: Đảm bảo refresh token chạy trước, sau đó mới lấy CSRF token.
apiClient.interceptors.request.use(
    async (config) => {
        const isAuthRoute = config.url.includes(SIGNIN_ROUTE) || config.url.includes(REFRESH_TOKEN_ROUTE) || config.url.includes(LOGOUT_ROUTE);

        if (!isAuthRoute) {
            startLoading();
        }

        if (!config.url.includes(SIGNIN_ROUTE)) {
            config.cancelToken = cancelSource.token;
        }

        // BƯỚC 1: Luôn kiểm tra và refresh token trước khi làm bất cứ điều gì khác (trừ các route auth).
        if (hasActiveSession() && !isAuthRoute) {
            await refreshTokenProactively();
        }

        // BƯỚC 2: Sau khi đã chắc chắn có token mới, lấy CSRF token (bây giờ đã là token mới nhất) và gắn vào header.
        const csrfToken = Cookies.get(COOKIE_NAME);
        if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method)) {
            config.headers['x-csrf-token'] = csrfToken;
        }

        // BƯỚC 3: Nếu body là FormData → xóa Content-Type để Axios tự set multipart/form-data kèm boundary.
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => {
        finishLoading();
        return Promise.reject(error);
    }
);

// Response interceptor: Xử lý loading, update token sau signin/refresh, và handle error 401 với refresh.
apiClient.interceptors.response.use(
    (response) => {
        const isAuthRoute = response.config.url.includes(SIGNIN_ROUTE) || response.config.url.includes(REFRESH_TOKEN_ROUTE) || response.config.url.includes(LOGOUT_ROUTE);
        if (!isAuthRoute) {
            finishLoading();
        }

        if (response.config.url.includes(SIGNIN_ROUTE)) {
            const newTime = Date.now();
            setTokenIssuedAt(newTime);

            const userId = response.data?.user?.user_id;
            if (userId) {
                localStorage.setItem('user_id', userId);

                broadcastChannel.postMessage({
                    type: 'LOGIN_SUCCESS',
                    tokenIssuedAt: newTime.toString(),
                    userId: userId,
                    userData: response.data.user
                });
            }
        }

        if (response.config.url.includes(REFRESH_TOKEN_ROUTE)) {
            const newTime = Date.now();
            setTokenIssuedAt(newTime);
            broadcastChannel.postMessage({
                type: 'TOKEN_REFRESHED',
                tokenIssuedAt: newTime.toString()
            });
        }

        return response;
    },
    async (error) => {
        finishLoading();

        if (axios.isCancel(error)) {
            return Promise.reject(error);
        }

        const originalRequest = error.config;
        const originalUrl = originalRequest?.url;

        if (error.response?.status === 401 && !originalRequest._retry && originalUrl !== LOGOUT_ROUTE) {
            const errorMessage = error.response?.data?.message || 'Phiên đăng nhập hết hạn';

            if (!hasActiveSession()) {
                removeTokenIssuedAt();
                localStorage.removeItem('user_id');
                return Promise.reject(error);
            }

            if (!isRecoverableAuthErrorMessage(errorMessage)) {
                return Promise.reject(error);
            }

            if (!['Bạn chưa đăng nhập', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'].includes(errorMessage)) {
                await debounceLogout(errorMessage);
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        // FIX: Gắn lại CSRF token mới trước khi retry request
                        const newCsrfToken = Cookies.get(COOKIE_NAME);
                        if (newCsrfToken) {
                            originalRequest.headers['x-csrf-token'] = newCsrfToken;
                        }
                        return apiClient(originalRequest)
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await apiClient.post(REFRESH_TOKEN_ROUTE);


                const newTime = Date.now();
                setTokenIssuedAt(newTime);
                broadcastChannel.postMessage({
                    type: 'TOKEN_REFRESHED',
                    tokenIssuedAt: newTime.toString()
                });
                processQueue(null);
                // FIX: Gắn CSRF token mới vào request gốc trước khi retry
                originalRequest.headers['x-csrf-token'] = Cookies.get(COOKIE_NAME);
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);
                if (!shouldForceLogout(refreshError)) {
                    return Promise.reject(refreshError);
                }
                await debounceLogout(errorMessage);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        if (error.response?.status === 403) {
            const errorCode = error.response?.data?.errorCode;
            if (errorCode === 'INVALID_CSRF_TOKEN' || errorCode === 'MISSING_CSRF_TOKEN') {
                const canRetryWithRefresh =
                    hasActiveSession()
                    && originalUrl
                    && originalUrl !== REFRESH_TOKEN_ROUTE
                    && originalUrl !== LOGOUT_ROUTE
                    && !originalRequest?._csrfRetry;

                if (canRetryWithRefresh) {
                    originalRequest._csrfRetry = true;

                    try {
                        await apiClient.post(REFRESH_TOKEN_ROUTE);
                        originalRequest.headers = originalRequest.headers || {};
                        originalRequest.headers['x-csrf-token'] = Cookies.get(COOKIE_NAME);
                        return apiClient(originalRequest);
                    } catch (csrfRefreshError) {
                        if (shouldForceLogout(csrfRefreshError)) {
                            await debounceLogout(getAuthErrorMessage(csrfRefreshError, 'Phiên làm việc không hợp lệ'));
                        }
                        return Promise.reject(csrfRefreshError);
                    }
                }
                // toast.error('Phiên làm việc không hợp lệ, vui lòng tải lại trang.', { autoClose: 3000 });
                await debounceLogout('Phiên làm việc không hợp lệ');
                return Promise.reject(new ApiError('Invalid CSRF token', 403, errorCode));
            }
        }

        const errorMessage = error.response?.data?.error || error.message;
        const status = error.response?.status;
        const code = error.code;

        if (status === 429) {
            const rateLimitMessage =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Thao tác quá nhanh. Vui lòng thử lại sau.';

            return Promise.reject(new ApiError(rateLimitMessage, 429, 'TOO_MANY_REQUESTS', error.response));
        }

        return Promise.reject(new ApiError(errorMessage, status, code, error.response));
    }
);

// Response interceptor thứ 2: Redact sensitive data cho logging.
apiClient.interceptors.response.use(
    (response) => {
        try {
            const raw = response.config?.data;
            const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (obj && typeof obj === 'object') {
                ['password', 'currentPassword', 'newPassword', 'confirmPassword'].forEach(k => {
                    if (obj[k]) obj[k] = '[redacted]';
                });
                response.safeForLog = {
                    url: response.config?.url,
                    method: response.config?.method,
                    data: obj,
                    status: response.status,
                };
            }
        } catch { }
        return response;
    },
    (error) => Promise.reject(error)
);

// Function clear auth token và cleanup leader.
export const clearAuthToken = () => {
    removeTokenIssuedAt();
    cleanupLeader();
};

export { apiClient };
