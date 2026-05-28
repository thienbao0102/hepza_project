const industrialZoneService = require('../services/industrialZoneService');
const companyRepository = require('../dataAccess/companyRepository');
const { VersionConflictError, MissingVersionError, StateConflictError } = require('../utils/conflictError');
const userRepository = require('../dataAccess/userRepository');
const counterRepository = require('../dataAccess/counterRepository');
const industryRepository = require('../dataAccess/industryRepository');
const Company = require('../models/companyModel');
const bussinessSymbiosisRepository = require('../dataAccess/businessSymbiosisRepository');
const resoureceAndWasteRepository = require('../dataAccess/resoureceAndWasteRepository');
const exportHistoryRepository = require('../dataAccess/exportHistoryRepository');
const resourceVersionRepository = require('../dataAccess/resourceVersionRepository');
const emissionRepository = require('../dataAccess/emissionRepository');
const summaryRecordRepository = require('../dataAccess/summaryRecordRepository');
const { verifyPassword } = require('../utils/passwordHasher');
const { collectCompanyCloudinaryUrls } = require('../utils/companyCloudinaryCollector');
const { destroyUnusedCloudinaryUrls } = require('../utils/cloudinaryReferenceTracker');

const normalizeToArray = (value) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim() === '') return undefined;
    if (typeof value === 'string') return [value];
    return [value];
};

const normalizeStringArray = (value) => {
    return [...new Set((normalizeToArray(value) || [])
        .map((item) => {
            const s = String(item).trim();
            // Nếu có định dạng "Mã - Tên", ưu tiên lấy mã (phần trước dấu -)
            if (s.includes(' - ')) {
                const parts = s.split(' - ');
                if (parts[0].trim()) return parts[0].trim();
            }
            return s;
        })
        .filter(Boolean))];
};

const normalizeOptionalText = (value) => {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim();
    return normalized === '' ? undefined : normalized;
};

const buildStateConflictMessage = (entityLabel, actionLabel) => (
    `${entityLabel} này đã được người khác thay đổi trạng thái trước khi ${actionLabel}. Vui lòng tải lại danh sách rồi thử lại.`
);

const normalizeIndustrySelection = async (industryValue, industryGroupValue) => {
    const rawIndustryIdsOrNames = normalizeStringArray(industryValue);
    const rawIndustryGroupIdsOrNames = normalizeStringArray(industryGroupValue);

    if (rawIndustryIdsOrNames.length === 0) {
        throw new Error('industry is required');
    }

    const [industryDocs, industryGroupDocs] = await Promise.all([
        industryRepository.getIndustriesByIdsOrNames(rawIndustryIdsOrNames),
        industryRepository.getIndustryGroupsByIdsOrNames(rawIndustryGroupIdsOrNames),
    ]);

    const industryIdByAnyValue = new Map();
    industryDocs.forEach((industry) => {
        if (industry?.industry_id) industryIdByAnyValue.set(industry.industry_id, industry.industry_id);
        if (industry?.industry_name) industryIdByAnyValue.set(industry.industry_name, industry.industry_id);
    });

    const groupIdByAnyValue = new Map();
    industryGroupDocs.forEach((group) => {
        if (group?.group_id) groupIdByAnyValue.set(group.group_id, group.group_id);
        if (group?.group_name) groupIdByAnyValue.set(group.group_name, group.group_id);
    });

    const normalizedIndustryIds = rawIndustryIdsOrNames
        .map((value) => industryIdByAnyValue.get(value))
        .filter(Boolean);

    if (normalizedIndustryIds.length !== rawIndustryIdsOrNames.length) {
        throw new Error('Một hoặc nhiều ngành nghề không hợp lệ');
    }

    const normalizedIndustryGroupIds = rawIndustryGroupIdsOrNames
        .map((value) => groupIdByAnyValue.get(value))
        .filter(Boolean);

    if (normalizedIndustryGroupIds.length !== rawIndustryGroupIdsOrNames.length) {
        throw new Error('Một hoặc nhiều nhóm ngành không hợp lệ');
    }

    const derivedGroupIds = [...new Set(industryDocs
        .filter((industry) => normalizedIndustryIds.includes(industry.industry_id))
        .map((industry) => industry.group_id)
        .filter(Boolean))];

    const finalIndustryGroupIds = [...new Set([...normalizedIndustryGroupIds, ...derivedGroupIds])];

    if (finalIndustryGroupIds.length === 0) {
        throw new Error('industry_group is required');
    }

    return {
        industry: normalizedIndustryIds,
        industry_group: finalIndustryGroupIds,
    };
};

const getCompanyById = async (company_id, userRole, userZoneId, userCompanyId) => {
    const company = await companyRepository.getCompanyById(company_id);
    if (!company) throw new Error('Company not found');

    if (userRole === 'manager' && company.zone_id?.toString() !== userZoneId?.toString()) {
        throw new Error('Access denied: Company does not belong to your managed zone');
    }

    if (userRole === 'company' && company.company_id.toString() !== userCompanyId.toString()) {
        throw new Error('Access denied: You can only view your own company details');
    }

    return company;
};

