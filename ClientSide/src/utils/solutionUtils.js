const DEFAULT_GROUP = 'Khác';

export const GROUP_SOLUTIONS = [
    'QUẢN LÝ NGUYÊN VẬT LIỆU',
    'QUẢN LÝ HOÁ CHẤT',
    'QUẢN LÝ NĂNG LƯỢNG',
    'QUẢN LÝ NƯỚC',
];

export const formatTags = (tags = []) => {
    if (!Array.isArray(tags)) return [];
    return tags
        .map((tag) => {
            if (!tag) return null;
            if (typeof tag === 'string') return tag.trim();
            const value = tag.name || tag.label || tag.title || tag.hashtag_name || tag.tag_name || null;
            return value ? String(value).trim() : null;
        })
        .filter(Boolean);
};

const formatLongDescription = (value) => String(value || '').trim();

export const normalizeSolution = (payload = {}) => ({
    solution_id: payload.solution_id ?? payload.id ?? '',
    solution_name: payload.solution_name ?? payload.title ?? '',
    des_short: payload.des_short ?? payload.description ?? '',
    tags: formatTags(payload.tags),
    link: payload.link ?? payload.url ?? '',
    group_solution: payload.group_solution ?? payload.groupSolution ?? '',
    createdAt: payload.createdAt ?? payload.created_at ?? payload.created_date ?? '',
    des_long: formatLongDescription(payload.des_long),
});

export const normalizeSolutionList = (list = []) => {
    if (!Array.isArray(list)) return [];
    return list.map((item) => normalizeSolution(item));
};

export const groupSolutionsByCategory = (list = []) => {
    const grouped = GROUP_SOLUTIONS.reduce((acc, group) => {
        acc[group] = [];
        return acc;
    }, { [DEFAULT_GROUP]: [] });

    list.forEach((item) => {
        const key = GROUP_SOLUTIONS.includes(item.group_solution) ? item.group_solution : DEFAULT_GROUP;
        grouped[key].push(item);
    });

    if (grouped[DEFAULT_GROUP].length === 0) {
        delete grouped[DEFAULT_GROUP];
    }

    return grouped;
};

export const findSolutionById = (list = [], id) => {
    if (!id) return undefined;
    return list.find((item) => {
        const solutionId = item.solution_id ?? item.id;
        return (
            solutionId === id ||
            String(solutionId) === String(id) ||
            decodeURIComponent(String(solutionId)) === String(id)
        );
    });
};

export const filterSolutionsByKeyword = (list = [], keyword = '') => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return list;

    return list.filter((item) => {
        const nameMatch = (item.solution_name || '').toLowerCase().includes(normalized);
        const descriptionMatch = (item.des_short || '').toLowerCase().includes(normalized);
        const tagMatch = Array.isArray(item.tags)
            ? item.tags.some((tag) => String(tag).toLowerCase().includes(normalized))
            : false;
        return nameMatch || descriptionMatch || tagMatch;
    });
};
