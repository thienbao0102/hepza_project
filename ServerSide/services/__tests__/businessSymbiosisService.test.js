jest.mock('../../dataAccess/businessSymbiosisRepository', () => ({
    getBuyDemand: jest.fn(),
    getSellSupply: jest.fn(),
    findSellMatchedWithBuy: jest.fn(),
    findBuyMatchedWithSell: jest.fn(),
    findSellRecommendationCandidates: jest.fn(),
    findBuyRecommendationCandidates: jest.fn()
}));

jest.mock('../../utils/symbiosisMatching', () => ({
    scoreSymbiosisMatch: jest.fn(),
    dedupeAndSortMatches: jest.fn((matches) => matches.sort((a, b) => {
        if (a.matchTier !== b.matchTier) return a.matchTier - b.matchTier;
        return b.matchScore - a.matchScore;
    })),
    buildCandidateRegexTerms: jest.fn(() => ['mun cua'])
}));

const businessSymbiosisRepository = require('../../dataAccess/businessSymbiosisRepository');
const {
    scoreSymbiosisMatch,
    dedupeAndSortMatches,
    buildCandidateRegexTerms
} = require('../../utils/symbiosisMatching');
const {
    fetchBusinessSymbiosisByBuyDemand,
    fetchBusinessSymbiosisBySellSupply
} = require('../businessSysmbiosisService');

