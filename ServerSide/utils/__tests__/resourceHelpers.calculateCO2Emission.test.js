const { calculateCO2Emission, convertToTons } = require('../resourceHelpers');

describe('calculateCO2Emission', () => {
    test('maps grid electricity from fuel name and subgroup', () => {
        const value = calculateCO2Emission(1000, 'Điện lưới', 'Grid');
        expect(value).toBeCloseTo(0.6592, 6);
    });

    test('maps water from fuel name and subgroup', () => {
        const value = calculateCO2Emission(1000, 'Nước máy', 'tap');
        expect(value).toBeCloseTo(0.177, 6);
    });

    test('maps DO oil from label', () => {
        const value = calculateCO2Emission(1000, 'Dầu DO', 'PET');
        expect(value).toBeGreaterThan(0);
    });

    test('maps gasoline from label', () => {
        const value = calculateCO2Emission(1000, 'Xăng RON95', 'PET');
        expect(value).toBeGreaterThan(0);
    });

    test('maps FO oil from label', () => {
        const value = calculateCO2Emission(1000, 'Dầu FO', 'PET');
        expect(value).toBeGreaterThan(0);
    });

    test('maps biomass from label', () => {
        const value = calculateCO2Emission(1000, 'Sinh khối', 'BIO');
        expect(value).toBeGreaterThan(0);
    });

    test('maps charcoal from label', () => {
        const value = calculateCO2Emission(1000, 'Than đá', 'COL');
        expect(value).toBeGreaterThan(0);
    });

    test('maps natural gas from label', () => {
        const value = calculateCO2Emission(1000, 'Khí tự nhiên', 'GASF');
        expect(value).toBeGreaterThan(0);
    });

    test('maps LPG from label', () => {
        const value = calculateCO2Emission(1000, 'LPG', 'GASF');
        expect(value).toBeGreaterThan(0);
    });

    test('renewable electricity returns 0', () => {
        const value = calculateCO2Emission(1000, 'Điện mặt trời', 'Renewable');
        expect(value).toBe(0);
    });

    test('returns 0 for unsupported source', () => {
        const value = calculateCO2Emission(1000, 'unknown', 'khong ro', 'N/A');
        expect(value).toBe(0);
    });

    test('returns 0 for zero quantity', () => {
        const value = calculateCO2Emission(0, 'Điện lưới', 'Grid');
        expect(value).toBe(0);
    });

    test('returns 0 for negative quantity', () => {
        const value = calculateCO2Emission(-100, 'Điện lưới', 'Grid');
        expect(value).toBe(0);
    });
});

describe('convertToTons', () => {
    test('returns value unchanged for tấn unit', () => {
        expect(convertToTons(100, 'tấn', 'DO_oil')).toBe(100);
    });

    test('returns value unchanged for tan unit (normalized)', () => {
        expect(convertToTons(100, 'tan', 'DO_oil')).toBe(100);
    });

    test('converts m3 to tons using DO_oil density (832 kg/m³)', () => {
        expect(convertToTons(100, 'm3', 'DO_oil')).toBeCloseTo(83.2, 1);
    });

    test('converts m³ to tons using gasoline density (740 kg/m³)', () => {
        expect(convertToTons(100, 'm³', 'gasoline')).toBeCloseTo(74.0, 1);
    });

    test('converts m3 to tons using natural_gas density (0.78 kg/m³)', () => {
        expect(convertToTons(100, 'm3', 'natural_gas')).toBeCloseTo(0.078, 3);
    });

    test('returns 0 for unknown fuelType with m3 unit', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        expect(convertToTons(100, 'm3', 'unknown_type')).toBe(0);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No density'));
        warnSpy.mockRestore();
    });

    test('returns value unchanged for null unit', () => {
        expect(convertToTons(100, null, 'DO_oil')).toBe(100);
    });

    test('returns value unchanged for undefined unit', () => {
        expect(convertToTons(100, undefined, 'DO_oil')).toBe(100);
    });
});

describe('calculateCO2Emission with unit param', () => {
    test('tấn unit produces same result as default (backward compat)', () => {
        const withUnit = calculateCO2Emission(1000, 'Dầu DO', 'PET', 'tấn');
        const withoutUnit = calculateCO2Emission(1000, 'Dầu DO', 'PET');
        expect(withUnit).toBe(withoutUnit);
    });

    test('m3 unit produces different CO2 than tấn for diesel', () => {
        const m3Result = calculateCO2Emission(1, 'Dầu DO', 'PET', 'm3');
        const tanResult = calculateCO2Emission(1, 'Dầu DO', 'PET', 'tấn');
        expect(m3Result).toBeGreaterThan(0);
        expect(m3Result).not.toBeCloseTo(tanResult, 2);
    });

    test('m3 gas produces correct CO2 via convertToTons', () => {
        const result = calculateCO2Emission(1000, 'gas', 'GASF', 'm3');
        expect(result).toBeGreaterThan(0);
    });
});

