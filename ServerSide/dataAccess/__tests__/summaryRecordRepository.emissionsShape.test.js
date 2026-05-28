// Mock Mongoose models to avoid real DB connection
jest.mock('../../models/summaryRecordsModel', () => ({}));
jest.mock('../../models/companyModel', () => ({}));

const summaryRecordRepository = require('../summaryRecordRepository');

describe('createEmptySummaryData emissions strict keys', () => {
    test('contains new emission fields and excludes legacy fields', () => {
        const data = summaryRecordRepository.createEmptySummaryData();
        const e = data.emissions;

        // New schema fields must exist
        expect(e).toMatchObject({
            total_co2: 0,
            total_co2_from_grid_electricity: 0,
            total_co2_from_water: 0,
            total_co2_from_DO_oil: 0,
            total_co2_from_gasoline: 0,
            total_co2_from_FO_oil: 0,
            total_co2_from_biomass: 0,
            total_co2_from_charcoal: 0,
            total_co2_from_natural_gas: 0,
            total_co2_from_LPG: 0,
        });

        // Legacy fields must NOT exist
        expect(e.total_co2_from_electricity).toBeUndefined();
        expect(e.total_co2_from_electricity_grid).toBeUndefined();
        expect(e.total_co2_from_electricity_renewable).toBeUndefined();
        expect(e.total_co2_from_combustion).toBeUndefined();
        expect(e.total_co2_from_combustion_CRO).toBeUndefined();
        expect(e.total_co2_from_combustion_DOO).toBeUndefined();
        expect(e.total_co2_from_combustion_COL).toBeUndefined();
        expect(e.total_co2_from_combustion_BIO).toBeUndefined();
        expect(e.total_co2_from_combustion_PET).toBeUndefined();
        expect(e.total_co2_from_combustion_GASF).toBeUndefined();
        expect(e.total_co2_from_materials).toBeUndefined();
        expect(e.total_co2_from_chemicals).toBeUndefined();
        expect(e.total_co2_from_waste).toBeUndefined();
        expect(e.total_co2_from_waste_DO).toBeUndefined();
        expect(e.total_co2_from_waste_IND).toBeUndefined();
        expect(e.total_co2_from_waste_HA).toBeUndefined();
        expect(e.total_co2_from_waste_GASW).toBeUndefined();
        expect(e.total_co2_from_water_tap).toBeUndefined();
        expect(e.total_co2_from_water_rain).toBeUndefined();
        expect(e.total_co2_from_water_well).toBeUndefined();
        expect(e.total_co2_from_water_recycle).toBeUndefined();
    });

    test('unit_co2 matches model schema', () => {
        const data = summaryRecordRepository.createEmptySummaryData();
        expect(data.emissions.unit_co2).toBe('Tấn CO₂tđ');
    });
});
