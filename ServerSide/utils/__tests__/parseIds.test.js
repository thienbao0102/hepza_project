const { parseCompanyIds, parseZoneIds } = require('../parseIds');

describe('parseIds', () => {
    test('parseCompanyIds splits comma string', () => {
        expect(parseCompanyIds('C001, C002 ,C003')).toEqual(['C001', 'C002', 'C003']);
    });

    test('parseCompanyIds accepts array', () => {
        expect(parseCompanyIds(['C001', 'C002'])).toEqual(['C001', 'C002']);
    });

    test('parseCompanyIds throws for empty input', () => {
        expect(() => parseCompanyIds('')).toThrow('company_ids is required');
        expect(() => parseCompanyIds(null)).toThrow('company_ids is required');
    });

    test('parseCompanyIds throws for empty after split', () => {
        expect(() => parseCompanyIds(' , , ')).toThrow('company_ids must not be empty');
    });

    test('parseZoneIds splits comma string', () => {
        expect(parseZoneIds('Z01,Z02')).toEqual(['Z01', 'Z02']);
    });

    test('parseZoneIds accepts array', () => {
        expect(parseZoneIds(['Z01'])).toEqual(['Z01']);
    });

    test('parseZoneIds throws for empty input', () => {
        expect(() => parseZoneIds()).toThrow('zone_ids is required');
    });
});
