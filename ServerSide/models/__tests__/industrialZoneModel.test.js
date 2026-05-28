jest.mock('../../utils/zoneNameNormalizer', () => ({
  normalizeZoneNameForCompare: jest.fn((v) => v?.toLowerCase()),
  normalizeZoneSearchText: jest.fn((v) => v?.toLowerCase()),
}));

jest.mock('../../utils/autoIncrement', () => ({
  generateId: jest.fn().mockResolvedValue('Z001'),
}));

const IndustrialZone = require('../industrialZoneModel');

describe('industrialZoneModel', () => {
  test('schema requires zone_name and zone_type', () => {
    const doc = new IndustrialZone({});
    const err = doc.validateSync();
    expect(err.errors.zone_name).toBeDefined();
    expect(err.errors.zone_type).toBeDefined();
  });

  test('schema accepts valid KCN type', () => {
    const doc = new IndustrialZone({ zone_name: 'Zone A', zone_type: 'KCN' });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema accepts valid KCX type', () => {
    const doc = new IndustrialZone({ zone_name: 'Zone B', zone_type: 'KCX' });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema rejects invalid zone_type', () => {
    const doc = new IndustrialZone({ zone_name: 'Zone C', zone_type: 'INVALID' });
    const err = doc.validateSync();
    expect(err.errors.zone_type).toBeDefined();
  });

  test('schema defaults location', () => {
    const doc = new IndustrialZone({ zone_name: 'Zone D', zone_type: 'KCN' });
    expect(doc.location).toBe('Chưa cập nhật');
  });

  test('schema defaults status to active', () => {
    const doc = new IndustrialZone({ zone_name: 'Zone E', zone_type: 'KCN' });
    expect(doc.status).toBe('active');
  });

  test('schema has expected paths', () => {
    const schema = IndustrialZone.schema;
    expect(schema.paths.managers_ids).toBeDefined();
    expect(schema.paths.deleted_at).toBeDefined();
  });

  function runPreSaveHooks(doc) {
    return new Promise((resolve, reject) => {
      IndustrialZone.schema.s.hooks.execPre('save', doc, [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  test('pre-save generates zone_id for KCN', async () => {
    const doc = new IndustrialZone({ zone_name: 'Zone A', zone_type: 'KCN' });
    doc.isNew = true;
    await runPreSaveHooks(doc);
    expect(doc.zone_id).toBeDefined();
  });

  test('pre-save generates zone_id for KCX', async () => {
    const doc = new IndustrialZone({ zone_name: 'Zone B', zone_type: 'KCX' });
    doc.isNew = true;
    await runPreSaveHooks(doc);
    expect(doc.zone_id).toBeDefined();
  });

  test('pre-save skips zone_id generation when not new', async () => {
    const doc = new IndustrialZone({ zone_name: 'Zone D', zone_type: 'KCN', zone_id: 'Z99' });
    doc.isNew = false;
    await runPreSaveHooks(doc);
    expect(doc.zone_id).toBe('Z99');
  });

  test('pre-save normalizes zone_name and location', async () => {
    const doc = new IndustrialZone({ zone_name: 'Zone E', zone_type: 'KCN', location: 'Hanoi' });
    doc.isNew = false;
    await runPreSaveHooks(doc);
    expect(doc.zone_name_normalized).toBe('zone e');
    expect(doc.location_normalized).toBe('hanoi');
  });

  test('pre-save builds search_text', async () => {
    const doc = new IndustrialZone({ zone_name: 'Zone F', zone_type: 'KCN', zone_id: 'Z01', location: 'HCMC' });
    doc.isNew = false;
    await runPreSaveHooks(doc);
    expect(doc.search_text).toBeDefined();
  });
});
