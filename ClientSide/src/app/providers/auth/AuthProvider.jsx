// Tính năng chính: React Context Provider cho authentication, xử lý verify session, login/logout sync giữa tabs qua BroadcastChannel, storage events, và socket cho token invalidation.
// Sử dụng refs để track state không re-render, và useEffect cho listeners.

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { handlerLogout, handlerGetAuthenticatedUser, handlerRefreshToken } from '@services/authService';
import { useNavigate } from 'react-router-dom';
import { getSocket, disconnectSocket, initSocket } from '@utils/socket';
import { useQueryClient } from '@tanstack/react-query';
import { clearAuthToken, isTokenValid, hasActiveSession, setTokenIssuedAt } from '@lib/api-client';
import toast from '@/utils/toast';

// Tạo context cho auth.
const AuthContext = createContext();

// Provider component.
export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState(null); // State lưu user data.
  const [loading, setLoading] = useState(true); // State loading verify.
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Flag đang logout.
  const [logoutInitiated, setLogoutInitiated] = useState(false); // Flag logout initiated.
  const [isVerifying, setIsVerifying] = useState(false); // Flag đang verify.
  const [verified, setVerified] = useState(false); // Flag verify hoàn thành.

  const broadcastChannelRef = useRef(null); // Ref cho BroadcastChannel.
  const hasLoggedOutRef = useRef(false); // Ref track đã logout.
  const lastStorageCheckRef = useRef(Date.now()); // Ref track thời gian check storage cuối.
  const verifyAttemptRef = useRef(0); // Ref đếm attempt verify.
  const authSyncInFlightRef = useRef(false);

  // useEffect khởi tạo broadcast channel.
  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel('auth_channel');

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  // Callback init socket và join room user.
  const initializeSocket = useCallback((userId) => {
    const socket = initSocket();
    if (socket.connected) {
      socket.emit('join', userId);
    } else {
      socket.on('connect', () => {
        socket.emit('join', userId);
      });
      socket.connect();
    }
    return socket;
  }, []);

  const applyAuthenticatedState = useCallback((userData, shouldBroadcast = true) => {
    if (!userData) return;

    setUser(userData);
    localStorage.setItem('user_id', userData.user_id);
    initializeSocket(userData.user_id);

    setVerified(true);
    hasLoggedOutRef.current = false;

    if (shouldBroadcast && broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'USER_INFO',
        userData,
      });
    }
  }, [initializeSocket]);

  const recoverSessionFromServer = useCallback(async ({ syncMarkers = false } = {}) => {
    let response;

    try {
      response = await handlerGetAuthenticatedUser();
    } catch (apiError) {
      if (apiError.response?.status !== 401) {
        throw apiError;
      }

      await handlerRefreshToken();
      response = await handlerGetAuthenticatedUser();
    }

    if (!response?.user) {
      return false;
    }

    if (syncMarkers || !localStorage.getItem('tokenIssuedAt')) {
      const newTime = Date.now();
      setTokenIssuedAt(newTime);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'TOKEN_REFRESHED',
          tokenIssuedAt: newTime.toString()
        });
      }
    }

    applyAuthenticatedState(response.user, true);
    return true;
  }, [applyAuthenticatedState]);

  // Callback verify session, với broadcast cho new tab và fallback API.
  const verifySession = useCallback(async () => {
    if (isLoggingOut || isVerifying || hasLoggedOutRef.current) {
      setLoading(false);
      return;
    }

    setIsVerifying(true);

    try {
      // Bước 1: Kiểm tra xem có nên tồn tại một session hay không
      if (!hasActiveSession()) {
        try {
          const restored = await recoverSessionFromServer({ syncMarkers: true });
          if (restored) {
            return;
          }
        } catch (recoveryError) {
          if (recoveryError.response?.status >= 500) {
            throw recoveryError;
          }
        }

        setVerified(true);
        return; // Dừng lại nếu không có dấu hiệu của session
      }

      // Bước 2: Chủ động làm mới token nếu nó đã hết hạn
      if (!isTokenValid()) {
        try {
          await handlerRefreshToken();
        } catch (refreshError) {
          console.error('Proactive refresh failed, logging out.', refreshError);
          handleLogoutClient(false, null, false);
          return;
        }
      }

      // Bước 3: Cố gắng lấy thông tin người dùng với authToken hiện tại (nếu có)
      let userData = null;
      try {
        // Lần thử đầu tiên
        const response = await handlerGetAuthenticatedUser();
        userData = response.user;
      } catch (apiError) {
        // Bẫy lỗi 401 - đây là tín hiệu authToken bị mất hoặc không hợp lệ
        if (apiError.response?.status === 401) {
          try {
            // Bắt đầu tiến trình khôi phục
            await handlerRefreshToken(); // Lấy authToken mới
            // Thử lại lần thứ hai sau khi đã refresh thành công
            const refreshedResponse = await handlerGetAuthenticatedUser();
            userData = refreshedResponse.user;

            //Đồng bộ hóa trạng thái sau khi khôi phục thành công
            const newTime = Date.now();
            setTokenIssuedAt(newTime); // Cập nhật localStorage cho tab hiện tại
            if (broadcastChannelRef.current) {
              // Thông báo cho tất cả các tab khác rằng phiên đã được làm mới
              broadcastChannelRef.current.postMessage({
                type: 'TOKEN_REFRESHED',
                tokenIssuedAt: newTime.toString()
              });
            }

          } catch (recoveryError) {
            // Nếu cả quá trình khôi phục cũng thất bại, lúc này mới logout
            console.error('Session recovery failed. Logging out.', recoveryError);
            handleLogoutClient(false, null, false);
            return;
          }
        } else {
          // Nếu lỗi không phải 401, ném lỗi ra ngoài để khối catch bên ngoài xử lý
          throw apiError;
        }
      }

      // Nếu đến được đây, userData phải hợp lệ
      if (userData) {
        applyAuthenticatedState(userData, true);
      } else {
        // Trường hợp hiếm gặp khi không có lỗi nhưng cũng không có user data
        handleLogoutClient(false, null, false);
      }

    } catch (error) {
      if (isLoggingOut || logoutInitiated || hasLoggedOutRef.current) return;
      if (error.response) {
        const { status } = error.response;
        if (status === 401) {
          localStorage.removeItem('tokenIssuedAt');
          localStorage.removeItem('user_id');
          setVerified(true);
        } else if (status >= 500) {
          navigate('/server-error');
        }
      } else if (error.request) {
        navigate('/network-error');
      }
      setVerified(true);
    } finally {
      setLoading(false);
      setIsVerifying(false);
    }
  }, [isLoggingOut, logoutInitiated, navigate, initializeSocket, applyAuthenticatedState, recoverSessionFromServer]);

  // useEffect gọi verifySession khi chưa verified.
  useEffect(() => {
    if (!verified && !isVerifying && !hasLoggedOutRef.current) {
      verifySession();
    }
  }, [verifySession, verified]);

  // useEffect check localStorage thay đổi khi tab visible/focus.
  useEffect(() => {
    if (!user || hasLoggedOutRef.current) return;

    const checkLocalStorage = () => {
      if (isLoggingOut || logoutInitiated || hasLoggedOutRef.current || !user) return;

      const now = Date.now();
      if (now - lastStorageCheckRef.current < 500) return;
      lastStorageCheckRef.current = now;

      const tokenIssuedAt = localStorage.getItem('tokenIssuedAt');
      const userId = localStorage.getItem('user_id');

      if (!tokenIssuedAt && !userId) {
        setVerified(false);
        verifyAttemptRef.current = 0;
        verifySession();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkLocalStorage();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkLocalStorage);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkLocalStorage);
    };
  }, [user, isLoggingOut, logoutInitiated, verifySession]);

  // useEffect init socket và listener token invalidated.
  useEffect(() => {
    if (!user?.user_id || hasLoggedOutRef.current) return;

    const socket = getSocket();
    if (!socket) return;

    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('join', user.user_id);

    const handleTokenInvalidated = (data) => {
      if (!logoutInitiated && !hasLoggedOutRef.current) {
        setLogoutInitiated(true);
        handleLogoutClient(true, data.message || 'Phiên đăng nhập hết hạn', true);
      }
    };

    socket.on('token_invalidated', handleTokenInvalidated);

    return () => {
      socket.off('token_invalidated', handleTokenInvalidated);
    };
  }, [user, logoutInitiated]);

  useEffect(() => {
    const handleSocketLogout = async (event) => {
      if (isLoggingOut || logoutInitiated || hasLoggedOutRef.current) return;

      try {
        const restored = await recoverSessionFromServer({ syncMarkers: true });
        if (restored) {
          return;
        }
      } catch (_) {
        // Fall through to logout below
      }

      if (!logoutInitiated && !hasLoggedOutRef.current) {
        setLogoutInitiated(true);
        handleLogoutClient(true, event.detail?.message || 'Phiên đăng nhập hết hạn', true);
      }
    };

    window.addEventListener('socket-logout', handleSocketLogout);
    return () => window.removeEventListener('socket-logout', handleSocketLogout);
  }, [isLoggingOut, logoutInitiated, recoverSessionFromServer]);

  useEffect(() => {
    const handleAuthSyncRequired = async () => {
      if (
        isLoggingOut ||
        logoutInitiated ||
        hasLoggedOutRef.current ||
        authSyncInFlightRef.current ||
        !hasActiveSession()
      ) {
        return;
      }

      authSyncInFlightRef.current = true;
      try {
        await recoverSessionFromServer();
      } catch (_) {
        // Ignore sync errors here; existing auth guards will handle real session failures.
      } finally {
        authSyncInFlightRef.current = false;
      }
    };

    window.addEventListener('auth-sync-required', handleAuthSyncRequired);
    return () => window.removeEventListener('auth-sync-required', handleAuthSyncRequired);
  }, [isLoggingOut, logoutInitiated, recoverSessionFromServer]);

  // useEffect listener broadcast messages để sync logout, login, token, user info.
  useEffect(() => {
    if (!broadcastChannelRef.current) return;

    const handleBroadcastMessage = async (event) => {
      const { type, message, userId, tokenIssuedAt: newTokenTime, userData } = event.data;

      switch (type) {
        case 'LOGOUT':
          if (!isLoggingOut && !logoutInitiated && !hasLoggedOutRef.current) {
            setLogoutInitiated(true);
            handleLogoutClient(true, message || 'Phiên đăng nhập hết hạn', false);
          }
          break;

        case 'LOGIN_SUCCESS':
          if (userId && !isLoggingOut) {
            hasLoggedOutRef.current = false;
            localStorage.setItem('user_id', userId);
            setVerified(false);
            verifyAttemptRef.current = 0;
            if (event.data.tokenIssuedAt) {
              localStorage.setItem('tokenIssuedAt', event.data.tokenIssuedAt);
            }
            if (event.data.userData) {
              setUser(event.data.userData);
              setVerified(true);
              initializeSocket(userId);
            } else {
              setVerified(false);
              verifyAttemptRef.current = 0;
            }
          }
          break;

        case 'TOKEN_REFRESH':
        case 'TOKEN_REFRESHED':
        case 'TOKEN_STILL_VALID':
          if (newTokenTime) {
            const oldTokenTime = localStorage.getItem('tokenIssuedAt');
            localStorage.setItem('tokenIssuedAt', newTokenTime);
            // Nếu token time thực sự thay đổi (không phải là tin nhắn tự gửi)
            // và tab này không phải là tab đang thực hiện refresh,
            // hãy buộc nó phải xác thực lại để đồng bộ state (user, csrf, etc.)
            if (oldTokenTime !== newTokenTime && !isVerifying) {
              setVerified(false);
              verifyAttemptRef.current = 0;
            }
          }
          break;

        case 'USER_INFO':
          if (userData && !user && !isLoggingOut && !hasLoggedOutRef.current) {
            setUser(userData);
            setVerified(true);
            hasLoggedOutRef.current = false;
            verifyAttemptRef.current = 0;
            if (userData.user_id) {
              initializeSocket(userData.user_id);
            }
          }
          break;

        case 'REQUEST_USER_INFO':
          if (broadcastChannelRef.current) {
            let userDataToSend = user;
            if (!userDataToSend) {
              const storedUserId = localStorage.getItem('user_id');
              if (storedUserId) {
                userDataToSend = { user_id: storedUserId };
              }
            }
            if (userDataToSend) {
              broadcastChannelRef.current.postMessage({
                type: 'USER_INFO',
                userData: userDataToSend
              });
            }
          }
          break;
      }
    };

    broadcastChannelRef.current.onmessage = handleBroadcastMessage;

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.onmessage = null;
      }
    };
  }, [isLoggingOut, logoutInitiated, user, initializeSocket]);

  // useEffect sync user_id với localStorage.
  useEffect(() => {
    if (user) {
      localStorage.setItem('user_id', user.user_id);
    } else {
      localStorage.removeItem('user_id');
    }
  }, [user]);

  // useEffect listener storage events để detect logout/login từ tab khác.
  useEffect(() => {
    if (hasLoggedOutRef.current) return;

    const handleStorageChange = (e) => {
      if (!e.key || e.oldValue === e.newValue) return;

      if ((e.key === 'user_id' || e.key === 'tokenIssuedAt') &&
        e.oldValue && !e.newValue &&
        user &&
        !isLoggingOut &&
        !logoutInitiated) {
        setTimeout(() => {
          const stillUser = localStorage.getItem('user_id');
          const stillToken = localStorage.getItem('tokenIssuedAt');
          if (!stillUser && !stillToken) {
            setVerified(false);
            verifyAttemptRef.current = 0;
            verifySession();
          }
        }, 100);
      }

      if (e.key === 'user_id' &&
        !e.oldValue && e.newValue &&
        !user &&
        !isLoggingOut &&
        !hasLoggedOutRef.current) {
        setVerified(false);
        verifyAttemptRef.current = 0;
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, isLoggingOut, logoutInitiated, verifySession]);

  // Function handle logout client-side.
  const handleLogoutClient = async (showAlert = true, message = null, callApi = true) => {
    if (isLoggingOut || hasLoggedOutRef.current) return;

    setIsLoggingOut(true);
    setLogoutInitiated(true);
    hasLoggedOutRef.current = true;

    try {
      if (callApi) {
        await handlerLogout();
      }

      queryClient.clear();
      setUser(null);
      localStorage.removeItem('tokenIssuedAt');
      localStorage.removeItem('user_id');
      clearAuthToken();
      disconnectSocket();
      setVerified(false);
      verifyAttemptRef.current = 0;

      if (showAlert) {
        toast.info(
          'Đăng xuất thành công',
          message || 'Bạn đã đăng xuất khỏi hệ thống.'
        );
      }
      navigate('/login');
    } catch (error) {
      if (showAlert) {
        toast.error(
          'Đăng xuất thất bại',
          'Không thể đăng xuất, vui lòng thử lại.'
        );
      }
    } finally {
      setIsLoggingOut(false);
      setLogoutInitiated(false);
    }
  };

  // Function logout public, broadcast logout.
  const logout = async (message = 'Đăng xuất thành công') => {
    if (!logoutInitiated && !hasLoggedOutRef.current) {
      await handleLogoutClient(true, message, true);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({ type: 'LOGOUT', message });
      }
    }
  };

  // Function set user và verify, broadcast login success.
  const setUserAndVerify = (userData) => {
    setUser(userData);
    setVerified(true);
    hasLoggedOutRef.current = false;
    verifyAttemptRef.current = 0;

    if (userData?.user_id) {
      const newTime = Date.now();
      localStorage.setItem('tokenIssuedAt', newTime.toString());
      localStorage.setItem('user_id', userData.user_id);
      initializeSocket(userData.user_id);

      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'LOGIN_SUCCESS',
          userId: userData.user_id,
          tokenIssuedAt: newTime.toString(),
          userData: userData
        });
      }
    }
  };

  const isAuthenticated = !!user; // Computed authenticated.

  return (
    <AuthContext.Provider value={{
      user,
      setUser: setUserAndVerify,
      logout,
      isAuthenticated,
      isVerifying,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook useAuth.
export const useAuth = () => useContext(AuthContext);
