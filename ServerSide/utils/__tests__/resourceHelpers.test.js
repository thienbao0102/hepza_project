const {
    normalizeString,
    capitalizeFirst,
    formatDate,
    convertToTons,
    FUEL_DENSITY_MAP,
    identifyFuelType,
    getCombustionSource,
    calculateCO2Emission,
    pickChangedFields,
    groupElectricityData,
    groupWaterData,
    buildCombustionEmissionKey,
    normalizeChemicalUnit,
    escapeRegexForImport,
    initQueryGetDataResource,
    mapToSubGroup,
} = require('../resourceHelpers');

jest.mock('../abbreviationInMemory', () => ({
    getCode: jest.fn((v) => {
        const map = { 'gỗ': 'WOOD', 'điện': 'EL', 'nước máy': 'TAP' };
        return map[v] || null;
    }),
}));

describe('resourceHelpers', () => {
    describe('normalizeString', () => {
        test('removes accents and lowercases', () => {
            expect(normalizeString('Điện Lưới')).toBe('dien luoi');
        });
        test('handles empty string', () => {
            expect(normalizeString('')).toBe('');
        });
    });

    describe('capitalizeFirst', () => {
        test('capitalizes first letter', () => {
            expect(capitalizeFirst('gỗ công nghiệp')).toBe('Gỗ công nghiệp');
        });
        test('returns empty for falsy', () => {
            expect(capitalizeFirst(null)).toBe('');
        });
    });

    describe('formatDate', () => {
        test('formats date to dd/mm/yyyy hh:mm', () => {
            const d = new Date('2024-05-05T14:30:00');
            expect(formatDate(d)).toBe('05/05/2024 14:30');
        });
        test('returns null for falsy', () => {
            expect(formatDate(null)).toBeNull();
        });
    });

    describe('convertToTons', () => {
        test('returns value for tấn unit', () => {
            expect(convertToTons(5, 'tấn', 'DO_oil')).toBe(5);
        });
        test('returns value for tan unit', () => {
            expect(convertToTons(5, 'tan', 'DO_oil')).toBe(5);
        });
        test('converts m3 to tons using density', () => {
            const density = FUEL_DENSITY_MAP.gasoline;
            expect(convertToTons(10, 'm3', 'gasoline')).toBe((10 * density) / 1000);
        });
        test('returns 0 when density missing for m3', () => {
            expect(convertToTons(10, 'm3', 'unknown')).toBe(0);
        });
        test('returns raw value for unknown unit', () => {
            expect(convertToTons(7, 'kg', 'DO_oil')).toBe(7);
        });
        test('returns raw value when unit is null', () => {
            expect(convertToTons(7, null, 'DO_oil')).toBe(7);
        });
    });

    describe('identifyFuelType / getCombustionSource', () => {
        test('identifies grid electricity', () => {
            expect(identifyFuelType('điện lưới', 'grid')).toBe('grid_electricity');
        });
        test('identifies water', () => {
            expect(identifyFuelType('nước máy', 'tap')).toBe('water');
        });
        test('identifies gasoline', () => {
            expect(identifyFuelType('xăng', 'pet')).toBe('gasoline');
        });
        test('returns null for unknown', () => {
            expect(identifyFuelType('xyz123', 'unknown')).toBeNull();
        });
        test('resolves by subGroup when name empty', () => {
            expect(getCombustionSource('', 'bio')).toBe('biomass');
        });
        test('returns null for short name', () => {
            expect(identifyFuelType('a', '')).toBeNull();
        });
        test('returns null when empty name and unknown subGroup', () => {
            expect(getCombustionSource('', 'unknown')).toBe('null');
        });
        test('resolves via fuzzy search for similar name', () => {
            expect(identifyFuelType('dien luoi quoc gia', 'grid')).toBe('grid_electricity');
        });
    });

    describe('calculateCO2Emission', () => {
        test('returns 0 for non-positive quantity', () => {
            expect(calculateCO2Emission(0, 'xăng', 'pet')).toBe(0);
            expect(calculateCO2Emission(-5, 'xăng', 'pet')).toBe(0);
        });
        test('calculates CO2 for gasoline in tons', () => {
            const result = calculateCO2Emission(1, 'xăng', 'pet', 'tấn');
            expect(result).toBeGreaterThan(0);
        });
        test('calculates CO2 for grid electricity', () => {
            const result = calculateCO2Emission(1000, 'điện lưới', 'grid', 'tấn');
            expect(result).toBeCloseTo(0.6592, 4);
        });
        test('calculates CO2 for water', () => {
            const result = calculateCO2Emission(1000, 'nước', 'tap', 'tấn');
            expect(result).toBeCloseTo(0.177, 4);
        });
        test('handles m3 conversion', () => {
            const result = calculateCO2Emission(10, 'xăng', 'pet', 'm3');
            expect(result).toBeGreaterThan(0);
        });
        test('returns 0 for unknown fuel', () => {
            expect(calculateCO2Emission(10, 'unknown', 'unknown')).toBe(0);
        });
    });

    describe('pickChangedFields', () => {
        test('picks important fields for FuelResource', () => {
            const oldObj = { fuelName: 'Xăng', quantity: 10, unit: 'lít', extra: 'ignore' };
            const newObj = { fuelName: 'Dầu', quantity: 20, unit: 'lít', extra: 'ignore' };
            const result = pickChangedFields(oldObj, newObj, 'FuelResource');
            expect(result.oldData.fuelName).toBe('Xăng');
            expect(result.newData.quantity).toBe(20);
            expect(result.oldData.extra).toBeUndefined();
        });
        test('flattens detail if exists', () => {
            const oldObj = { detail: { name: 'A', quantity: 5 } };
            const newObj = { detail: { name: 'B', quantity: 6 } };
            const result = pickChangedFields(oldObj, newObj, 'InputResource');
            expect(result.oldData.name).toBe('A');
            expect(result.newData.quantity).toBe(6);
        });
        test('handles null objects', () => {
            const result = pickChangedFields(null, null, 'FuelResource');
            expect(result.oldData).toBeNull();
            expect(result.newData).toBeNull();
        });
        test('handles object and boolean values', () => {
            const oldObj = { fuelName: 'Xăng', note: true, purpose: { a: 1 } };
            const newObj = { fuelName: 'Dầu', note: false, purpose: { b: 2 } };
            const result = pickChangedFields(oldObj, newObj, 'FuelResource');
            expect(result.oldData.note).toBe(true);
            expect(result.newData.purpose).toEqual({ b: 2 });
        });
    });

    describe('groupElectricityData', () => {
        test('groups by label and sub_group', () => {
            const raw = {
                production: [
                    { label: 'Điện', sub_group: 'grid', value: 100, unit: 'kWh', _id: '1' },
                    { label: 'Điện', sub_group: 'grid', value: 50, unit: 'kWh' },
                ],
            };
            const USAGE_FIELD_MAP = { production: 'production' };
            const result = groupElectricityData(raw, USAGE_FIELD_MAP);
            expect(result).toHaveLength(1);
            expect(result[0].total).toBe(150);
            expect(result[0].detail.production).toBe(150);
        });
        test('skips non-positive values', () => {
            const raw = {
                production: [
                    { label: 'Điện', sub_group: 'grid', value: 0, unit: 'kWh' },
                    { label: 'Điện', sub_group: 'grid', value: -10, unit: 'kWh' },
                ],
            };
            const result = groupElectricityData(raw, {});
            expect(result).toHaveLength(0);
        });
        test('assigns _id when first item lacks it', () => {
            const raw = {
                production: [
                    { label: 'Điện', sub_group: 'grid', value: 50, unit: 'kWh' },
                    { label: 'Điện', sub_group: 'grid', value: 100, unit: 'kWh', _id: '2' },
                ],
            };
            const result = groupElectricityData(raw, { production: 'production' });
            expect(result[0]._id).toBe('2');
        });
    });

    describe('groupWaterData', () => {
        test('groups by label and sub_group', () => {
            const raw = {
                tap: [
                    { label: 'Nước', sub_group: 'tap', value: 100, unit: 'm3', _id: '1' },
                    { label: 'Nước', sub_group: 'tap', value: 50, unit: 'm3' },
                ],
            };
            const result = groupWaterData(raw);
            expect(result).toHaveLength(1);
            expect(result[0].total).toBe(150);
        });
        test('assigns _id when first item lacks it', () => {
            const raw = {
                tap: [
                    { label: 'Nước', sub_group: 'tap', value: 50, unit: 'm3' },
                    { label: 'Nước', sub_group: 'tap', value: 100, unit: 'm3', _id: '2' },
                ],
            };
            const result = groupWaterData(raw);
            expect(result[0]._id).toBe('2');
        });
    });

    describe('buildCombustionEmissionKey', () => {
        test('builds key for known fuel', () => {
            expect(buildCombustionEmissionKey('xăng', 'pet')).toBe('total_co2_from_gasoline');
        });
        test('returns string null key for unknown fuel', () => {
            expect(buildCombustionEmissionKey('unknown', 'unk')).toBe('total_co2_from_null');
        });
    });

    describe('normalizeChemicalUnit', () => {
        test('normalizes kg variants', () => {
            expect(normalizeChemicalUnit('tấn')).toBe('kg');
            expect(normalizeChemicalUnit('g')).toBe('kg');
        });
        test('normalizes lít variants', () => {
            expect(normalizeChemicalUnit('lít')).toBe('l');
            expect(normalizeChemicalUnit('litre')).toBe('l');
        });
        test('normalizes m3 variants', () => {
            expect(normalizeChemicalUnit('khối')).toBe('m3');
            expect(normalizeChemicalUnit('m³')).toBe('m3');
        });
        test('defaults to kg', () => {
            expect(normalizeChemicalUnit('unknown')).toBe('kg');
            expect(normalizeChemicalUnit(null)).toBe('kg');
        });
    });

    describe('escapeRegexForImport', () => {
        test('escapes regex special chars', () => {
            expect(escapeRegexForImport('a.b*c+d?e[f]g(h)i{j}k|l^m$n:o=p;q'));
        });
    });

    describe('initQueryGetDataResource', () => {
        test('builds query for admin with company_id', () => {
            const q = initQueryGetDataResource(202401, 202412, 'admin', 'C01', 'Z01');
            expect(q.company_id).toBe('C01');
            expect(q.periodKey).toEqual({ $gte: 202401, $lte: 202412 });
            expect(q.isDeleted).toEqual({ $ne: true });
        });
        test('builds query for manager with zone_id only', () => {
            const q = initQueryGetDataResource(null, null, 'manager', null, 'Z01');
            expect(q.zone_id).toBe('Z01');
            expect(q.periodKey).toBeUndefined();
        });
        test('builds query with single periodKey', () => {
            const q = initQueryGetDataResource(202401, null, 'company', 'C01', null);
            expect(q.periodKey).toBe(202401);
        });
        test('builds query with periodKeyEnd only', () => {
            const q = initQueryGetDataResource(null, 202412, 'company', 'C01', null);
            expect(q.periodKey).toBe(202412);
        });
    });

    describe('mapToSubGroup', () => {
        test('maps using feSubGroup', () => {
            expect(mapToSubGroup('material', 'gỗ')).toBe('WOOD');
        });
        test('falls back to itemLabel', () => {
            expect(mapToSubGroup('material', null, 'gỗ')).toBe('WOOD');
        });
        test('throws when not found', () => {
            expect(() => mapToSubGroup('material', 'unknown')).toThrow('Không tìm thấy sub_group');
        });
    });
});
