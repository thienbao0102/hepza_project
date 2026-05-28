const { normalizeZoneSearchText, normalizeZoneNameForCompare } = require('../zoneNameNormalizer');

describe('zoneNameNormalizer', () => {
    test('normalizeZoneSearchText removes diacritics and uppercases', () => {
        expect(normalizeZoneSearchText('Khu công nghiệp Đồng Nai')).toBe('KHU CONG NGHIEP DONG NAI');
    });

    test('normalizeZoneSearchText replaces special chars with space', () => {
        expect(normalizeZoneSearchText('KCN-ABC_XYZ')).toBe('KCN ABC XYZ');
    });

    test('normalizeZoneNameForCompare replaces KHU CONG NGHIEP with KCN', () => {
        expect(normalizeZoneNameForCompare('Khu công nghiệp Bình Dương')).toBe('KCN BINH DUONG');
    });

    test('normalizeZoneNameForCompare replaces KHU CHE XUAT with KCX', () => {
        expect(normalizeZoneNameForCompare('Khu chế xuất Tân Thuận')).toBe('KCX TAN THUAN');
    });

    test('normalizeZoneNameForCompare replaces VSIP variants', () => {
        expect(normalizeZoneNameForCompare('Việt Nam - Singapore 1')).toBe('VSIP 1');
        expect(normalizeZoneNameForCompare('Vietnam Singapore 2')).toBe('VSIP 2');
    });

    test('handles empty string', () => {
        expect(normalizeZoneSearchText('')).toBe('');
        expect(normalizeZoneNameForCompare('')).toBe('');
    });
});