const addCompany = async (companyData, zone_id, userId, session = null) => {
    try {
        // Normalize MST: nếu không có hoặc rỗng → báo lỗi
        if (!companyData.company_registration_number ||
            companyData.company_registration_number === 'null' ||
            companyData.company_registration_number === 'undefined' ||
            companyData.company_registration_number.trim() === '') {
            throw new Error('Mã số thuế (MST) là bắt buộc. Vui lòng nhập 10 chữ số (VD: 0312345678).');
        }

        // Validate format MST nếu có giá trị
        if (companyData.company_registration_number) {
            const mst = companyData.company_registration_number.trim();
            if (!/^\d{10}(-\d{3})?$/.test(mst)) {
                throw new Error(`Mã số thuế "${mst}" không đúng định dạng. Vui lòng nhập 10 chữ số (VD: 0312345678) hoặc 13 chữ số cho chi nhánh (VD: 0312345678-001).`);
            }
            companyData.company_registration_number = mst;
        }

        // 1. Check trùng MST (kể cả soft delete)
        if (companyData.company_registration_number) {
            const existingRegistrationNumber = await companyRepository.findOne({ company_registration_number: companyData.company_registration_number }, session);
            if (existingRegistrationNumber) {
                const inputMst = companyData.company_registration_number;
                if (existingRegistrationNumber.deleted_at) {
                    throw new Error(`Mã số thuế "${inputMst}" đã tồn tại (đang bị vô hiệu hóa). Vui lòng khôi phục doanh nghiệp cũ thay vì tạo mới.`);
                }
                // Gợi ý chi nhánh nếu MST chỉ có 10 số
                if (inputMst.length === 10) {
                    throw new Error(`Mã số thuế "${inputMst}" (Công ty chính) đã tồn tại trên hệ thống. Nếu bạn đang thêm chi nhánh, vui lòng nhập đủ 13 chữ số (VD: ${inputMst}-001).`);
                }
                throw new Error(`Mã số thuế chi nhánh "${inputMst}" đã tồn tại trên hệ thống. Vui lòng kiểm tra lại.`);
            }
        }

        // 2. Nếu pass bước trên => tạo mới
        const normalizedIndustrySelection = await normalizeIndustrySelection(
            companyData.industry,
            companyData.industry_group
        );

        const companyDataToSave = {
            company_name: companyData.company_name,
            company_registration_number: companyData.company_registration_number,
            website: companyData.website?.trim(),
            address: normalizeOptionalText(companyData.address),
            company_type: companyData.company_type,
            zone_id: zone_id,
            industry: normalizedIndustrySelection.industry,
            industry_group: normalizedIndustrySelection.industry_group,
            total_workers: companyData.total_workers,
            revenue: companyData.revenue === 'null' ? null : companyData.revenue,
            revenue_currency: companyData.revenue_currency === 'null' ? null : companyData.revenue_currency,
            market: companyData.market,
            founded_year: companyData.founded_year,
            status: companyData.status,
            licenses: [],
            created_by: userId,
            updated_by: userId,
        };

        const company = await companyRepository.createCompany(companyDataToSave, session);

        console.log(`✅ Company ${company.company_name} created with company_id: ${company.company_id}`);
        return company.company_id;
    } catch (error) {
        console.error('Error in addCompany:', error);
        throw error;
    }
};

const getAllCompanies = async (page, limit, filterParams, search, user, sort = {}) => {
    try {
        let queryLimit = Number(limit) || 10;
        let skip = (Number(page) - 1) * queryLimit;

        const query = await initQuery(filterParams, search);
        query.deleted_at = null;

        if (user && user.isStrictMode && user.role === 'manager') {
            query.zone_id = user.zone_id;
        }

        const aggregationResult = await companyRepository.getAllCompanies(query, skip, queryLimit, sort);
        const [result = { metadata: [], data: [] }] = aggregationResult;
        const totalItems = result.metadata?.[0]?.total ?? result.data?.length ?? 0;
        const totalPages = queryLimit > 0 ? Math.ceil(totalItems / queryLimit) : 0;

        return {
            companies: result.data || [],
            totalPages,
            totalItems,
        };
    } catch (error) {
        if (error.message === 'Zone not found') {
            return {
                companies: [],
                totalPages: 0,
                totalItems: 0,
            };
        }
        throw error;
    }
};

