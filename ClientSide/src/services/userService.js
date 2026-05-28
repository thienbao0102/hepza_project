import {
    CREATE_ACCOUNT_USER_ROUTE,
    UPDATE_USER_ROUTE,
    DELETE_USER_ROUTE,
    DELETE_USERS_ROUTE,
    GET_USERS_BY_ROLE_ROUTE,
    GET_USER_BY_ID_ROUTE,
    RESTORE_USER_ROUTE,
    UPDATE_MY_PROFILE_ROUTE,
    VERIFY_EMAIL_OTP_ROUTE,
    HARD_DELETE_USER_ROUTE,
    HARD_DELETE_USERS_ROUTE,
    GET_DELETED_USERS_ROUTE,
    RESTORE_USERS_ROUTE,
    PREVIEW_SOFT_DELETE_USER_ROUTE,
    PREVIEW_HARD_DELETE_USER_ROUTE,
    ADMIN_RESET_PASSWORD_ROUTE
} from '@constants/constants';
import { requestViaTransport } from '@lib/transport-selector';

const normalizeUserDeletePreview = (response, action) => {
    if (Array.isArray(response)) {
        return {
            action,
            totalUsers: response.length,
            users: response
        };
    }

    return {
        action: response?.action || action,
        totalUsers: response?.totalUsers ?? response?.users?.length ?? 0,
        users: response?.users || [],
        requiresRepresentativeReplacement: !!response?.requiresRepresentativeReplacement,
        replacementOptions: response?.replacementOptions || [],
        representativeContext: response?.representativeContext || null,
        ...response,
    };
};

const normalizeDeletePayload = (input) => {
    if (typeof input === 'string') {
        return { userId: input, newRepresentativeUserId: null, currentPassword: null };
    }

    if (input && typeof input === 'object') {
        return {
            userId: input.userId || input.user_id,
            newRepresentativeUserId: input.newRepresentativeUserId || input.new_representative_user_id || null,
            currentPassword: input.currentPassword || input.current_password || null,
        };
    }

    return { userId: null, newRepresentativeUserId: null, currentPassword: null };
};

