jest.mock('../../utils/autoIncrement', () => ({
  generateId: jest.fn().mockResolvedValue('WR001'),
}));

const WasteResource = require('../wasteResourcesModel');

describe('wasteResourcesModel', () => {
  const base = {
    wasteName: 'Chất thải rắn',
    quantity: 10,
    unit: 'Tấn',
    company_id: 'C001',
    zone_id: 'Z01',
    periodKey: 202401,
    main_group: 'DO',
  };

  test('schema requires wasteName, quantity, unit, company_id, zone_id, periodKey', () => {
    const doc = new WasteResource({});
    const err = doc.validateSync();
    expect(err.errors.wasteName).toBeDefined();
    expect(err.errors.quantity).toBeDefined();
    expect(err.errors.company_id).toBeDefined();
    expect(err.errors.zone_id).toBeDefined();
    expect(err.errors.periodKey).toBeDefined();
  });

  test('schema accepts valid DO waste', () => {
    const doc = new WasteResource(base);
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema accepts valid GASW waste', () => {
    const doc = new WasteResource({ ...base, main_group: 'GASW', unit: 'mg/l' });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema rejects invalid unit for GASW', () => {
    const doc = new WasteResource({ ...base, main_group: 'GASW', unit: 'Tấn' });
    const err = doc.validateSync();
    expect(err.errors.unit).toBeDefined();
  });

  test('schema rejects invalid main_group', () => {
    const doc = new WasteResource({ ...base, main_group: 'INVALID' });
    const err = doc.validateSync();
    expect(err.errors.main_group).toBeDefined();
  });

  test('schema defaults unit to Tấn', () => {
    const doc = new WasteResource({ ...base, unit: undefined });
    expect(doc.unit).toBe('Tấn');
  });

  test('schema defaults isDeleted to false', () => {
    const doc = new WasteResource(base);
    expect(doc.isDeleted).toBe(false);
  });

  test('schema has expected paths', () => {
    const schema = WasteResource.schema;
    expect(schema.paths.treatmentMethods).toBeDefined();
    expect(schema.paths.certifications).toBeDefined();
    expect(schema.paths.attachments).toBeDefined();
  });

  test('schema rejects negative quantity', () => {
    const doc = new WasteResource({ ...base, quantity: -1 });
    const err = doc.validateSync();
    expect(err.errors.quantity).toBeDefined();
  });

  function runPreSaveHooks(doc) {
    return new Promise((resolve, reject) => {
      WasteResource.schema.s.hooks.execPre('save', doc, [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  test('pre-save generates _id for new doc', async () => {
    const doc = new WasteResource(base);
    doc.isNew = true;
    await runPreSaveHooks(doc);
    expect(doc._id).toBe('WR001');
  });

  test('pre-save skips _id generation when already set', async () => {
    const doc = new WasteResource({ ...base, _id: 'WR999' });
    doc.isNew = true;
    await runPreSaveHooks(doc);
    expect(doc._id).toBe('WR999');
  });
});