const deleteCompanyById = async (company_id, currentUser, providedSession = null) => {
    const session = providedSession || (await Company.startSession());
    const isOwnedSession = !providedSession;

    try {
        const execute = async (sess) => {
            const company = await companyRepository.getCompanyById(company_id, sess);
            if (!company || company.deleted_at) {
                throw new StateConflictError(buildStateConflictMessage('Doanh nghiệp', 'vô hiệu hóa'));
            }

            if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
                throw new Error('You do not have permission to delete companies');
            }
            if (currentUser.role === 'manager' && company.zone_id !== currentUser.zone_id) {
                throw new Error('Forbidden: You can only delete companies in your managed zone');
            }

            // Soft-delete chính company
            await companyRepository.deleteCompanyById(company_id, currentUser.user_id, sess);

            // Soft-delete users thuộc company
            const linkedUsers = await userRepository.find({ company_id, deleted_at: null }, sess);
            if (linkedUsers.length > 0) {
                const userIds = linkedUsers.map(u => u.user_id);
                await userRepository.updateMany(
                    { user_id: { $in: userIds } },
                    { deleted_at: new Date(), deleted_by: currentUser.user_id },
                    sess
                );
            }

            // ── Soft-delete tất cả dữ liệu liên quan ────────────────
            await bussinessSymbiosisRepository.softDeleteBusinessSymbiosisByCompanyId(company_id, sess);           // buy/sell
            await resoureceAndWasteRepository.deleteSoftResourceAndWaste(company_id, sess);                      // resource, waste, fuel
            await exportHistoryRepository.deleteSoftExportHistory(company_id, sess);
            await resourceVersionRepository.deleteSoftResourceVersionsByCompanyId(company_id, sess);
            await emissionRepository.deleteSoftEmission(company_id, sess);
            await summaryRecordRepository.deleteSoftSummaryRecords(company_id, sess);
        };

        if (isOwnedSession) {
            await session.withTransaction(async () => {
                await execute(session);
            });
        } else {
            await execute(session);
        }

        return { message: 'Company and all related data soft-deleted successfully' };
    } catch (error) {
        throw error;
    } finally {
        if (isOwnedSession) {
            session.endSession();
        }
    }
};

const deleteCompaniesByIds = async (companyIds, currentUser, providedSession = null) => {
    const session = providedSession || (await Company.startSession());
    const isOwnedSession = !providedSession;

    try {
        const execute = async (sess) => {
            const validCompanyIds = [];

            for (const company_id of companyIds) {
                const company = await companyRepository.getCompanyById(company_id, sess);
                if (!company || company.deleted_at) {
                    console.warn(`Company ${company_id} not found or already deleted → skipped`);
                    continue;
                }

                if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
                    throw new Error('You do not have permission to delete companies');
                }
                if (currentUser.role === 'manager' && company.zone_id !== currentUser.zone_id) {
                    console.warn(`Company ${company_id} belongs to another zone → skipped`);
                    continue;
                }

                await companyRepository.deleteCompanyById(company_id, currentUser.user_id, sess);
                validCompanyIds.push(company_id);
            }

            if (validCompanyIds.length === 0) {
                throw new StateConflictError('Một hoặc nhiều doanh nghiệp đã thay đổi trạng thái trước khi vô hiệu hóa. Vui lòng tải lại danh sách rồi thử lại.');
            }

            // Soft-delete users cho tất cả company hợp lệ
            await userRepository.updateMany(
                { company_id: { $in: validCompanyIds }, deleted_at: null },
                { deleted_at: new Date(), deleted_by: currentUser.user_id },
                sess
            );

            // ── Soft-delete dữ liệu liên quan cho tất cả company ──
            for (const company_id of validCompanyIds) {
                await bussinessSymbiosisRepository.softDeleteBusinessSymbiosisByCompanyId(company_id, sess);           // buy/sell
                await resoureceAndWasteRepository.deleteSoftResourceAndWaste(company_id, sess);                      // resource, waste, fuel
                await exportHistoryRepository.deleteSoftExportHistory(company_id, sess);
                await resourceVersionRepository.deleteSoftResourceVersionsByCompanyId(company_id, sess);
                await emissionRepository.deleteSoftEmission(company_id, sess);
                await summaryRecordRepository.deleteSoftSummaryRecords(company_id, sess);
            }
        };

        if (isOwnedSession) {
            await session.withTransaction(async () => await execute(session));
        } else {
            await execute(session);
        }

        return { message: `${companyIds.length} companies (and related data) soft-deleted` };
    } catch (error) {
        throw error;
    } finally {
        if (isOwnedSession) session.endSession();
    }
};

const restoreCompany = async (company_id, currentUser, providedSession = null) => {
    const session = providedSession || (await Company.startSession());
    const isOwnedSession = !providedSession;

    try {
        const execute = async (sess) => {
            if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
                throw new Error('Only admin and manager can restore company');
            }

            // Kiểm tra company đã soft-delete
            const company = await companyRepository.findOne(
                { company_id, deleted_at: { $ne: null } },
                null,
                sess
            );
            if (!company) {
                throw new StateConflictError(buildStateConflictMessage('Doanh nghiệp', 'khôi phục'));
            }

            if (currentUser.role === 'manager' && company.zone_id !== currentUser.zone_id) {
                throw new Error('Forbidden: You can only restore companies in your managed zone');
            }

            // Quan trọng: kiểm tra company_id có bị tái sử dụng bởi bản active khác không
            const activeCompany = await companyRepository.findOne(
                { company_id, deleted_at: null },
                null,
                sess
            );
            if (activeCompany) {
                throw new StateConflictError('Không thể khôi phục vì mã doanh nghiệp đã được một bản ghi đang hoạt động sử dụng lại. Vui lòng tải lại dữ liệu.');
            }

            // Khôi phục company
            await companyRepository.restoreCompany(company_id, sess);

            // Khôi phục users thuộc company này (đã soft-delete)
            await userRepository.updateMany(
                { company_id, deleted_at: { $ne: null } },
                { $unset: { deleted_at: 1, deleted_by: 1 } },
                sess
            );

            // ── Khôi phục tất cả dữ liệu liên quan ───────────────────────────────
            await bussinessSymbiosisRepository.restoreBusinessSymbiosisByCompanyId(company_id, sess);
            await resoureceAndWasteRepository.restoreResourceAndWaste(company_id, sess);
            await exportHistoryRepository.restoreExportHistory(company_id, sess);
            await resourceVersionRepository.restoreResourceVersionsByCompanyId(company_id, sess);
            await emissionRepository.restoreEmission(company_id, sess);
            await summaryRecordRepository.restoreSummaryRecords(company_id, sess);

            // Nếu sau này có thêm bảng nào soft-delete theo company → thêm vào đây
        };

        if (isOwnedSession) {
            await session.withTransaction(async () => {
                await execute(session);
            });
        } else {
            await execute(session);
        }

        const restored = await companyRepository.getCompanyById(company_id);
        return {
            message: 'Company and all related data restored successfully',
            company: restored
        };
    } catch (error) {
        throw error;
    } finally {
        if (isOwnedSession) {
            session.endSession();
        }
    }
};