describe('businessSymbiosisService recommendation scoring', () => {
    const companyId = 'C01';

    beforeEach(() => {
        jest.clearAllMocks();
        buildCandidateRegexTerms.mockReturnValue(['mun cua']);
        dedupeAndSortMatches.mockImplementation((matches) => matches.sort((a, b) => {
            if (a.matchTier !== b.matchTier) return a.matchTier - b.matchTier;
            return b.matchScore - a.matchScore;
        }));
    });

    describe('fetchBusinessSymbiosisByBuyDemand', () => {
        test('returns empty array when no buy demands exist', async () => {
            businessSymbiosisRepository.getBuyDemand.mockResolvedValue([]);

            const result = await fetchBusinessSymbiosisByBuyDemand(companyId);

            expect(result).toEqual([]);
            expect(businessSymbiosisRepository.findSellRecommendationCandidates).not.toHaveBeenCalled();
            expect(scoreSymbiosisMatch).not.toHaveBeenCalled();
        });

        test('scores sell candidates, filters unrelated items, and returns matchTier/matchScore', async () => {
            const buyDemand = {
                _id: 'B1',
                wasteName: 'mùn cưa',
                desiredWasteCode: 'WOOD',
                industrialGrs: 'Gỗ',
                quantity: 10,
                unit: 'Tấn'
            };
            const strongCandidate = {
                _id: 'S1',
                wasteName: 'mùn cưa khô',
                wasteCode: 'WOOD',
                industrialGrs: 'Gỗ',
                quantity: 12,
                unit: 'Tấn'
            };
            const unrelatedCandidate = {
                _id: 'S2',
                wasteName: 'vải polyester vụn',
                wasteCode: 'TEX',
                industrialGrs: 'Dệt may',
                quantity: 3,
                unit: 'Tấn'
            };

            businessSymbiosisRepository.getBuyDemand.mockResolvedValue([buyDemand]);
            businessSymbiosisRepository.findSellRecommendationCandidates.mockResolvedValue([
                unrelatedCandidate,
                strongCandidate
            ]);
            scoreSymbiosisMatch
                .mockReturnValueOnce(null)
                .mockReturnValueOnce({ matchTier: 1, matchScore: 92 });

            const result = await fetchBusinessSymbiosisByBuyDemand(companyId);

            expect(businessSymbiosisRepository.findSellRecommendationCandidates).toHaveBeenCalledWith(
                expect.objectContaining({
                    company_id: { $ne: companyId },
                    isDeleted: { $ne: true },
                    $or: expect.arrayContaining([
                        { wasteCode: 'WOOD' },
                        { wasteNameNormalized: { $regex: 'mun cua', $options: 'i' } },
                        { wasteName: { $regex: 'mun cua', $options: 'i' } },
                        { otherWasteName: { $elemMatch: { $regex: 'mun cua', $options: 'i' } } },
                        { industrialGrs: 'Gỗ' }
                    ])
                })
            );
            expect(scoreSymbiosisMatch).toHaveBeenCalledWith(buyDemand, unrelatedCandidate, 'buy-to-sell');
            expect(scoreSymbiosisMatch).toHaveBeenCalledWith(buyDemand, strongCandidate, 'buy-to-sell');
            expect(result).toEqual([
                expect.objectContaining({
                    _id: 'S1',
                    matchTier: 1,
                    matchScore: 92
                })
            ]);
            expect(dedupeAndSortMatches).toHaveBeenCalledWith([
                expect.objectContaining({ _id: 'S1', matchTier: 1, matchScore: 92 })
            ]);
        });

        test('deduplicates sell candidates matched by multiple buy demands using best tier and score', async () => {
            const buyDemands = [
                { _id: 'B1', wasteName: 'gỗ', industrialGrs: 'Gỗ', quantity: 5, unit: 'Tấn' },
                { _id: 'B2', wasteName: 'mùn cưa', desiredWasteCode: 'WOOD', industrialGrs: 'Gỗ', quantity: 8, unit: 'Tấn' }
            ];
            const candidate = {
                _id: 'S1',
                wasteName: 'mùn cưa khô',
                wasteCode: 'WOOD',
                industrialGrs: 'Gỗ',
                quantity: 9,
                unit: 'Tấn'
            };

            businessSymbiosisRepository.getBuyDemand.mockResolvedValue(buyDemands);
            businessSymbiosisRepository.findSellRecommendationCandidates.mockResolvedValue([candidate]);
            scoreSymbiosisMatch
                .mockReturnValueOnce({ matchTier: 3, matchScore: 42 })
                .mockReturnValueOnce({ matchTier: 1, matchScore: 90 });
            dedupeAndSortMatches.mockImplementation((matches) => [matches[1]]);

            const result = await fetchBusinessSymbiosisByBuyDemand(companyId);

            expect(scoreSymbiosisMatch).toHaveBeenCalledTimes(2);
            expect(dedupeAndSortMatches).toHaveBeenCalledWith([
                expect.objectContaining({ _id: 'S1', matchTier: 3, matchScore: 42 }),
                expect.objectContaining({ _id: 'S1', matchTier: 1, matchScore: 90 })
            ]);
            expect(result).toEqual([
                expect.objectContaining({ _id: 'S1', matchTier: 1, matchScore: 90 })
            ]);
        });
    });

    describe('fetchBusinessSymbiosisBySellSupply', () => {
        test('returns empty array when no sell supplies exist', async () => {
            businessSymbiosisRepository.getSellSupply.mockResolvedValue([]);

            const result = await fetchBusinessSymbiosisBySellSupply(companyId);

            expect(result).toEqual([]);
            expect(businessSymbiosisRepository.findBuyRecommendationCandidates).not.toHaveBeenCalled();
            expect(scoreSymbiosisMatch).not.toHaveBeenCalled();
        });

        test('scores buy candidates, filters unrelated items, and returns sorted matchTier/matchScore results', async () => {
            const sellSupply = {
                _id: 'S1',
                wasteName: 'mùn cưa khô',
                wasteCode: 'WOOD',
                industrialGrs: 'Gỗ',
                quantity: 12,
                unit: 'Tấn'
            };
            const tierTwoCandidate = {
                _id: 'B1',
                wasteName: 'gỗ vụn',
                desiredWasteCode: 'WOOD',
                industrialGrs: 'Gỗ',
                quantity: 6,
                unit: 'Tấn'
            };
            const tierOneCandidate = {
                _id: 'B2',
                wasteName: 'mùn cưa',
                desiredWasteCode: 'WOOD',
                industrialGrs: 'Gỗ',
                quantity: 10,
                unit: 'Tấn'
            };

            businessSymbiosisRepository.getSellSupply.mockResolvedValue([sellSupply]);
            businessSymbiosisRepository.findBuyRecommendationCandidates.mockResolvedValue([
                tierTwoCandidate,
                tierOneCandidate
            ]);
            scoreSymbiosisMatch
                .mockReturnValueOnce({ matchTier: 2, matchScore: 66 })
                .mockReturnValueOnce({ matchTier: 1, matchScore: 91 });

            const result = await fetchBusinessSymbiosisBySellSupply(companyId);

            expect(businessSymbiosisRepository.findBuyRecommendationCandidates).toHaveBeenCalledWith(
                expect.objectContaining({
                    company_id: { $ne: companyId },
                    isDeleted: { $ne: true },
                    $or: expect.arrayContaining([
                        { desiredWasteCode: 'WOOD' },
                        { wasteNameNormalized: { $regex: 'mun cua', $options: 'i' } },
                        { wasteName: { $regex: 'mun cua', $options: 'i' } },
                        { otherWasteName: { $elemMatch: { $regex: 'mun cua', $options: 'i' } } },
                        { industrialGrs: 'Gỗ' }
                    ])
                })
            );
            expect(scoreSymbiosisMatch).toHaveBeenCalledWith(sellSupply, tierTwoCandidate, 'sell-to-buy');
            expect(scoreSymbiosisMatch).toHaveBeenCalledWith(sellSupply, tierOneCandidate, 'sell-to-buy');
            expect(result).toEqual([
                expect.objectContaining({ _id: 'B2', matchTier: 1, matchScore: 91 }),
                expect.objectContaining({ _id: 'B1', matchTier: 2, matchScore: 66 })
            ]);
        });
    });
});
