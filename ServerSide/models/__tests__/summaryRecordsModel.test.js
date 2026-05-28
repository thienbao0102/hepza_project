jest.mock('../../utils/autoIncrement', () => ({
  generateId: jest.fn().mockResolvedValue('SR001'),
}));

const SummaryRecord = require('../summaryRecordsModel');

describe('summaryRecordsModel', () => {
  const base = {
    company_id: 'C01',
    zone_id: 'Z01',
    periodKey: 202401,
  };

  test('schema requires company_id, zone_id, periodKey', () => {
    const doc = new SummaryRecord({});
    const err = doc.validateSync();
    expect(err.errors.company_id).toBeDefined();
    expect(err.errors.zone_id).toBeDefined();
    expect(err.errors.periodKey).toBeDefined();
  });

  test('schema accepts valid summary', () => {
    const doc = new SummaryRecord(base);
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema defaults input_materials totals to 0', () => {
    const doc = new SummaryRecord(base);
    expect(doc.input_materials.total_materials).toBe(0);
    expect(doc.input_materials.total_materials_MET).toBe(0);
  });

  test('schema defaults fuels totals to 0', () => {
    const doc = new SummaryRecord(base);
    expect(doc.fuels.total_electricity).toBe(0);
    expect(doc.fuels.total_water).toBe(0);
    expect(doc.fuels.total_combustion).toBe(0);
  });

  test('schema defaults waste totals to 0', () => {
    const doc = new SummaryRecord(base);
    expect(doc.waste.total_waste_tan).toBe(0);
    expect(doc.waste.total_waste_DO).toBe(0);
  });

  test('schema defaults emissions total_co2 to 0', () => {
    const doc = new SummaryRecord(base);
    expect(doc.emissions.total_co2).toBe(0);
  });

  function runPreSaveHooks(doc) {
    return new Promise((resolve, reject) => {
      SummaryRecord.schema.s.hooks.execPre('save', doc, [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  test('pre-save generates _id for new doc', async () => {
    const doc = new SummaryRecord(base);
    doc.isNew = true;
    await runPreSaveHooks(doc);
    expect(doc._id).toBe('SR001');
  });

  test('pre-save skips _id generation when already set', async () => {
    const doc = new SummaryRecord({ ...base, _id: 'SR999' });
    doc.isNew = true;
    await runPreSaveHooks(doc);
    expect(doc._id).toBe('SR999');
  });
});
