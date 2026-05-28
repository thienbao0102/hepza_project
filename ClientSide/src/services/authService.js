import {
    SIGNIN_ROUTE,
    FORGET_ROUTE,
    RESETP_INIT_ROUTE,
    RESETP_ROUTE,
    LOGOUT_ROUTE,
    ME_ROUTE,
    CHANGE_PASSWORD_ROUTE,
    REFRESH_TOKEN_ROUTE
} from '@constants/constants';

import { apiClient } from '@lib/api-client';

// Handle login (supports optional OTP for progressive security)
export const handlerLogin = async (email, password, otp = null) => {
    try {
        const payload = { email, password };
        if (otp) payload.otp = otp;
        const response = await apiClient.post(SIGNIN_ROUTE, payload);
        const { data } = response; // { message: 'Login successful', user: {...} } or { otpRequired: true }
        return data;
    } catch (error) {
        // Lỗi đã được cấu trúc bởi interceptor trong api-client
        // Chỉ cần ném lại để lớp UI xử lý
        throw error;
    }
};

// Handle OTP verification to unlock an account locked due to 5 failures
export const handlerVerifyLoginOtp = async (email, otp) => {
    try {
        const response = await apiClient.post('/api/auth/verify-login-otp', { email, otp });
        return response.data; // { message: "Success" }
    } catch (error) {
        throw error;
    }
};

export const handlerResendLoginOtp = async (email) => {
    try {
        const response = await apiClient.post('/api/auth/resend-login-otp', { email });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Handle request password reset
export const handlerRequestPasswordReset = async (email) => {
    try {
        const response = await apiClient.post(FORGET_ROUTE, { email });
        return response.data; // { message: 'Password reset link sent to email' }
    } catch (error) {
        console.error('Request password reset error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle initiate reset password (from email link)
export const handlerInitiateResetPassword = async (token) => {
    try {
        const response = await apiClient.get(`${RESETP_INIT_ROUTE}?token=${token}`);
        const { data } = response; // { message: '...', redirect: '/reset-password' }
        return data;
    } catch (error) {
        console.error('Initiate reset password error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle reset password
export const handlerResetPassword = async (newPassword, confirmPassword) => {
    try {
        const response = await apiClient.post(RESETP_ROUTE, { newPassword, confirmPassword });
        return response.data; // { message: 'Password reset successfully' }
    } catch (error) {
        console.error('Reset password error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle logout
export const handlerLogout = async () => {
    try {
        const response = await apiClient.post(LOGOUT_ROUTE);
        return response.data; // { message: 'Logout successful' }
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('Access token expired. Proceeding with client-side logout cleanup.');
        } else {
            console.error('An unexpected error occurred during logout:', error);
        }
    }
};

// Handle get authenticated user
export const handlerGetAuthenticatedUser = async (abortSignal = null) => {
    const response = await apiClient.get(ME_ROUTE, {
        withCredentials: true,
        ...(abortSignal && { signal: abortSignal })
    });
    return response.data;
};

// Handle change password
export const handlerChangePassword = async (currentPassword, newPassword, confirmPassword, firstLogin = false, resetToken = null) => {
    try {
        const payload = firstLogin ? { newPassword, confirmPassword } : { currentPassword, newPassword, confirmPassword, resetToken };
        const response = await apiClient.post(CHANGE_PASSWORD_ROUTE, payload);
        return response.data; // { message: 'Password changed successfully' }
    } catch (error) {
        // Do not log to console to avoid noisy duplicate errors on expected 400s (e.g., wrong old password)
        // Still propagate the error message for UI handling
        throw new Error(error?.response?.data?.error || error.message || 'Change password failed');
    }
};

// Handle refresh token
export const handlerRefreshToken = async () => {
    try {
        const response = await apiClient.post(REFRESH_TOKEN_ROUTE);
        return response.data; // { message: 'Token refreshed' }
    } catch (error) {
        console.error('Refresh token error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};