const restoreCompanies = async (companyIds, currentUser, providedSession = null) => {
    const session = providedSession || (await Company.startSession());
    const isOwnedSession = !providedSession;

    try {
        const execute = async (sess) => {
            if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
                throw new Error('Only admin and manager can restore companies');
            }

            const restoredCompanyIds = [];
            const skipped = [];

            for (const company_id of companyIds) {
                // Kiểm tra company đã soft-delete
                const company = await companyRepository.findOne(
                    { company_id, deleted_at: { $ne: null } },
                    null,
                    sess
                );
                if (!company) {
                    skipped.push({ company_id, reason: 'not found or not soft-deleted' });
                    continue;
                }

                if (currentUser.role === 'manager' && company.zone_id !== currentUser.zone_id) {
                    skipped.push({ company_id, reason: 'company belongs to another zone' });
                    continue;
                }

                // Kiểm tra trùng company_id active
                const activeCompany = await companyRepository.findOne(
                    { company_id, deleted_at: null },
                    null,
                    sess
                );
                if (activeCompany) {
                    skipped.push({ company_id, reason: 'company_id reused by active company' });
                    continue;
                }

                // Thực hiện khôi phục
                await companyRepository.restoreCompany(company_id, sess);

                // Khôi phục users
                await userRepository.updateMany(
                    { company_id, deleted_at: { $ne: null } },
                    { $unset: { deleted_at: 1, deleted_by: 1 } },
                    sess
                );

                // Khôi phục dữ liệu liên quan
                await bussinessSymbiosisRepository.restoreBusinessSymbiosisByCompanyId(company_id, sess);
                await resoureceAndWasteRepository.restoreResourceAndWaste(company_id, sess);
                await exportHistoryRepository.restoreExportHistory(company_id, sess);
                await resourceVersionRepository.restoreResourceVersionsByCompanyId(company_id, sess);
                await emissionRepository.restoreEmission(company_id, sess);
                await summaryRecordRepository.restoreSummaryRecords(company_id, sess);

                restoredCompanyIds.push(company_id);
            }

            if (restoredCompanyIds.length === 0) {
                throw new StateConflictError('Không có doanh nghiệp nào còn hợp lệ để khôi phục. Danh sách có thể đã được người khác xử lý trước đó.');
            }

            return {
                restored: restoredCompanyIds.length,
                skipped: skipped.length > 0 ? skipped : undefined,
                message: `Restored ${restoredCompanyIds.length} companies and all related data`
            };
        };

        let result;

        if (isOwnedSession) {
            await session.withTransaction(async () => {
                result = await execute(session);
            });
        } else {
            result = await execute(session);
        }

        return result;
    } catch (error) {
        throw error;
    } finally {
        if (isOwnedSession) {
            session.endSession();
        }
    }
};

const getDeletedCompanies = async (page, limit, filterParams, search, user, sort = {}) => {
    try {
        const skip = (page - 1) * limit;
        const query = await initQuery(filterParams, search);
        query.deleted_at = { $ne: null };

        if (user && user.isStrictMode && user.role === 'manager') {
            query.zone_id = user.zone_id;
        }

        const companies = await companyRepository.getDeletedCompanies(query, skip, limit, sort);
        const totalItems = companies[0].metadata[0]?.total || 0;
        const totalPages = Math.ceil(totalItems / limit);

        return {
            deletedCompanies: companies[0].data,
            totalPages,
            totalItems,
            currentPage: Number(page),
        };
    } catch (error) {
        if (error.message === 'Zone not found') {
            return {
                deletedCompanies: [],
                totalPages: 0,
                totalItems: 0,
                currentPage: Number(page),
            };
        }
        console.error('Error in getDeletedCompanies service:', error);
        throw error;
    }
};

