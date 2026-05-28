const userService = require('../services/userService');
const { authTokenCookieOptions } = require('./authController');

const authTokenName = process.env.NODE_ENV === 'production' ? '__Secure-authToken' : 'authToken';

const createUser = async (req, res) => {
    try {
        const userData = req.body;
        const currentUser = req.user;
        const result = await userService.createUser(userData, currentUser);
        res.status(201).json({
            message: 'User created successfully',
            user: result,
            generatedPassword: result.generatedPassword
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const user_id = req.params.user_id;
        const updateData = req.body;
        const result = await userService.updateUser(user_id, updateData, req.user);

        res.status(200).json({
            message: 'User updated successfully',
            user: result.user,
        });
    } catch (error) {
        const status = error.statusCode || 400;
        res.status(status).json({ error: error.message, code: error.code || undefined });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user_id = req.params.user_id;
        await userService.softDeleteUser(user_id, req.user, req.body || {});
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const deleteUsers = async (req, res) => {
    try {
        const user_ids = req.body.user_ids;
        await userService.softDeleteUsers(user_ids, req.user);
        res.status(200).json({ message: 'Users deleted successfully' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const getUsersByRole = async (req, res) => {
    try {
        const role = req.params.role;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        let filters = {};
        let sort = {};

        try {
            if (req.query.filters) {
                filters = JSON.parse(req.query.filters);
            }
        } catch (error) {
            console.error('Error parsing filters:', error);
        }

        try {
            if (req.query.sort) {
                sort = JSON.parse(req.query.sort);
            }
        } catch (error) {
            console.error('Error parsing sort:', error);
        }

        // --- ENFORCE SECURITY SCOPING ---
        if (req.user.role === 'company') {
            filters.company = req.user.company_id;
        } else if (req.user.role === 'manager') {
            filters.zone = req.user.zone_id;
        }

        const result = await userService.getUsersByRole(role, page, limit, filters, sort, req.user);

        res.status(200).json({
            message: 'Users retrieved successfully',
            ...result
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getUserById = async (req, res) => {
    try {
        const user_id = req.params.user_id;
        const user = await userService.getUserById(user_id);

        // --- ENFORCE SECURITY SCOPING ---
        if (req.user.role === 'company' && user.company_id !== req.user.company_id) {
            return res.status(403).json({ error: 'Không có quyền truy cập dữ liệu người dùng này' });
        }
        if (req.user.role === 'manager' && user.zone_id !== req.user.zone_id) {
            return res.status(403).json({ error: 'Không có quyền truy cập dữ liệu người dùng này' });
        }

        res.status(200).json({ message: 'User retrieved successfully', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const restoreUser = async (req, res) => {
    try {
        const user_id = req.params.user_id;
        const result = await userService.restoreUser(user_id, req.user);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const updateMyProfile = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const updateData = req.body.updateData || req.body;
        const currentPassword = req.body.currentPassword || updateData.currentPassword;

        const { updatedUser, authToken } = await userService.updateMyProfile(user_id, updateData, currentPassword);

        // Set authToken vao cookie neu co
        if (authToken) {
            res.cookie(authTokenName, authToken, authTokenCookieOptions);
        }

        res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser,
            otpRequired: updatedUser.otpRequired || false,
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const verifyEmailOtp = async (req, res) => {
    try {
        const { user_id, otp } = req.body;
        const result = await userService.verifyEmailOtp(user_id, otp);

        // Xoa cookies
        res.clearCookie('authToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        });
        res.clearCookie('XSRF-TOKEN', {
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        });

        res.status(200).json({
            message: 'Email verified successfully',
            user: result.user,
            logoutRequired: result.logoutRequired || false,
        });
    } catch (error) {
        console.error('Verify email OTP error:', error.message); // Debug
        res.status(400).json({ error: error.message });
    }
};

const hardDeleteUser = async (req, res) => {
    try {
        const user_id = req.params.user_id;
        await userService.hardDeleteUser(user_id, req.user, req.body || {});
        res.status(200).json({ message: 'User permanently deleted successfully' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const hardDeleteUsers = async (req, res) => {
    try {
        const { user_ids } = req.body;
        const result = await userService.hardDeleteUsers(user_ids, req.user);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const getTrashUsers = async (req, res) => {
    try {
        const role = req.params.role || null;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        let filters = {};
        try {
            if (req.query.filters) {
                filters = JSON.parse(req.query.filters);
            }
        } catch (e) {
            console.error("Invalid filters JSON:", req.query.filters);
        }

        if (req.user.role === 'manager') {
            filters.zone_id = req.user.zone_id;
        }

        const result = await userService.getSoftDeletedUsers(role, page, limit, filters, req.user);

        res.status(200).json({
            message: 'Soft-deleted users retrieved successfully',
            ...result
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const restoreUsers = async (req, res) => {
    try {
        const { user_ids } = req.body;
        const result = await userService.restoreUsers(user_ids, req.user);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const previewSoftDelete = async (req, res) => {
    try {
        const user_ids = req.query.user_ids ? req.query.user_ids.split(',').map(id => id.trim()) : [];
        if (user_ids.length === 0) {
            return res.status(400).json({ error: 'Không có user_ids cung cấp' });
        }
        const preview = await userService.previewSoftDeleteUsers(user_ids, req.user);

        res.json({
            action: 'soft-delete',
            message: 'Danh sách user sẽ bị xóa mềm',
            totalUsers: preview.totalUsers || 0,
            users: preview.users || [],
            requiresRepresentativeReplacement: !!preview.requiresRepresentativeReplacement,
            replacementOptions: preview.replacementOptions || [],
            representativeContext: preview.representativeContext || null
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const previewHardDelete = async (req, res) => {
    try {
        const user_ids = req.query.user_ids ? req.query.user_ids.split(',').map(id => id.trim()) : [];
        if (user_ids.length === 0) {
            return res.status(400).json({ error: 'Không có user_ids cung cấp' });
        }
        const preview = await userService.previewHardDeleteUsers(user_ids, req.user);

        res.json({
            action: 'hard-delete',
            message: 'Cảnh báo: các user này sẽ bị xóa vĩnh viễn, và nếu là company user sẽ mất liên kết công ty!',
            warning: 'Dữ liệu sẽ không thể khôi phục',
            totalUsers: preview.totalUsers || 0,
            users: preview.users || [],
            requiresRepresentativeReplacement: !!preview.requiresRepresentativeReplacement,
            replacementOptions: preview.replacementOptions || [],
            representativeContext: preview.representativeContext || null
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const adminResetPassword = async (req, res) => {
    try {
        const user_id = req.params.user_id;
        const result = await userService.adminResetPassword(user_id, req.user);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createUser,
    updateUser,
    deleteUser,
    deleteUsers,
    getUsersByRole,
    getUserById,
    restoreUser,
    updateMyProfile,
    verifyEmailOtp,
    hardDeleteUser,
    hardDeleteUsers,
    getTrashUsers,
    restoreUsers,
    previewSoftDelete,
    previewHardDelete,
    adminResetPassword
};
