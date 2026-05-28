const solutionRepository = require('../dataAccess/solutionRepository');
const hashtagRepository = require('../dataAccess/hashtagRepository');
const { VersionConflictError } = require('../utils/conflictError');

const validatePayload = (payload = {}) => {
    const errors = [];
    if (!payload.solution_name || !String(payload.solution_name).trim()) {
        errors.push('Tên giải pháp là bắt buộc');
    }
    if (!payload.group_solution || !String(payload.group_solution).trim()) {
        errors.push('Nhóm giải pháp là bắt buộc');
    }

    if (errors.length) {
        const message = errors.join('. ');
        const error = new Error(message);
        error.status = 400;
        throw error;
    }
};

const normalizeLongDescription = (value) => {
    if (typeof value === 'object' && value !== null) {
        return Object.values(value).join(' ').trim();
    }
    return String(value || '').trim();
};

const resolveHashtags = async (tags = []) => {
    if (!Array.isArray(tags) || tags.length === 0) return [];
    const normalized = tags
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter(Boolean);

    if (normalized.length === 0) return [];

    const existing = await hashtagRepository.findByNames(normalized);
    if (existing.length !== normalized.length) {
        const error = new Error('Một số hashtag không tồn tại. Vui lòng kiểm tra lại.');
        error.status = 400;
        throw error;
    }

    return existing.map((item) => item._id);
};

const mapSolutionRecord = (record = {}) => {
    if (!record) return null;

    const tags = Array.isArray(record.tags)
        ? record.tags
            .map((tag) => {
                if (!tag) return null;
                if (typeof tag === 'string') return tag.trim();
                return tag.name ? String(tag.name).trim() : null;
            })
            .filter(Boolean)
        : [];

    return {
        solution_id: record.solution_id,
        solution_name: record.solution_name,
        des_short: record.des_short || '',
        des_long: normalizeLongDescription(record.des_long),
        link: record.link || '',
        group_solution: record.group_solution,
        tags,
        createdAt: record.createdAt || record.created_at,
        updatedAt: record.updatedAt || record.updated_at,
    };
};

const getSolution = async (filters = {}, page = 1, limit = 0) => {
    const skip = (page - 1) * limit;

    const [solutions, total] = await Promise.all([
        solutionRepository.getSolution(filters, skip, limit),
        solutionRepository.countSolutions(filters)
    ]);

    const mappedSolutions = solutions.map(mapSolutionRecord);

    return {
        solutions: mappedSolutions,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            hasMore: limit > 0 ? (skip + solutions.length) < total : false
        }
    };
};

const createSolution = async (payload = {}, userId = '') => {
    validatePayload(payload);

    const hashtagIds = await resolveHashtags(payload.tags);
    const desLongValue = normalizeLongDescription(payload.des_long);

    let linkValue = '';
    if (Array.isArray(payload.link)) {
        linkValue = payload.link.filter(Boolean)[0] || '';
    } else if (payload.link) {
        linkValue = String(payload.link).trim();
    }

    const solutionBody = {
        solution_name: String(payload.solution_name).trim(),
        des_short: String(payload.des_short || '').trim(),
        group_solution: payload.group_solution,
        tags: hashtagIds,
        des_long: desLongValue,
    };

    if (linkValue) {
        solutionBody.link = linkValue;
    }

    const created = await solutionRepository.createSolution(solutionBody);
    const createdWithTags = await solutionRepository.findByIdWithTags(created.solution_id);
    return mapSolutionRecord(createdWithTags);
};

const getSolutionDetail = async (solutionId) => {
    if (!solutionId) {
        const error = new Error('Thiếu mã giải pháp');
        error.status = 400;
        throw error;
    }

    const solution = await solutionRepository.findByIdWithTags(solutionId);
    if (!solution) {
        const error = new Error('Giải pháp không tồn tại');
        error.status = 404;
        throw error;
    }

    return mapSolutionRecord(solution);
};

const updateSolution = async (solutionId, payload = {}, userId = '') => {
    if (!solutionId) {
        const error = new Error('Thiếu mã giải pháp');
        error.status = 400;
        throw error;
    }

    validatePayload({
        solution_name: payload.solution_name,
        group_solution: payload.group_solution,
    });

    await getSolutionDetail(solutionId); // ensure exists

    const hashtagIds = await resolveHashtags(payload.tags);
    const desLongValue = normalizeLongDescription(payload.des_long);

    const updateBody = {
        solution_name: String(payload.solution_name).trim(),
        des_short: String(payload.des_short || '').trim(),
        group_solution: payload.group_solution,
        tags: hashtagIds,
        des_long: desLongValue,
    };

    if (payload.link) {
        updateBody.link = String(payload.link).trim();
    } else if (payload.link === '') {
        updateBody.link = '';
    }

    if (payload.__v !== undefined) {
        updateBody.__v = payload.__v;
    }

    const updated = await solutionRepository.updateSolution(solutionId, updateBody);
    if (!updated) {
        if (payload.__v !== undefined) {
            throw new VersionConflictError();
        }
        const error = new Error('Không thể cập nhật giải pháp');
        error.status = 400;
        throw error;
    }

    try {
        const { getIo } = require('../config/socket');
        const io = getIo();
        if (io) {
            io.emit('solution:updated', {
                solution_id: solutionId,
                updated_by: userId,
                __v: updated.__v
            });
        }
    } catch (_) { /* best effort */ }

    return mapSolutionRecord(updated);
};

const deleteSolution = async (solutionId, userId = '') => {
    if (!solutionId) {
        const error = new Error('Thiếu mã giải pháp');
        error.status = 400;
        throw error;
    }

    const deleted = await solutionRepository.deleteSolution(solutionId, userId);
    if (!deleted) {
        const error = new Error('Không thể xóa giải pháp hoặc giải pháp không tồn tại');
        error.status = 404;
        throw error;
    }
};

const deleteMultipleSolutions = async (solutionIds = [], userId = '') => {
    if (!Array.isArray(solutionIds) || solutionIds.length === 0) {
        const error = new Error('Danh sách giải pháp cần xóa không hợp lệ');
        error.status = 400;
        throw error;
    }

    await solutionRepository.deleteSolutions(solutionIds, userId);
};

module.exports = {
    getSolution,
    createSolution,
    getSolutionDetail,
    updateSolution,
    deleteSolution,
    deleteMultipleSolutions,
};
