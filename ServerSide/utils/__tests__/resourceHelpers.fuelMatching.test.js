const {
    normalizeString,
    getCombustionSource,
    calculateCO2Emission,
    identifyFuelType,
} = require('../resourceHelpers');

describe('fuel type fuzzy matching', () => {
    test('matches Vietnamese typo for DO oil', () => {
        const type = identifyFuelType(normalizeString('dau d0'), normalizeString('pet'));
        expect(type).toBe('DO_oil');
    });

    test('matches English typo for gasoline', () => {
        const type = identifyFuelType(normalizeString('gasolin'), normalizeString('pet'));
        expect(type).toBe('gasoline');
    });

    test('matches accent and no-accent natural gas', () => {
        const type1 = identifyFuelType(normalizeString('Khi tu nhien'), normalizeString('gasf'));
        const type2 = identifyFuelType(normalizeString('khi tu nhien'), normalizeString('gasf'));
        expect(type1).toBe('natural_gas');
        expect(type2).toBe('natural_gas');
    });

    test('returns null for ambiguous short token', () => {
        const type = identifyFuelType(normalizeString('ga'), normalizeString(''));
        expect(type).toBeNull();
    });

    test('falls back to subgroup when name is empty', () => {
        const type = identifyFuelType(normalizeString(''), normalizeString('bio'));
        expect(type).toBe('biomass');
    });

    test('getCombustionSource uses same matcher', () => {
        const source = getCombustionSource(normalizeString('dau f0'), 'pet');
        expect(source).toBe('FO_oil');
    });

    test('calculateCO2Emission stays positive for fuzzy DO match', () => {
        const value = calculateCO2Emission(1000, 'dau d0', 'pet');
        expect(value).toBeGreaterThan(0);
    });

    test('uncertain fuel still returns 0 emission', () => {
        const value = calculateCO2Emission(1000, 'zzzxxx', 'n/a');
        expect(value).toBe(0);
    });
});
