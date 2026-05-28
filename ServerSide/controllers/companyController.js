const { default: mongoose } = require('mongoose');
const companyService = require('../services/companyService');
const industrialZoneService = require('../services/industrialZoneService');
const userService = require('../services/userService');
const taxLookupService = require('../services/taxLookupService');
const User = require('../models/userModel');
const { parseCompanyIds } = require('../utils/parseIds');
const companyRepository = require('../dataAccess/companyRepository');
const { uploadOrReuseAttachment } = require('../config/cloudinary');
const { destroyUnusedCloudinaryUrls } = require('../utils/cloudinaryReferenceTracker');
const { CLOUDINARY_FOLDERS } = require('../utils/cloudinaryFolders');

const normalizeRepresentativePayload = (companyData = {}) => {
    const full_name = companyData.full_name?.toString().trim();
    const email = companyData.email?.toString().trim().toLowerCase();
    const phone_number = companyData.phone_number?.toString().trim();

    return {
        full_name,
        email,
        phone_number,
    };
};

const validateRepresentativePayload = (companyData = {}) => {
    const representative = normalizeRepresentativePayload(companyData);
    const missingFields = [];

    if (!representative.full_name) {
        missingFields.push('họ tên người đại diện');
    }
    if (!representative.email) {
        missingFields.push('email tài khoản đại diện');
    }
    if (!representative.phone_number) {
        missingFields.push('số điện thoại tài khoản đại diện');
    }

    if (missingFields.length > 0) {
        throw new Error(
            `Thông tin tài khoản đại diện là bắt buộc khi tạo doanh nghiệp: thiếu ${missingFields.join(', ')}`
        );
    }

    return representative;
};