const deleteAllCompany = async (currentUser) => {
    const session = await Company.startSession();
    session.startTransaction();

    try {
        if (currentUser.role !== 'admin') {
            throw new Error('Only admin can delete all companies');
        }

        const companies = await companyRepository.getAllCompanies(true);
        const companyIds = companies.map(c => c.company_id);

        await companyRepository.deleteAllCompanies(session);

        const linkedUsers = await userRepository.find({ company_id: { $in: companyIds }, deleted_at: null }, session);
        if (linkedUsers.length > 0) {
            const userIds = linkedUsers.map(user => user.user_id);
            await userRepository.deleteMany({ user_id: { $in: userIds } }, { session });
        }

        const companyCounters = companies.map(c => `company_${c.zone_id || 'UNASSIGNED'}`);
        const uniqueCompanyCounters = [...new Set(companyCounters)];
        await Promise.all(uniqueCompanyCounters.map(counterName =>
            counterRepository.findOneAndUpdate(
                { _id: counterName },
                { $set: { sequence_value: 0 } },
                { session, upsert: true }
            )
        ));

        await counterRepository.findOneAndUpdate(
            { _id: 'company_user' },
            { $set: { sequence_value: 0 } },
            { session, upsert: true }
        );

        await session.commitTransaction();
        return { message: 'All companies, linked users, and counters reset successfully' };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const updateCompany = async (company_id, updateData, role, userDetails, session) => {
    const company = await companyRepository.getCompanyById(company_id);
    if (!company) throw new Error('Company not found');

    // Phân quyền
    if (role === 'company' && company.company_id !== userDetails.company_id) {
        throw new Error('Forbidden: Only the company itself can update its information');
    }
    if (role === 'manager' && (!userDetails.zone_id || company.zone_id?.toString() !== userDetails.zone_id?.toString())) {
        throw new Error('Forbidden');
    }

    // Validate + kiểm tra trùng MST
    if (updateData.company_registration_number) {
        const mst = updateData.company_registration_number.trim();
        if (!/^\d{10}(-\d{3})?$/.test(mst)) {
            throw new Error(`Mã số thuế "${mst}" không đúng định dạng. Vui lòng nhập 10 chữ số (VD: 0312345678) hoặc 13 chữ số cho chi nhánh (VD: 0312345678-001).`);
        }
        updateData.company_registration_number = mst;

        const existing = await companyRepository.findOne({
            company_registration_number: mst,
            company_id: { $ne: company_id }
        }, session);
        if (existing) {
            if (mst.length === 10) {
                throw new Error(`Mã số thuế "${mst}" (Công ty chính) đã tồn tại. Nếu là chi nhánh, vui lòng nhập đủ 13 chữ số (VD: ${mst}-001).`);
            }
            throw new Error(`Mã số thuế chi nhánh "${mst}" đã tồn tại trên hệ thống.`);
        }
    }

    if (updateData.address?.trim()) {
        const existing = await companyRepository.findOne({
            address: updateData.address.trim(),
            company_id: { $ne: company_id }
        }, session);
        if (existing) throw new Error('Địa chỉ đã được sử dụng bởi công ty khác');
    }

    if (updateData.industry !== undefined || updateData.industry_group !== undefined) {
        const normalizedIndustrySelection = await normalizeIndustrySelection(
            updateData.industry !== undefined ? updateData.industry : company.industry,
            updateData.industry_group !== undefined ? updateData.industry_group : company.industry_group
        );
        updateData.industry = normalizedIndustrySelection.industry;
        updateData.industry_group = normalizedIndustrySelection.industry_group;
    }

    // DANH SÁCH TRẮNG – CHẶN MỌI THỨ CÒN LẠI
    const allowedFields = [
        'company_name', 'company_registration_number', 'website', 'address', 'company_type',
        'industry', 'industry_group', 'total_workers', 'revenue',
        'revenue_currency', 'market', 'founded_year', 'status'
    ];

    const filteredData = {};
    allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
            filteredData[field] = updateData[field];
        }
    });

    if (Object.keys(filteredData).length === 0) {
        throw new Error('Không có trường nào hợp lệ để cập nhật');
    }

    filteredData.updated_by = userDetails.user_id;

    // ── Optimistic Locking ──────────────────────────────────────────
    // Require the client version for optimistic locking and reject stale writes with 409.
    const clientVersion = updateData.__v;
    let updatedCompany;

    if (clientVersion === undefined || clientVersion === null) {
        throw new MissingVersionError();
    }

    updatedCompany = await companyRepository.updateCompanyWithVersion(
        company_id, clientVersion, filteredData, userDetails.user_id, session
    );
    if (!updatedCompany) {
        throw new VersionConflictError();
    }

    // ── Real-time sync via Socket.IO ────────────────────────────────
    try {
        const { getIo } = require('../config/socket'); // lazy-require to avoid circular dependency
        const io = getIo();
        if (io) {
            io.emit('company:updated', {
                company_id,
                __v: updatedCompany.__v,
                updated_by: userDetails.user_id
            });
        }
    } catch (_) { /* Socket emit is best-effort, never block the response */ }

    return updatedCompany;
};