// Handle create user account (chỉ admin)
export const handlerCreateUser = async (userData) => {
    try {
        return await requestViaTransport({
            method: 'post',
            url: CREATE_ACCOUNT_USER_ROUTE,
            event: 'user:create',
            payload: userData
        });
    } catch (error) {
        console.error('Create user error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle update user's own profile
export const handlerUpdateMyProfile = async (updateData, currentPassword = null) => {
    try {
        const payload = { ...updateData };
        if (currentPassword) {
            payload.currentPassword = currentPassword;
        }
        return await requestViaTransport({
            method: 'put',
            url: UPDATE_MY_PROFILE_ROUTE,
            event: 'user:profile:update',
            payload: { updateData: payload, currentPassword }
        });
    } catch (error) {
        console.error('Update profile error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle verify email OTP
export const handlerVerifyEmailOtp = async (userId, otp) => {
    try {
        return await requestViaTransport({
            method: 'post',
            url: VERIFY_EMAIL_OTP_ROUTE,
            event: 'user:profile:verifyEmailOtp',
            payload: { user_id: userId, otp }
        });
    } catch (error) {
        console.error('Verify OTP error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle update user (chỉ admin)
export const handlerUpdateUser = async (userId, updateData) => {
    try {
        return await requestViaTransport({
            method: 'put',
            url: UPDATE_USER_ROUTE(userId),
            event: 'user:update',
            payload: { user_id: userId, updateData }
        });
    } catch (error) {
        console.error('Update user error:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle delete single user (chỉ admin)
export const handlerDeleteUser = async (input) => {
    const { userId, newRepresentativeUserId } = normalizeDeletePayload(input);

    try {
        return await requestViaTransport({
            method: 'delete',
            url: DELETE_USER_ROUTE(userId),
            event: 'user:deleteOne',
            useSocket: false,
            payload: {
                user_id: userId,
                ...(newRepresentativeUserId && { new_representative_user_id: newRepresentativeUserId }),
            }
        });
    } catch (error) {
        console.error('Delete user error:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle delete multiple users (chỉ admin)
export const handlerDeleteUsers = async (userIds) => {
    try {
        return await requestViaTransport({
            method: 'delete',
            url: DELETE_USERS_ROUTE,
            event: 'user:deleteMany',
            useSocket: false,
            payload: { user_ids: userIds }
        });
    } catch (error) {
        console.error('Delete users error:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle get users by role (chỉ admin)
export const handlerGetUsersByRole = async (role, page = 1, limit = 10, filters = {}, sort = {}, abortSignal = null) => {
    try {
        return await requestViaTransport({
            method: 'get',
            url: GET_USERS_BY_ROLE_ROUTE(role),
            event: 'user:getByRole',
            payload: { role, page, limit, filters: JSON.stringify(filters), sort: JSON.stringify(sort) },
            config: { ...(abortSignal?.addEventListener && { signal: abortSignal }) }
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('User request was cancelled');
            throw error;
        }
        console.error('Get users by role error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle get user by ID (chỉ admin)
export const handlerGetUserById = async (userId, abortSignal = null) => {
    try {
        return await requestViaTransport({
            method: 'get',
            url: GET_USER_BY_ID_ROUTE(userId),
            event: 'user:getById',
            payload: { user_id: userId },
            config: { signal: abortSignal }
        });
    } catch (error) {
        console.error('Get user by ID error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle restore user (chỉ admin)
export const handlerRestoreUser = async (userId) => {
    try {
        return await requestViaTransport({
            method: 'put',
            url: RESTORE_USER_ROUTE(userId),
            event: 'user:restoreOne',
            payload: { user_id: userId }
        });
    } catch (error) {
        console.error('Restore user error:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle hard delete single user (chỉ admin)  
export const handlerHardDeleteUser = async (input) => {
    const { userId, newRepresentativeUserId, currentPassword } = normalizeDeletePayload(input);

    try {
        return await requestViaTransport({
            method: 'delete',
            url: HARD_DELETE_USER_ROUTE(userId),
            event: 'user:hardDeleteOne',
            useSocket: false,
            payload: {
                user_id: userId,
                ...(newRepresentativeUserId && { new_representative_user_id: newRepresentativeUserId }),
                ...(currentPassword && { current_password: currentPassword }),
            }
        });
    } catch (error) {
        console.error('Hard delete user error:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle hard delete multiple users (chỉ admin)
export const handlerHardDeleteUsers = async (userIds) => {
    try {
        return await requestViaTransport({
            method: 'delete',
            url: HARD_DELETE_USERS_ROUTE,
            event: 'user:hardDeleteMany',
            useSocket: false,
            payload: { user_ids: userIds }
        });
    } catch (error) {
        console.error('Hard delete users error:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle get soft deleted users by role (chỉ admin)
export const handlerGetDeletedUsersByRole = async (role, page = 1, limit = 10, filters = {}, abortSignal = null) => {
    try {
        return await requestViaTransport({
            method: 'get',
            url: GET_DELETED_USERS_ROUTE(role),
            event: 'user:getDeletedByRole',
            payload: { role, page, limit, filters: JSON.stringify(filters) },
            config: { ...(abortSignal && { signal: abortSignal }) }
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Deleted users request was cancelled');
            throw error;
        }
        console.error('Get deleted users by role error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle restore multiple users (chỉ admin)
export const handlerRestoreUsers = async (userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('Vui lòng chọn ít nhất 1 tài khoản để khôi phục');
    }

    try {
        return await requestViaTransport({
            method: 'put',
            url: RESTORE_USERS_ROUTE,
            event: 'user:restoreMany',
            payload: { user_ids: userIds }
        });
    } catch (error) {
        console.error('Restore users error:', error.response?.data?.error || error.message);
        throw error;
    }
};

// Handle preview soft delete impact for users
export const handlerPreviewSoftDeleteUsers = async (userIds = []) => {
    if (!userIds || userIds.length === 0) throw new Error('Chọn ít nhất 1 tài khoản để xem trước');

    try {
        const response = await requestViaTransport({
            method: 'get',
            url: PREVIEW_SOFT_DELETE_USER_ROUTE,
            event: 'user:previewSoftDelete',
            useSocket: false,
            payload: { user_ids: userIds.join(',') }
        });
        return normalizeUserDeletePreview(response, 'soft-delete');
    } catch (error) {
        console.error('Preview soft delete users error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle preview hard delete impact for users
export const handlerPreviewHardDeleteUsers = async (userIds = []) => {
    if (!userIds || userIds.length === 0) throw new Error('Chọn ít nhất 1 tài khoản để xem trước');

    try {
        const response = await requestViaTransport({
            method: 'get',
            url: PREVIEW_HARD_DELETE_USER_ROUTE,
            event: 'user:previewHardDelete',
            useSocket: false,
            payload: { user_ids: userIds.join(',') }
        });
        return normalizeUserDeletePreview(response, 'hard-delete');
    } catch (error) {
        console.error('Preview hard delete users error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};

// Handle admin reset password (chỉ admin)
export const handlerAdminResetPassword = async (userId) => {
    try {
        return await requestViaTransport({
            method: 'post',
            url: ADMIN_RESET_PASSWORD_ROUTE(userId),
            event: 'user:adminResetPassword',
            payload: { user_id: userId }
        });
    } catch (error) {
        console.error('Admin reset password error:', error.response?.data?.error || error.message);
        throw new Error(error.response?.data?.error || error.message);
    }
};
