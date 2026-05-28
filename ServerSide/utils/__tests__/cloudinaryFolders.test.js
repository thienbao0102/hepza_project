const {
    CLOUDINARY_FOLDERS,
    CLOUDINARY_BLOB_ROOT,
    LEGACY_CLOUDINARY_PREFIX_MIGRATIONS,
    normalizeCloudinarySegment,
    getFuelBillFolder,
    getWasteAttachmentFolder,
    getManagedCloudinaryPrefixes,
    rewriteCloudinaryPublicId,
} = require('../cloudinaryFolders');

describe('cloudinaryFolders', () => {
    test('exports frozen folder constants', () => {
        expect(CLOUDINARY_FOLDERS.symbiosisBuyDemand).toBe('hepza/symbiosis/buy-demands');
        expect(CLOUDINARY_BLOB_ROOT).toBe('hepza/blobs');
    });

    test('normalizeCloudinarySegment removes diacritics and special chars', () => {
        expect(normalizeCloudinarySegment('Điện lưới')).toBe('dien-luoi');
        expect(normalizeCloudinarySegment()).toBe('general');
        expect(normalizeCloudinarySegment('')).toBe('general');
        expect(normalizeCloudinarySegment('---hello---')).toBe('hello');
    });

    test('getFuelBillFolder includes normalized segment', () => {
        expect(getFuelBillFolder('Điện')).toBe('hepza/resources/fuel-bills/dien');
    });

    test('getWasteAttachmentFolder includes normalized segment', () => {
        expect(getWasteAttachmentFolder('Chất thải')).toBe('hepza/resources/waste-attachments/chat-thai');
    });

    test('getManagedCloudinaryPrefixes returns unique array', () => {
        const prefixes = getManagedCloudinaryPrefixes();
        const keys = prefixes.map(p => p.prefix);
        expect(new Set(keys).size).toBe(keys.length);
        expect(prefixes.some(p => p.prefix === 'hepza/blobs')).toBe(true);
    });

    test('rewriteCloudinaryPublicId migrates legacy prefix', () => {
        expect(rewriteCloudinaryPublicId('symbiosis/buy-demand/123')).toBe('hepza/symbiosis/buy-demands/123');
        expect(rewriteCloudinaryPublicId('company/licenses/doc.pdf')).toBe('hepza/companies/licenses/doc.pdf');
    });

    test('rewriteCloudinaryPublicId keeps modern prefix', () => {
        expect(rewriteCloudinaryPublicId('hepza/symbiosis/buy-demands/123')).toBe('hepza/symbiosis/buy-demands/123');
    });

    test('rewriteCloudinaryPublicId handles empty string', () => {
        expect(rewriteCloudinaryPublicId('')).toBe('');
    });
});