const setRepresentativeUser = async (company_id, representative_user_id, currentUser, current_password = '', session = null) => {
    const company = await companyRepository.getCompanyById(company_id, session);
    if (!company) throw new Error('Company not found');
    if (!representative_user_id) throw new Error('representative_user_id is required');

    if (!['admin', 'manager', 'company'].includes(currentUser.role)) {
        throw new Error('You do not have permission to change representative user');
    }

    if (currentUser.role === 'manager' && company.zone_id?.toString() !== currentUser.zone_id?.toString()) {
        throw new Error('Forbidden');
    }

    if (currentUser.role === 'company') {
        if (company.company_id?.toString() !== currentUser.company_id?.toString()) {
            throw new Error('Forbidden');
        }

        if (company.representative_user_id?.toString() !== currentUser.user_id?.toString()) {
            throw new Error('Chỉ người đại diện hiện tại mới có thể nhượng quyền đại diện');
        }
    }

    if (currentUser.role === 'company') {
        if (!current_password || !String(current_password).trim()) {
            throw new Error('Vui lòng nhập mật khẩu hiện tại để xác nhận nhượng quyền');
        }

        const currentUserDoc = await userRepository.findByUserId(currentUser.user_id);
        if (!currentUserDoc?.password) {
            throw new Error('Không thể xác thực tài khoản hiện tại');
        }

        const isPasswordValid = await verifyPassword(String(current_password), currentUserDoc.password);
        if (!isPasswordValid) {
            throw new Error('Mật khẩu hiện tại không chính xác');
        }
    }

    const targetUser = await userRepository.findByUserId(representative_user_id);
    if (!targetUser) {
        throw new Error('Representative user not found or has been deactivated');
    }

    if (targetUser.role !== 'company') {
        throw new Error('Representative user must be a company account');
    }

    if (targetUser.company_id?.toString() !== company_id?.toString()) {
        throw new Error('Representative user must belong to the same company');
    }

    await companyRepository.setRepresentativeUser(company_id, representative_user_id, session);
    return await companyRepository.getCompanyById(company_id, session);
};

//Check which zone the business belongs to
const checkCompanyBelongToZone = async (company_id, zone_id) => {
    return companyRepository.findExists(company_id, zone_id);
}

//handler query
const initQuery = async (filterParams = {}, search) => {
    const query = {};

    const ranges = {
        'Dưới 50 công nhân': { $lt: 50 },
        '50–200 công nhân': { $gte: 50, $lte: 200 },
        '201–500 công nhân': { $gte: 201, $lte: 500 },
        'Trên 500 công nhân': { $gt: 500 }
    };

    const foundedYearRanges = {
        'Trước 2000': { $lt: 2000 },
        '2000–2010': { $gte: 2000, $lte: 2010 },
        '2011–2020': { $gte: 2011, $lte: 2020 },
        'Sau 2020': { $gt: 2020 }
    };

    const isNotEmpty = (v) => {
        if (v === undefined || v === null) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'string') return v.trim() !== '';
        return true;
    };

    // Search by company name
    if (isNotEmpty(search)) {
        query.company_name = { $regex: search, $options: 'i' };
    }

    // Zone ID filter (direct)
    if (isNotEmpty(filterParams.zone_id)) {
        if (Array.isArray(filterParams.zone_id)) {
            query.zone_id = { $in: filterParams.zone_id };
        } else {
            query.zone_id = filterParams.zone_id;
        }
    }

    // Zone Name filter -> convert to zone_id(s)
    if (isNotEmpty(filterParams.zone_name)) {
        if (Array.isArray(filterParams.zone_name)) {
            const zoneIds = await Promise.all(
                filterParams.zone_name.map((name) =>
                    industrialZoneService.getZoneIdByName(name)
                )
            );
            const zoneIdsFiltered = zoneIds.filter(Boolean);
            if (zoneIdsFiltered.length > 0) {
                query.zone_id = { $in: zoneIdsFiltered };
            }
        } else {
            const zone_id = await industrialZoneService.getZoneIdByName(
                filterParams.zone_name
            );
            if (zone_id) query.zone_id = zone_id;
        }
    }

    if (filterParams.unassigned_only === true || filterParams.unassigned_only === 'true') {
        const unassignedConditions = [
            { representative_user_id: null },
            { representative_user_id: { $exists: false } },
            { representative_user_id: "" },
            { user_ids: { $exists: false } },
            { user_ids: { $size: 0 } }
        ];

        if (filterParams.include_company_id) {
            query.$or = [
                ...unassignedConditions,
                { company_id: filterParams.include_company_id }
            ];
        } else {
            query.$or = unassignedConditions;
        }
    }

    // Simple equality / $in filters
    const multiFields = ['company_type', 'market', 'status'];
    multiFields.forEach((f) => {
        if (isNotEmpty(filterParams[f])) {
            query[f] = Array.isArray(filterParams[f]) ? { $in: filterParams[f] } : filterParams[f];
        }
    });

    // Special handling for industry and industry_group to resolve names/codes to IDs
    if (isNotEmpty(filterParams.industry) || isNotEmpty(filterParams.industry_group)) {
        try {
            const normalized = await normalizeIndustrySelection(
                filterParams.industry,
                filterParams.industry_group
            );
            if (isNotEmpty(filterParams.industry)) {
                query.industry = { $in: normalized.industry };
            }
            if (isNotEmpty(filterParams.industry_group)) {
                query.industry_group = { $in: normalized.industry_group };
            }
        } catch (error) {
            console.warn('Failed to normalize industry filter params:', error.message);
            // Fallback to direct match if normalization fails
            if (isNotEmpty(filterParams.industry)) {
                query.industry = Array.isArray(filterParams.industry) ? { $in: filterParams.industry } : filterParams.industry;
            }
            if (isNotEmpty(filterParams.industry_group)) {
                query.industry_group = Array.isArray(filterParams.industry_group) ? { $in: filterParams.industry_group } : filterParams.industry_group;
            }
        }
    }

    // Build range clauses as $and of per-field $or's
    const andClauses = [];

    // founded_year ranges
    if (isNotEmpty(filterParams.founded_year)) {
        if (Array.isArray(filterParams.founded_year)) {
            const clauses = filterParams.founded_year
                .map((label) => foundedYearRanges[label])
                .filter(Boolean)
                .map((range) => ({ founded_year: range }));
            if (clauses.length > 0) {
                andClauses.push({ $or: clauses });
            }
        } else {
            const range = foundedYearRanges[filterParams.founded_year];
            if (range) {
                // single range -> direct match
                query.founded_year = range;
            }
        }
    }

    // total_workers ranges
    if (isNotEmpty(filterParams.total_workers)) {
        if (Array.isArray(filterParams.total_workers)) {
            const clauses = filterParams.total_workers
                .map((label) => ranges[label])
                .filter(Boolean)
                .map((range) => ({ total_workers: range }));
            if (clauses.length > 0) {
                andClauses.push({ $or: clauses });
            }
        } else {
            const range = ranges[filterParams.total_workers];
            if (range) {
                query.total_workers = range;
            }
        }
    }

    // Nếu có andClauses, nối vào query (không ghi đè các trường hiện có)
    if (andClauses.length > 0) {
        // Nếu query đã có $and thì merge, else tạo mới
        query.$and = Array.isArray(query.$and) ? [...query.$and, ...andClauses] : andClauses;
    }

    return query;
};

