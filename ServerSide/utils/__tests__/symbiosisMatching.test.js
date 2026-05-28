const {
    normalizeForMatch,
    buildNameProfile,
    scoreNameMatch,
    scoreSymbiosisMatch,
    dedupeAndSortMatches,
    buildCandidateRegexTerms
} = require('../symbiosisMatching');

describe('symbiosisMatching normalization', () => {
    test('normalizes Vietnamese text, separators, and common variants', () => {
        expect(normalizeForMatch('Nhựa - NILON/phế liệu')).toBe('nhua nylon phe lieu');
    });

    test('builds important tokens without generic stopwords', () => {
        const profile = buildNameProfile('Vải vụn cotton phế liệu');
        expect(profile.tokens).toEqual(expect.arrayContaining(['vai', 'cotton']));
        expect(profile.tokens).not.toContain('phe');
        expect(profile.tokens).not.toContain('lieu');
    });

    test('classifies anchors, weak tokens, and token groups', () => {
        const profile = buildNameProfile('Bao bì nilon tái chế PE');
        expect(profile.anchorTokens).toEqual(expect.arrayContaining(['bao', 'nylon', 'pe']));
        expect(profile.weakTokens).toEqual(expect.arrayContaining(['tai', 'che']));
        expect(profile.tokenGroups).toEqual(expect.arrayContaining(['plastic', 'container']));
    });
});

describe('symbiosisMatching name score', () => {
    test('scores direct reordered material names highly', () => {
        const score = scoreNameMatch('vải vụn cotton', ['vải cotton thừa']);
        expect(score.score).toBeGreaterThanOrEqual(75);
        expect(score.hasStrongNameEvidence).toBe(true);
    });

    test('does not score generic overlap highly', () => {
        const score = scoreNameMatch('vải vụn cotton', ['vải polyester vụn']);
        expect(score.score).toBeLessThan(65);
        expect(score.hasMaterialConflict).toBe(false);
    });

    test('supports short specific name variants', () => {
        const score = scoreNameMatch('nylon', ['nilon phế liệu']);
        expect(score.score).toBeGreaterThanOrEqual(55);
    });

    test('blocks weak-only process overlap', () => {
        const score = scoreNameMatch('bao bì nilon tái chế PE', ['gỗ tái chế']);
        expect(score.weakOnlyOverlap || score.hasMaterialConflict).toBe(true);
        expect(score.score).toBeLessThan(45);
    });

    test('detects material-group evidence for compatible names', () => {
        const score = scoreNameMatch('pallet gỗ cũ', ['gỗ pallet hỏng']);
        expect(score.hasAnchorEvidence).toBe(true);
        expect(score.hasGroupEvidence).toBe(true);
        expect(score.score).toBeGreaterThanOrEqual(85);
    });

    test('keeps broad one-word names from becoming high-confidence alone', () => {
        const score = scoreNameMatch('gỗ', ['gỗ vụn']);
        expect(score.score).toBeLessThan(70);
        expect(score.requiresSupportingEvidence).toBe(true);
    });
});

describe('symbiosisMatching total score and tiers', () => {
    test('assigns Tier 1 for strong name and matching code', () => {
        const result = scoreSymbiosisMatch(
            { wasteName: 'mùn cưa', desiredWasteCode: 'WOOD', industrialGrs: 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất', quantity: 10, unit: 'Tấn' },
            { wasteName: 'mùn cưa khô', wasteCode: 'WOOD', industrialGrs: 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất', quantity: 12, unit: 'Tấn' },
            'buy-to-sell'
        );
        expect(result.matchTier).toBe(1);
        expect(result.matchScore).toBeGreaterThanOrEqual(78);
    });

    test('does not promote notes evidence above Tier 3', () => {
        const result = scoreSymbiosisMatch(
            { wasteName: 'nhựa xốp', notes: 'dùng cho tái chế bao bì', industrialGrs: 'Khác' },
            { wasteName: 'bao bì xốp', notes: 'có thể tái chế bao bì', industrialGrs: 'Khác' },
            'buy-to-sell'
        );
        expect(result.matchTier).toBe(3);
        expect(result.matchScore).toBeLessThan(65);
    });

    test('allows Tier 3 for specific short overlap with support signal', () => {
        const result = scoreSymbiosisMatch(
            { wasteName: 'bao tải dứa cũ', industrialGrs: 'Hoá dược, cao su, nhựa', unit: 'cái' },
            { wasteName: 'bao tải PE đựng nguyên liệu', industrialGrs: 'Hoá dược, cao su, nhựa', unit: 'cái' },
            'buy-to-sell'
        );
        expect(result.matchTier).toBeLessThanOrEqual(3);
        expect(result.matchScore).toBeGreaterThanOrEqual(40);
    });

    test('keeps strong compatible material match high confidence', () => {
        const result = scoreSymbiosisMatch(
            { wasteName: 'pallet gỗ cũ', industrialGrs: 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất', unit: 'kg' },
            { wasteName: 'gỗ pallet hỏng', industrialGrs: 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất', unit: 'kg' },
            'buy-to-sell'
        );
        expect(result.matchTier).toBe(1);
        expect(result.matchScore).toBeGreaterThanOrEqual(85);
    });

    test('blocks match when only process tokens overlap and material conflicts', () => {
        const result = scoreSymbiosisMatch(
            { wasteName: 'bao bì nilon tái chế PE', industrialGrs: 'Hoá dược, cao su, nhựa', unit: 'kg' },
            { wasteName: 'gỗ tái chế', industrialGrs: 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất', unit: 'kg' },
            'sell-to-buy'
        );
        expect(result).toBeNull();
    });

    test('blocks match that only shares industrial group', () => {
        const result = scoreSymbiosisMatch(
            { wasteName: 'hóa chất trợ nhuộm sinh học', industrialGrs: 'Hoá dược, cao su, nhựa' },
            { wasteName: 'can nhựa đựng keo khô', industrialGrs: 'Hoá dược, cao su, nhựa' },
            'buy-to-sell'
        );
        expect(result).toBeNull();
    });

    test('returns null below Tier 3 threshold', () => {
        const result = scoreSymbiosisMatch(
            { wasteName: 'vải cotton', industrialGrs: 'May mặc, thuộc da, dệt nhuộm' },
            { wasteName: 'tro bay', industrialGrs: 'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất' },
            'buy-to-sell'
        );
        expect(result).toBeNull();
    });

    test('keeps best duplicate by tier and score', () => {
        const result = dedupeAndSortMatches([
            { _id: 'A', matchTier: 3, matchScore: 50, quantity: 1 },
            { _id: 'A', matchTier: 2, matchScore: 60, quantity: 1 },
            { _id: 'B', matchTier: 1, matchScore: 70, quantity: 1 }
        ]);
        expect(result.map(item => item._id)).toEqual(['B', 'A']);
        expect(result.find(item => item._id === 'A').matchTier).toBe(2);
    });
});

describe('symbiosisMatching candidate regex terms', () => {
    test('builds escaped candidate terms from wasteName only', () => {
        const result = buildCandidateRegexTerms({ wasteName: 'nhựa PET (loại 1)' });
        expect(result).toEqual(expect.arrayContaining(['nhua pet', 'nhua', 'pet', '1']));
        expect(result.join(' ')).not.toMatch(/[()]/);
    });
});

