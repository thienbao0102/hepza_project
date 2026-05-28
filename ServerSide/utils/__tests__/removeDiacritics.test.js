const { removeDiacritics, escapeRegex, buildSearchPattern } = require('../removeDiacritics');

describe('removeDiacritics', () => {
    test('removes Vietnamese diacritics', () => {
        expect(removeDiacritics('Điện lưới')).toBe('dien luoi');
        expect(removeDiacritics('Chất thải nguy hại')).toBe('chat thai nguy hai');
    });

    test('returns empty for non-string', () => {
        expect(removeDiacritics(null)).toBe('');
        expect(removeDiacritics(123)).toBe('');
    });

    test('trims and lowercases', () => {
        expect(removeDiacritics('  Bã Mía  ')).toBe('ba mia');
    });
});

describe('escapeRegex', () => {
    test('escapes special characters', () => {
        expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
        expect(escapeRegex('[test]')).toBe('\\[test\\]');
    });
});

describe('buildSearchPattern', () => {
    test('builds OR pattern from words', () => {
        expect(buildSearchPattern('mía đã qua')).toBe('mia|da|qua');
    });

    test('returns empty for empty string', () => {
        expect(buildSearchPattern('')).toBe('');
        expect(buildSearchPattern(null)).toBe('');
    });
});