const hardDeleteCompany = async (company_id, currentUser, providedSession = null) => {
    const session = providedSession || (await Company.startSession());
    const isOwnedSession = !providedSession;
    let collectedUrls = [];

    try {
        const execute = async (sess) => {
            if (currentUser.role !== 'admin' && currentUser.role !== 'manager') throw new Error('Only admin and manager can permanently delete companies');

            const company = await companyRepository.findOne(
                { company_id, deleted_at: { $ne: null } },
                null,
                sess
            );
            if (!company) {
                throw new StateConflictError(buildStateConflictMessage('Doanh nghiệp', 'xóa vĩnh viễn'));
            }
            if (currentUser.role === 'manager' && company.zone_id !== currentUser.zone_id) {
                throw new Error('Forbidden: You can only permanently delete companies in your managed zone');
            }

            // Thu thập Cloudinary URLs TRƯỚC khi xóa records
            collectedUrls = await collectCompanyCloudinaryUrls(company_id, sess);

            // Hard delete chính company
            await companyRepository.hardDeleteCompany(company_id, sess);

            // Hard delete users
            await userRepository.hardDeleteUsersByCompany(company_id, sess);

            // ── Hard-delete tất cả dữ liệu liên quan ────────────────
            await bussinessSymbiosisRepository.hardDeleteBusinessSymbiosisByCompanyId(company_id, sess);
            await resoureceAndWasteRepository.deleteHardResourceAndWaste(company_id, sess);
            await exportHistoryRepository.deleteHardExportHistory(company_id, sess);
            await resourceVersionRepository.deleteHardResourceVersionsByCompanyId(company_id, sess);
            await emissionRepository.deleteHardEmission(company_id, sess);
            await summaryRecordRepository.deleteHardSummaryRecords(company_id, sess);
        };

        if (isOwnedSession) {
            await session.withTransaction(async () => await execute(session));
        } else {
            await execute(session);
        }

        // Cleanup Cloudinary SAU khi transaction commit thành công (fire-and-forget)
        if (collectedUrls.length > 0) {
            destroyUnusedCloudinaryUrls(collectedUrls)
                .catch(err => console.warn('[hardDeleteCompany] Cloudinary cleanup failed (non-critical):', err.message));
        }

        return { message: 'Company and all related data permanently deleted' };
    } catch (error) {
        throw error;
    } finally {
        if (isOwnedSession) session.endSession();
    }
};

