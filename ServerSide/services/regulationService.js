const regulationRepository = require('../dataAccess/regulationRepository');
const hashtagRepository = require('../dataAccess/hashtagRepository');
const { VersionConflictError, MissingVersionError } = require('../utils/conflictError');

const validatePayload = (payload = {}) => {
    const errors = [];
    if (!payload.regulation_name || !String(payload.regulation_name).trim()) {
        errors.push('Tên quy định là bắt buộc');
    }
    if (!payload.group_regulation || !String(payload.group_regulation).trim()) {
        errors.push('Nhóm quy định là bắt buộc');
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

const mapRegulationRecord = (record = {}) => {
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
        regulation_id: record.regulation_id,
        regulation_name: record.regulation_name,
        des_short: record.des_short || '',
        des_long: normalizeLongDescription(record.des_long),
        link: record.link || '',
        group_regulation: record.group_regulation,
        tags,
        __v: record.__v,
        effective_date: record.effective_date,
        createdAt: record.createdAt || record.created_at,
        updatedAt: record.updatedAt || record.updated_at,
    };
};

const getRegulations = async () => {
    const regulations = await regulationRepository.getRegulations();
    return regulations.map(mapRegulationRecord);
};

const createRegulation = async (payload = {}) => {
    validatePayload(payload);

    const hashtagIds = await resolveHashtags(payload.tags);
    const desLongValue = normalizeLongDescription(payload.des_long);

    let linkValue = '';
    if (Array.isArray(payload.link)) {
        linkValue = payload.link.filter(Boolean)[0] || '';
    } else if (payload.link) {
        linkValue = String(payload.link).trim();
    }

    const regulationBody = {
        regulation_name: String(payload.regulation_name).trim(),
        des_short: String(payload.des_short || '').trim(),
        group_regulation: payload.group_regulation,
        tags: hashtagIds,
        effective_date: payload.effective_date,
        des_long: desLongValue,
    };

    if (linkValue) {
        regulationBody.link = linkValue;
    }

    const created = await regulationRepository.createRegulation(regulationBody);
    const createdWithTags = await regulationRepository.findByIdWithTags(created.regulation_id);
    return mapRegulationRecord(createdWithTags);
};

const getRegulationDetail = async (regulationId) => {
    if (!regulationId) {
        const error = new Error('Thiếu mã quy định');
        error.status = 400;
        throw error;
    }

    const regulation = await regulationRepository.findByIdWithTags(regulationId);
    if (!regulation) {
        const error = new Error('Quy định không tồn tại');
        error.status = 404;
        throw error;
    }

    return mapRegulationRecord(regulation);
};

const updateRegulation = async (regulationId, payload = {}) => {
    if (!regulationId) {
        const error = new Error('Thiếu mã quy định');
        error.status = 400;
        throw error;
    }

    validatePayload({
        regulation_name: payload.regulation_name,
        group_regulation: payload.group_regulation,
    });

    if (payload.__v === undefined || payload.__v === null) {
        throw new MissingVersionError();
    }

    const currentRegulation = await getRegulationDetail(regulationId);
    const hashtagIds = await resolveHashtags(payload.tags);
    const desLongValue = normalizeLongDescription(payload.des_long);

    const updateBody = {
        regulation_name: String(payload.regulation_name).trim(),
        des_short: String(payload.des_short || '').trim(),
        group_regulation: payload.group_regulation,
        tags: hashtagIds,
        effective_date: payload.effective_date,
        des_long: desLongValue,
    };

    if (payload.link) {
        updateBody.link = String(payload.link).trim();
    } else if (payload.link === '') {
        updateBody.link = '';
    }

    const updated = await regulationRepository.updateRegulationWithVersion(
        regulationId,
        payload.__v,
        updateBody
    );

    if (!updated) {
        const latest = await regulationRepository.findById(regulationId);
        if (!latest) {
            const error = new Error('Quy định không tồn tại');
            error.status = 404;
            throw error;
        }

        if (latest.__v !== currentRegulation.__v) {
            throw new VersionConflictError();
        }

        const error = new Error('Không thể cập nhật quy định');
        error.status = 400;
        throw error;
    }

    return mapRegulationRecord(updated);
};

const deleteRegulation = async (regulationId) => {
    if (!regulationId) {
        const error = new Error('Thiếu mã quy định');
        error.status = 400;
        throw error;
    }

    const deleted = await regulationRepository.deleteRegulation(regulationId);
    if (!deleted) {
        const error = new Error('Không thể xóa quy định hoặc quy định không tồn tại');
        error.status = 404;
        throw error;
    }
};

const deleteMultipleRegulations = async (regulationIds = []) => {
    if (!Array.isArray(regulationIds) || regulationIds.length === 0) {
        const error = new Error('Danh sách quy định cần xóa không hợp lệ');
        error.status = 400;
        throw error;
    }

    await regulationRepository.deleteRegulations(regulationIds);
};

module.exports = {
    getRegulations,
    createRegulation,
    getRegulationDetail,
    updateRegulation,
    deleteRegulation,
    deleteMultipleRegulations,
};
