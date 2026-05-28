export const toArray = (value) => {
    if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null && item !== '');
    if (value === undefined || value === null || value === '') return [];
    return [value];
};

export const buildIdNameMaps = (items, idKey, nameKey) => {
    const nameById = {};
    const idByName = {};

    (items || []).forEach((item) => {
        const id = item?.[idKey];
        const name = item?.[nameKey];

        if (id) nameById[id] = name || id;
        if (name) idByName[name] = id || name;
    });

    return { nameById, idByName };
};

export const normalizeSelectionToIds = (values, maps) => {
    const { nameById = {}, idByName = {} } = maps || {};

    return [...new Set(
        toArray(values)
            .map((value) => {
                const normalizedValue = String(value).trim();
                if (!normalizedValue) return null;
                if (nameById[normalizedValue]) return normalizedValue;
                return idByName[normalizedValue] || normalizedValue;
            })
            .filter(Boolean)
    )];
};

export const mapSelectionToNames = (values, nameById = {}) => {
    return toArray(values).map((value) => {
        const normalizedValue = String(value).trim();
        return nameById[normalizedValue] || normalizedValue;
    });
};