const parseMultipartPayload = (req) => {
    if (typeof req.body?.data === 'string') {
        const parsed = JSON.parse(req.body.data);
        return parsed && typeof parsed === 'object' ? parsed : {};
    }
    return req.body || {};
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findUserByEmailForImportPreview = async (email) => {
    const normalizedEmail = email?.toString().trim().toLowerCase();
    if (!normalizedEmail) return null;

    return User.findOne({
        email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' }
    }).lean();
};

const findUserByPhoneForImportPreview = async (phoneNumber) => {
    const normalizedPhoneNumber = phoneNumber?.toString().trim();
    if (!normalizedPhoneNumber) return null;

    return User.findOne({ phone_number: normalizedPhoneNumber }).lean();
};

const countImportDuplicates = (listData = []) => {
    const counters = {
        registrationNumbers: new Map(),
        representativeEmails: new Map(),
        representativePhones: new Map(),
    };

    const increase = (map, rawValue) => {
        const normalizedValue = rawValue?.toString().trim();
        if (!normalizedValue) return;
        map.set(normalizedValue, (map.get(normalizedValue) || 0) + 1);
    };

    listData.forEach((companyData) => {
        const representative = normalizeRepresentativePayload(companyData);

        increase(counters.registrationNumbers, companyData.company_registration_number);
        increase(counters.representativeEmails, representative.email);
        increase(counters.representativePhones, representative.phone_number);
    });

    return counters;
};

const getCompany = async (req, res) => {
    try {
        const { role, zone_id, company_id } = req.userDetails;
        const company = await companyService.getCompanyById(req.params.company_id, role, zone_id, company_id);
        res.status(200).json({ message: 'Company retrieved successfully', company });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const lookupTaxCode = async (req, res) => {
    try {
        const result = await taxLookupService.lookupTaxCode(req.params.taxCode);
        res.status(200).json({
            message: 'Tra cứu MST thành công',
            ...result,
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const addCompanyFromFile = async (req, res) => {
    const { createAccounts, data } = req.body;
    const listData = Array.isArray(data) ? data : [];
    const shouldCreateAccounts = createAccounts === true || createAccounts === 'true';

    if (!shouldCreateAccounts) {
        return res.status(400).json({
            error: 'Import doanh nghiệp bắt buộc tạo tài khoản đại diện ngay từ đầu.'
        });
    }

    const userId = req.user.user_id;
    const results = [];
    const zoneIdCache = new Map();
    const importDuplicateCounters = countImportDuplicates(listData);
    let hasError = false;

    for (const companyData of listData) {
        const session = await mongoose.startSession();
        session.startTransaction();
        let status = 'success';
        let message = '';
        let userCreated = false;
        let company_id;

        try {
            let zone_id;
            const isManager = req.user.role === 'manager';
            const representative = validateRepresentativePayload(companyData);
            const normalizedCompanyData = {
                ...companyData,
                ...representative,
            };

            if (isManager) {
                zone_id = req.user.zone_id;
            } else {
                const zoneName = normalizedCompanyData.zone_name?.toString().trim();
                zone_id = zoneIdCache.get(zoneName);

                if (!zone_id) {
                    try {
                        zone_id = await industrialZoneService.getZoneIdByName(zoneName);
                    } catch (_err) {
                        zone_id = null;
                    }

                    zoneIdCache.set(zoneName, zone_id);
                }

                if (!zone_id) {
                    throw new Error(`KCN/KCX "${zoneName}" chưa tồn tại. Vui lòng tạo khu công nghiệp trước khi import doanh nghiệp.`);
                }
            }

            company_id = await companyService.addCompany(normalizedCompanyData, zone_id, userId, session);

            const userData = {
                full_name: representative.full_name,
                phone_number: representative.phone_number,
                email: representative.email,
                role: 'company',
                zone_id,
                company_id,
                created_by: userId,
                updated_by: userId,
            };
            const userResult = await userService.createUser(userData, req.user, session);
            userCreated = true;
            message += `User created: ${userResult.user_id}`;

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            status = 'failed';
            message = error.message;
            hasError = true;
        } finally {
            session.endSession();
            results.push({
                company_name: companyData.company_name,
                status,
                message,
                company_id: company_id || null,
                user_created: userCreated
            });
        }
    }

    res.status(hasError ? 207 : 201).json({ message: 'Processing completed', results });
};

const addSingleCompany = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    let createdUser = null; // Biến để lưu user nếu được tạo

    try {
        const companyData = req.body;
        if (!companyData.zone_name) throw new Error('zone_name is required');
        const representative = validateRepresentativePayload(companyData);

        const zone_id = await industrialZoneService.getZoneIdByName(companyData.zone_name);
        if (!zone_id) throw new Error(`Industrial Zone with name ${companyData.zone_name} not found`);

        const userId = req.user.user_id;
        const normalizedCompanyData = {
            ...companyData,
            ...representative,
        };

        // Tạo company trước
        const company_id = await companyService.addCompany(normalizedCompanyData, zone_id, userId, session);

        const userData = {
            full_name: representative.full_name,
            phone_number: representative.phone_number,
            email: representative.email,
            role: 'company',
            zone_id,
            company_id,
            created_by: userId,
            updated_by: userId,
        };

        const userResult = await userService.createUser(userData, req.user, session);
        createdUser = {
            user_id: userResult.user_id,
            full_name: userResult.full_name,
            email: userResult.email,
            phone_number: userResult.phone_number,
            role: userResult.role,
            company_id: userResult.company_id
        };

        await session.commitTransaction();

        // Trả về response đầy đủ và đẹp
        res.status(201).json({
            message: 'Company added successfully',
            data: {
                company_id,
                company_name: companyData.company_name,
                user_created: !!createdUser,
                user: createdUser // Nếu có thì trả về, không thì null
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error in addSingleCompany:', error.message);
        res.status(400).json({
            error: error.message || 'Failed to add company'
        });
    } finally {
        session.endSession();
    }
};

// Handler get all companies as conditions with pagination
const getAllCompaniesAsConditions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const filterParams = JSON.parse(req.query.filters || '{}');
        const search = req.query.search || '';
        const sort = req.query.sort ? JSON.parse(req.query.sort) : {};

        const user = req.user;

        const { companies, totalItems, totalPages } = await companyService.getAllCompanies(page, limit, filterParams, search, user, sort);
        res.status(200).json({
            companies,
            totalItems,
            totalPages
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            companies: [],
            totalItems: 0,
            totalPages: 0
        });
    }
};

const getManagedCompanies = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const filterParams = JSON.parse(req.query.filters || '{}');
        const search = req.query.search || '';
        const sort = req.query.sort ? JSON.parse(req.query.sort) : {};

        const user = req.user;

        // Force strict mode object properties to enforce isolation in managed routing
        const strictUser = { ...user, isStrictMode: true };

        const { companies, totalItems, totalPages } = await companyService.getAllCompanies(page, limit, filterParams, search, strictUser, sort);
        res.status(200).json({
            companies,
            totalItems,
            totalPages
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            companies: [],
            totalItems: 0,
            totalPages: 0
        });
    }
};

// Handler delete company by company_id
const deleteCompanyById = async (req, res) => {

    try {
        await companyService.deleteCompanyById(req.params.company_id, req.user);
        res.status(200).json({ message: 'Company deleted successfully' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const deleteCompaniesByIds = async (req, res) => {
    try {
        const companyIds = req.body.company_ids; // Danh sách company_ids từ body
        if (!Array.isArray(companyIds) || companyIds.length === 0) {
            throw new Error('company_ids must be a non-empty array');
        }
        const result = await companyService.deleteCompaniesByIds(companyIds, req.user);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const deleteAllCompany = async (req, res) => {
    try {
        await companyService.deleteAllCompany(req.user);
        res.status(200).json({ message: 'All companies deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const restoreCompany = async (req, res) => {
    try {
        const company_id = req.params.company_id;
        const result = await companyService.restoreCompany(company_id, req.user);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const restoreCompanies = async (req, res) => {
    try {
        const companyIds = req.body.company_ids || [req.params.company_id]; // Hỗ trợ cả multiple và single
        if (!Array.isArray(companyIds)) {
            return res.status(400).json({ error: 'company_ids must be an array' });
        }
        const result = await companyService.restoreCompanies(companyIds, req.user);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const getDeletedCompanies = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const filterParams = JSON.parse(req.query.filters || '{}');
        const search = req.query.search || '';
        const sort = req.query.sort ? JSON.parse(req.query.sort) : {};

        const user = req.user;
        const strictUser = { ...user, isStrictMode: true };

        const { deletedCompanies, totalItems, totalPages, currentPage } = await companyService.getDeletedCompanies(page, limit, filterParams, search, strictUser, sort);
        res.status(200).json({
            message: 'Deleted companies retrieved successfully',
            deletedCompanies,
            totalItems,
            totalPages,
            currentPage
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateCompany = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { company_id } = req.params;
        const { role, user_id } = req.userDetails;
        const updateData = {
            company_registration_number: req.body.company_registration_number,
            company_name: req.body.company_name,
            website: req.body.website?.trim(),
            address: req.body.address,
            company_type: req.body.company_type,
            industry: req.body.industry,
            industry_group: req.body.industry_group,
            total_workers: req.body.total_workers,
            revenue: req.body.revenue === 'null' ? null : req.body.revenue,
            revenue_currency: req.body.revenue_currency === 'null' ? null : req.body.revenue_currency,
            market: req.body.market,
            founded_year: req.body.founded_year,
            status: req.body.status,
            updated_by: user_id,
            __v: req.body.__v,  // Optimistic Locking — version từ client
        };

        const updatedCompany = await companyService.updateCompany(company_id, updateData, role, req.userDetails, session);
        await session.commitTransaction();
        res.status(200).json({ message: 'Company updated successfully', company: updatedCompany });
    } catch (error) {
        await session.abortTransaction();
        const status = error.statusCode || 400;
        res.status(status).json({ error: error.message, code: error.code || undefined });
    } finally {
        session.endSession();
    }
};

const setRepresentativeUser = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { company_id } = req.params;
        const { representative_user_id, current_password } = req.body;
        const currentCompany = await companyRepository.getCompanyById(company_id, session);
        const previousRepresentativeUserId = currentCompany?.representative_user_id || null;
        const updatedCompany = await companyService.setRepresentativeUser(
            company_id,
            representative_user_id,
            req.user,
            current_password,
            session
        );

        await session.commitTransaction();

        try {
            const { getIo } = require('../config/socket');
            const io = getIo();
            if (io && updatedCompany) {
                const payload = {
                    company_id,
                    zone_id: updatedCompany.zone_id || currentCompany?.zone_id || null,
                    previous_representative_user_id: previousRepresentativeUserId,
                    next_representative_user_id: updatedCompany.representative_user_id || null,
                    updated_by: req.user?.user_id || null,
                };

                io.to('role:admin').emit('company:representative_changed', payload);
                io.to(`company:${company_id}:users`).emit('company:representative_changed', payload);

                if (payload.zone_id) {
                    io.to(`zone:${payload.zone_id}:managers`).emit('company:representative_changed', payload);
                }
                if (payload.previous_representative_user_id) {
                    io.to(`user:${payload.previous_representative_user_id}`).emit('company:representative_changed', payload);
                }
                if (payload.next_representative_user_id) {
                    io.to(`user:${payload.next_representative_user_id}`).emit('company:representative_changed', payload);
                }
            }
        } catch (_) { /* Socket emit is best-effort, never block the response */ }

        res.status(200).json({
            message: 'Representative user updated successfully',
            company: updatedCompany,
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

const hardDeleteCompany = async (req, res) => {
    try {
        const { company_id } = req.params;
        await companyService.hardDeleteCompany(company_id, req.user);
        res.status(200).json({ message: 'Company permanently deleted successfully' });
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const hardDeleteCompanies = async (req, res) => {
    try {
        const { company_ids } = req.body;
        if (!Array.isArray(company_ids) || company_ids.length === 0) {
            throw new Error('company_ids must be a non-empty array');
        }
        await companyService.hardDeleteCompanies(company_ids, req.user);
        res.status(200).json({
            message: `${company_ids.length} companies permanently deleted successfully`
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
    }
};

const previewSoftDelete = async (req, res) => {
    try {
        const company_ids = parseCompanyIds(req.query.company_ids);

        const companies = await companyService.previewSoftDeleteCompanies(company_ids);

        if (companies.length === 0) {
            return res.status(404).json({
                error: 'Không tìm thấy công ty nào phù hợp (có thể đã bị xóa hoặc không tồn tại)'
            });
        }

        res.json({
            action: 'soft-delete',
            message: 'Danh sách công ty và user sẽ bị xóa mềm',
            totalCompanies: companies.length,
            companies: companies.map(c => ({
                company_id: c.company_id,
                company_name: c.company_name,
                affectedUsersCount: c.affectedUsers.length,
                affectedUsers: c.affectedUsers.map(u => ({
                    user_id: u.user_id,
                    full_name: u.full_name,
                    email: u.email
                }))
            }))
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const previewHardDelete = async (req, res) => {
    try {
        const company_ids = parseCompanyIds(req.query.company_ids);
        const companies = await companyService.previewHardDeleteCompanies(company_ids);

        res.json({
            action: 'hard-delete',
            message: 'CẢNH BÁO: Các công ty và user này sẽ bị XÓA VĨNH VIỄN!',
            warning: 'Dữ liệu sẽ không thể khôi phục',
            totalCompanies: companies.length,
            companies
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const previewImportCompanies = async (req, res) => {
    let listData = [];
    let shouldCreateAccounts = true;

    if (Array.isArray(req.body)) {
        listData = req.body;
    } else {
        const { createAccounts = true, data } = req.body;
        listData = Array.isArray(data) ? data : [];
        shouldCreateAccounts = createAccounts === true || createAccounts === 'true';
    }

    if (!shouldCreateAccounts) {
        return res.status(400).json({
            message: 'Import doanh nghiệp bắt buộc tạo tài khoản đại diện ngay từ đầu.',
            total: 0,
            results: []
        });
    }

    if (listData.length === 0) {
        return res.status(400).json({
            message: 'Không có dữ liệu để kiểm tra',
            total: 0,
            results: []
        });
    }

    const results = [];
    const zoneIdCache = new Map();
    const importDuplicateCounters = countImportDuplicates(listData);

    for (const companyData of listData) {
        let status = 'valid_with_user';
        let message = 'Hợp lệ - Sẽ import công ty và tạo tài khoản đại diện';
        const zoneName = companyData.zone_name?.toString().trim();

        try {
            const isManager = req.user.role === 'manager';
            const representative = normalizeRepresentativePayload(companyData);
            const requiredErrors = [];

            if (!companyData.company_name?.toString().trim()) requiredErrors.push('thiếu tên doanh nghiệp');
            if (!companyData.company_registration_number?.toString().trim()) requiredErrors.push('thiếu số đăng ký kinh doanh');
            if (!companyData.industry) requiredErrors.push('thiếu ngành nghề');
            if (!companyData.industry_group) requiredErrors.push('thiếu nhóm ngành');
            if (!isManager && !zoneName) requiredErrors.push('thiếu tên khu công nghiệp');
            if (!representative.full_name) requiredErrors.push('thiếu họ tên người đại diện');
            if (!representative.email) requiredErrors.push('thiếu email tài khoản đại diện');
            if (!representative.phone_number) requiredErrors.push('thiếu số điện thoại tài khoản đại diện');

            if (requiredErrors.length > 0) {
                status = 'invalid';
                message = `Không hợp lệ - ${requiredErrors.join(', ')}`;
                results.push({
                    company_name: companyData.company_name || '(Không có tên doanh nghiệp)',
                    status,
                    message,
                    ...companyData
                });
                continue;
            }

            if (!isManager) {
                let zone_id = zoneIdCache.get(zoneName);
                if (!zone_id) {
                    try {
                        zone_id = await industrialZoneService.getZoneIdByName(zoneName);
                    } catch (_) {
                        zone_id = null;
                    }
                    zoneIdCache.set(zoneName, zone_id);
                }

                if (!zone_id) {
                    status = 'invalid';
                    message = `Không hợp lệ - KCN/KCX "${zoneName}" chưa tồn tại trong hệ thống`;
                    results.push({
                        company_name: companyData.company_name || '(Không có tên doanh nghiệp)',
                        status,
                        message,
                        ...companyData
                    });
                    continue;
                }
            }

            try {
                await companyService.normalizeIndustrySelection(
                    companyData.industry,
                    companyData.industry_group
                );
            } catch (industryError) {
                status = 'invalid';
                message = `Không hợp lệ - ${industryError.message}`;
                results.push({
                    company_name: companyData.company_name || '(Không có tên doanh nghiệp)',
                    status,
                    message,
                    ...companyData
                });
                continue;
            }

            const duplicateErrors = [];

            if (companyData.company_registration_number) {
                const registrationNumber = companyData.company_registration_number.toString().trim();
                if (registrationNumber) {
                    if ((importDuplicateCounters.registrationNumbers.get(registrationNumber) || 0) > 1) {
                        duplicateErrors.push(`mã số đăng ký kinh doanh bị trùng trong file import: ${registrationNumber}`);
                    }

                    const existingCompany = await companyRepository.findOne({ company_registration_number: registrationNumber });
                    if (existingCompany) {
                        duplicateErrors.push(`mã số đăng ký kinh doanh đã tồn tại: ${registrationNumber}`);
                    }
                }
            }

            const representativeErrors = [];

            if ((importDuplicateCounters.representativeEmails.get(representative.email) || 0) > 1) {
                representativeErrors.push(`email bị trùng trong file import: ${representative.email}`);
            }

            const existingEmail = await findUserByEmailForImportPreview(representative.email);
            if (existingEmail) {
                representativeErrors.push(
                    existingEmail.deleted_at
                        ? `email đã tồn tại trên tài khoản bị vô hiệu hóa: ${representative.email}`
                        : `email đã được dùng: ${representative.email}`
                );
            }

            if ((importDuplicateCounters.representativePhones.get(representative.phone_number) || 0) > 1) {
                representativeErrors.push(`số điện thoại cá nhân bị trùng trong file import: ${representative.phone_number}`);
            }

            const existingPhone = await findUserByPhoneForImportPreview(representative.phone_number);
            if (existingPhone) {
                representativeErrors.push(
                    existingPhone.deleted_at
                        ? `số điện thoại cá nhân đã tồn tại trên tài khoản bị vô hiệu hóa: ${representative.phone_number}`
                        : `số điện thoại cá nhân đã được dùng: ${representative.phone_number}`
                );
            }

            const validationMessages = [];

            if (duplicateErrors.length > 0) {
                validationMessages.push(`Dữ liệu doanh nghiệp bị trùng: ${duplicateErrors.join(' | ')}`);
            }

            if (representativeErrors.length > 0) {
                validationMessages.push(`Thông tin tài khoản đại diện bị trùng: ${representativeErrors.join(' | ')}`);
            }

            if (validationMessages.length > 0) {
                status = 'invalid';
                message = `Không hợp lệ - ${validationMessages.join(' || ')}`;
            }
        } catch (error) {
            console.error('Preview import company error:', error);
            status = 'error';
            message = `Lỗi hệ thống: ${error.message}`;
        }

        results.push({
            company_name: companyData.company_name || '(Không có tên doanh nghiệp)',
            status,
            message,
            zone_name_normalized: zoneName,
            ...companyData
        });
    }

    res.json({
        message: 'Kiểm tra dữ liệu hoàn tất',
        total: results.length,
        summary: {
            valid_with_user: results.filter((item) => item.status === 'valid_with_user').length,
            valid_without_user: 0,
            invalid: results.filter((item) => item.status === 'invalid').length,
            error: results.filter((item) => item.status === 'error').length,
        },
        results
    });
};
const addLicense = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    let uploadedFileUrl = null;
    try {
        const { company_id } = req.params;
        const userId = req.user.user_id;
        const payload = parseMultipartPayload(req);

        // CHỈ CHO CHÍNH CÔNG TY ĐÓ HOẶC ADMIN/MANAGER THÊM GIẤY PHÉP
        if (req.user.role === 'company' && req.user.company_id !== company_id) {
            return res.status(403).json({ error: 'Bạn chỉ có thể thêm giấy phép cho công ty của mình' });
        }

        const licenseData = {
            license_id: payload.license_id?.trim(),
            license_name: payload.license_name?.trim(),
            issuing_authority: payload.issuing_authority?.trim(),
            issue_date: payload.issue_date,
            expiry_date: payload.expiry_date,
            file_url: payload.file_url?.trim() || null,
        };

        if (req.file) {
            uploadedFileUrl = await uploadOrReuseAttachment(req.file.path, {
                folder: CLOUDINARY_FOLDERS.companyLicenses,
                resource_type: req.file.mimetype?.startsWith('image/') ? 'image' : 'raw',
                mime_type: req.file.mimetype,
                original_filename: req.file.originalname,
            });
            licenseData.file_url = uploadedFileUrl;
        }

        if (!licenseData.license_id?.trim()) throw new Error('Mã giấy phép là bắt buộc');
        if (!licenseData.license_name?.trim()) throw new Error('Tên giấy phép là bắt buộc');
        if (!licenseData.issuing_authority?.trim()) throw new Error('Nơi cấp là bắt buộc');
        if (!licenseData.issue_date) throw new Error('Ngày cấp là bắt buộc');
        if (!licenseData.expiry_date) throw new Error('Ngày hết hạn là bắt buộc');


        const updatedCompany = await companyService.addLicense(company_id, licenseData, userId, session);

        await session.commitTransaction();
        const newLicense = updatedCompany.licenses.find(l => l.license_id === licenseData.license_id);

        res.status(201).json({
            message: 'Thêm giấy phép thành công',
            license: newLicense
        });
    } catch (error) {
        await session.abortTransaction();
        if (uploadedFileUrl) {
            await destroyUnusedCloudinaryUrls([uploadedFileUrl]);
        }
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

const updateLicense = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    let uploadedFileUrl = null;
    try {
        const { company_id } = req.params;
        const { license_id } = req.query;
        const userId = req.user.user_id;
        const payload = parseMultipartPayload(req);
        const existingCompany = await companyRepository.getCompanyById(company_id, session);
        const existingLicense = existingCompany?.licenses?.find((item) => item.license_id === license_id);

        if (req.user.role === 'company' && req.user.company_id !== company_id) {
            return res.status(403).json({ error: 'Bạn chỉ có thể sửa giấy phép của công ty mình' });
        }

        const updateData = {
            license_name: payload.license_name?.trim(),
            issuing_authority: payload.issuing_authority?.trim(),
            issue_date: payload.issue_date,
            expiry_date: payload.expiry_date,
            file_url: payload.file_url?.trim() || null,
        };

        if (req.file) {
            uploadedFileUrl = await uploadOrReuseAttachment(req.file.path, {
                folder: CLOUDINARY_FOLDERS.companyLicenses,
                resource_type: req.file.mimetype?.startsWith('image/') ? 'image' : 'raw',
                mime_type: req.file.mimetype,
                original_filename: req.file.originalname,
            });
            updateData.file_url = uploadedFileUrl;
        } else if (payload.keep_existing_file && existingLicense?.file_url) {
            updateData.file_url = existingLicense.file_url;
        }

        if (!updateData.license_name?.trim()) throw new Error('Tên giấy phép là bắt buộc');
        if (!updateData.issuing_authority?.trim()) throw new Error('Nơi cấp là bắt buộc');
        if (!updateData.issue_date) throw new Error('Ngày cấp là bắt buộc');
        if (!updateData.expiry_date) throw new Error('Ngày hết hạn là bắt buộc');

        const updatedCompany = await companyService.updateLicense(company_id, license_id, updateData, userId, session);

        await session.commitTransaction();
        const updatedLicense = updatedCompany.licenses.find(l => l.license_id === license_id);

        if (existingLicense?.file_url && existingLicense.file_url !== updatedLicense?.file_url) {
            await destroyUnusedCloudinaryUrls([existingLicense.file_url]);
        }

        res.json({
            message: 'Cập nhật giấy phép thành công',
            license: updatedLicense
        });
    } catch (error) {
        await session.abortTransaction();
        if (uploadedFileUrl) {
            await destroyUnusedCloudinaryUrls([uploadedFileUrl]);
        }
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

const deleteLicense = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { company_id } = req.params;
        const { license_id } = req.query;
        const userId = req.user.user_id;
        const existingCompany = await companyRepository.getCompanyById(company_id, session);
        const existingLicense = existingCompany?.licenses?.find((item) => item.license_id === license_id);

        if (req.user.role === 'company' && req.user.company_id !== company_id) {
            return res.status(403).json({ error: 'Bạn chỉ có thể xóa giấy phép của công ty mình' });
        }

        await companyService.deleteLicense(company_id, license_id, userId, session);

        await session.commitTransaction();
        if (existingLicense?.file_url) {
            await destroyUnusedCloudinaryUrls([existingLicense.file_url]);
        }
        res.json({ message: 'Xóa giấy phép thành công' });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

const getLicense = async (req, res) => {
    try {
        const { company_id } = req.params;
        const { license_id } = req.query;

        // Cho phép admin, manager, company xem giấy phép của mọi công ty (Option 1)

        const license = await companyService.getLicense(company_id, license_id);
        res.json({ license });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

const deleteMultipleLicenses = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { company_id } = req.params;
        const { license_ids } = req.body; // mảng string
        const userId = req.user.user_id;
        const existingCompany = await companyRepository.getCompanyById(company_id, session);
        const deletedLicenseUrls = (existingCompany?.licenses || [])
            .filter((item) => license_ids?.includes(item.license_id))
            .map((item) => item.file_url)
            .filter(Boolean);

        if (!Array.isArray(license_ids) || license_ids.length === 0) {
            return res.status(400).json({ error: 'license_ids phải là mảng không rỗng' });
        }

        if (req.user.role === 'company' && req.user.company_id !== company_id) {
            return res.status(403).json({ error: 'Bạn chỉ có thể xóa giấy phép của công ty mình' });
        }

        await companyService.deleteMultipleLicenses(company_id, license_ids, userId, session);

        await session.commitTransaction();
        if (deletedLicenseUrls.length > 0) {
            await destroyUnusedCloudinaryUrls(deletedLicenseUrls);
        }
        res.json({
            message: `Đã xóa thành công ${license_ids.length} giấy phép`,
            deleted_count: license_ids.length
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
};

module.exports = {
    lookupTaxCode,
    getCompany,
    addCompanyFromFile,
    getAllCompaniesAsConditions,
    getManagedCompanies,
    deleteCompanyById,
    restoreCompany,
    deleteAllCompany,
    updateCompany,
    setRepresentativeUser,
    addSingleCompany,
    deleteCompaniesByIds,
    restoreCompanies,
    getDeletedCompanies,
    hardDeleteCompany,
    hardDeleteCompanies,
    previewSoftDelete,
    previewHardDelete,
    previewImportCompanies,
    addLicense,
    updateLicense,
    deleteLicense,
    getLicense,
    deleteMultipleLicenses
};
