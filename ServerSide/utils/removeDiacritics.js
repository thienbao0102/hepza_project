/**
 * Vietnamese diacritics removal utility.
 * Chuyển đổi tiếng Việt có dấu thành không dấu (ASCII).
 * Ví dụ: "Bã Mía" → "ba mia", "Chất thải nguy hại" → "chat thai nguy hai"
 */

const VIETNAMESE_DIACRITICS_MAP = {
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    'đ': 'd',
    // Uppercase
    'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
    'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
    'Đ': 'D'
};

// Build regex pattern from map keys
const diacriticsPattern = new RegExp(
    Object.keys(VIETNAMESE_DIACRITICS_MAP).join('|'), 'g'
);

/**
 * Remove Vietnamese diacritics from a string.
 * @param {string} str - Input string with Vietnamese diacritics
 * @returns {string} Normalized string without diacritics, lowercase
 */
const removeDiacritics = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(diacriticsPattern, (match) => VIETNAMESE_DIACRITICS_MAP[match] || match)
        .toLowerCase()
        .trim();
};

/**
 * Escape special regex characters in a string.
 * @param {string} str - Input string to escape
 * @returns {string} Escaped string safe for use in RegExp
 */
const escapeRegex = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Build a regex pattern from a search string that matches ANY word (OR logic).
 * Normalizes the search string, splits into words, and creates alternation pattern.
 * Example: "mía đã qua sử dụng" → normalized "mia da qua su dung" → regex "mia|da|qua|su|dung"
 * @param {string} searchStr - Search string (may contain diacritics)
 * @returns {string} Regex pattern string for MongoDB $regex
 */
const buildSearchPattern = (searchStr) => {
    if (!searchStr || typeof searchStr !== 'string') return '';
    const normalized = removeDiacritics(searchStr);
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    return words.map(w => escapeRegex(w)).join('|');
};

module.exports = {
    removeDiacritics,
    escapeRegex,
    buildSearchPattern
};