const hardDeleteCompanies = async (company_ids, currentUser, providedSession = null) => {
    const session = providedSession || (await Company.startSession());
    const isOwnedSession = !providedSession;
    let allCollectedUrls = [];

    try {
        const execute = async (sess) => {
            if (currentUser.role !== 'admin' && currentUser.role !== 'manager') throw new Error('Only admin and manager can permanently delete companies');

            const companies = await companyRepository.find(
                { company_id: { $in: company_ids }, deleted_at: { $ne: null } },
                null,
                sess
            );

            if (companies.length !== company_ids.length) {
                throw new StateConflictError('Một hoặc nhiều doanh nghiệp đã thay đổi trạng thái trước khi xóa vĩnh viễn. Vui lòng tải lại danh sách rồi thử lại.');
            }

            if (currentUser.role === 'manager') {
                for (const c of companies) {
                    if (c.zone_id !== currentUser.zone_id) {
                        throw new Error('Forbidden: You can only permanently delete companies in your managed zone');
                    }
                }
            }

            const validIds = companies.map(c => c.company_id);

            // Thu thập Cloudinary URLs TRƯỚC khi xóa records
            for (const company_id of validIds) {
                const urls = await collectCompanyCloudinaryUrls(company_id, sess);
                allCollectedUrls.push(...urls);
            }

            await companyRepository.hardDeleteCompanies(validIds, sess);
            await userRepository.hardDeleteUsersByCompanies(validIds, sess); // giả sử bạn có hàm bulk này

            // ── Hard delete dữ liệu liên quan ──
            for (const company_id of validIds) {
                await bussinessSymbiosisRepository.hardDeleteBusinessSymbiosisByCompanyId(company_id, sess);
                await resoureceAndWasteRepository.deleteHardResourceAndWaste(company_id, sess);
                await exportHistoryRepository.deleteHardExportHistory(company_id, sess);
                await resourceVersionRepository.deleteHardResourceVersionsByCompanyId(company_id, sess);
                await emissionRepository.deleteHardEmission(company_id, sess);
                await summaryRecordRepository.deleteHardSummaryRecords(company_id, sess);
            }
        };

        if (isOwnedSession) {
            await session.withTransaction(async () => await execute(session));
        } else {
            await execute(session);
        }

        // Cleanup Cloudinary SAU khi transaction commit thành công (fire-and-forget)
        allCollectedUrls = [...new Set(allCollectedUrls)];
        if (allCollectedUrls.length > 0) {
            destroyUnusedCloudinaryUrls(allCollectedUrls)
                .catch(err => console.warn('[hardDeleteCompanies] Cloudinary cleanup failed (non-critical):', err.message));
        }

        return { message: `${company_ids.length} companies and all related data permanently deleted` };
    } catch (error) {
        throw error;
    } finally {
        if (isOwnedSession) session.endSession();
    }
};

// Preview trước khi SOFT DELETE
const previewSoftDeleteCompanies = async (company_ids) => {
    return await companyRepository.getCompaniesWithAffectedUsers(company_ids, false); // false = lấy user còn sống
};

// Preview trước khi HARD DELETE
const previewHardDeleteCompanies = async (company_ids) => {
    return await companyRepository.getCompaniesWithAffectedUsers(company_ids, true); // true = lấy user đã soft delete
};

const addLicense = async (company_id, licenseData, userId, session) => {
    const company = await getCompanyById(company_id);
    if (!company) throw new Error('Công ty không tồn tại');

    // Kiểm tra trùng toàn cục (unique toàn collection)
    const existsGlobally = await Company.findOne({
        'licenses.license_id': licenseData.license_id
    });
    if (existsGlobally) {
        throw new Error(`Mã giấy phép "${licenseData.license_id}" đã được sử dụng`);
    }

    // Không cần kiểm tra trùng trong company vì globally đã bao quát
    // (nếu cùng company thì existsGlobally chính là company này)

    return await companyRepository.addLicenseToCompany(company_id, licenseData, userId, session);
};

const updateLicense = async (company_id, license_id, updateData, userId, session) => {
    const company = await getCompanyById(company_id);
    if (!company) throw new Error('Công ty không tồn tại');

    const license = company.licenses.find(l => l.license_id === license_id);
    if (!license) throw new Error('Giấy phép không tồn tại');

    return await companyRepository.updateLicenseInCompany(company_id, license_id, updateData, userId, session);
};

const deleteLicense = async (company_id, license_id, userId, session) => {
    const company = await getCompanyById(company_id);
    if (!company) throw new Error('Công ty không tồn tại');

    const exists = company.licenses.some(l => l.license_id === license_id);
    if (!exists) throw new Error('Giấy phép không tồn tại');

    return await companyRepository.deleteLicenseFromCompany(company_id, license_id, userId, session);
};

const getLicense = async (company_id, license_id) => {
    const license = await companyRepository.getLicenseById(company_id, license_id);
    if (!license) throw new Error('Giấy phép không tồn tại');
    return license;
};

const deleteMultipleLicenses = async (company_id, license_ids, userId, session) => {
    const company = await getCompanyById(company_id);
    if (!company) throw new Error('Công ty không tồn tại');

    const companyLicenseIds = company.licenses.map(l => l.license_id);

    const invalidIds = license_ids.filter(id => !companyLicenseIds.includes(id));

    if (invalidIds.length > 0) {
        throw new Error(`Các mã giấy phép không hợp lệ: ${invalidIds.join(', ')}`);
    }

    if (license_ids.length === 0) {
        throw new Error('Danh sách giấy phép để xóa không được rỗng');
    }

    const updatedCompany = await companyRepository.deleteMultipleLicensesFromCompany(
        company_id,
        license_ids, // truyền nguyên mảng gốc
        userId,
        session
    );

    return {
        deleted_count: license_ids.length,
        company: updatedCompany
    };
};

module.exports = {
    getCompanyById,
    addCompany,
    getAllCompanies,
    deleteCompanyById,
    restoreCompany,
    deleteAllCompany,
    updateCompany,
    setRepresentativeUser,
    deleteCompaniesByIds,
    restoreCompanies,
    getDeletedCompanies,
    checkCompanyBelongToZone,
    hardDeleteCompany,
    hardDeleteCompanies,
    previewSoftDeleteCompanies,
    previewHardDeleteCompanies,
    normalizeToArray,
    normalizeIndustrySelection,
    addLicense,
    updateLicense,
    deleteLicense,
    getLicense,
    deleteMultipleLicenses
};
