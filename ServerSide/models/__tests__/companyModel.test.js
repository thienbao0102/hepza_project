jest.mock('../../utils/autoIncrement', () => ({
  generateCompanyId: jest.fn().mockResolvedValue('Z01DN00001'),
}));

jest.mock('../../models/industrialZoneModel', () => ({
  findOne: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue({ zone_id: 'Z01' }) }),
}));

const { generateCompanyId } = require('../../utils/autoIncrement');
const IndustrialZone = require('../../models/industrialZoneModel');
const Company = require('../companyModel');

describe('companyModel', () => {
  const base = {
    company_name: 'Test',
    company_registration_number: '0312345678',
    zone_id: 'Z01',
    industry: ['A'],
    industry_group: ['G1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    IndustrialZone.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue({ zone_id: 'Z01' }) });
  });

  test('schema accepts valid company_registration_number 10 digits', () => {
    const doc = new Company(base);
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema accepts valid company_registration_number 13 digits', () => {
    const doc = new Company({ ...base, company_registration_number: '0312345678-001' });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema rejects invalid registration number', () => {
    const doc = new Company({ ...base, company_registration_number: 'abc' });
    const err = doc.validateSync();
    expect(err.errors.company_registration_number).toBeDefined();
  });

  test('schema accepts valid website', () => {
    const doc = new Company({ ...base, website: 'https://example.com' });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema rejects invalid website', () => {
    const doc = new Company({ ...base, website: 'not-a-url' });
    const err = doc.validateSync();
    expect(err.errors.website).toBeDefined();
  });

  test('schema normalizes empty address to undefined', () => {
    const doc = new Company({ ...base, address: '   ' });
    expect(doc.address).toBeUndefined();
  });

  test('schema normalizes null address to undefined', () => {
    const doc = new Company({ ...base, address: null });
    expect(doc.address).toBeUndefined();
  });

  test('schema normalizes address with whitespace', () => {
    const doc = new Company({ ...base, address: '  Hanoi  ' });
    expect(doc.address).toBe('Hanoi');
  });

  test('schema rejects founded_year before 1800', () => {
    const doc = new Company({ ...base, founded_year: 1700 });
    const err = doc.validateSync();
    expect(err.errors.founded_year).toBeDefined();
  });

  test('schema rejects future founded_year', () => {
    const doc = new Company({ ...base, founded_year: new Date().getFullYear() + 1 });
    const err = doc.validateSync();
    expect(err.errors.founded_year).toBeDefined();
  });

  test('schema rejects invalid status enum', () => {
    const doc = new Company({ ...base, status: 'Invalid' });
    const err = doc.validateSync();
    expect(err.errors.status).toBeDefined();
  });

  test('schema accepts valid license', () => {
    const doc = new Company({
      ...base,
      licenses: [{
        license_id: 'L001',
        license_name: 'Test',
        issuing_authority: 'Auth',
        issue_date: new Date('2024-01-01'),
        expiry_date: new Date('2025-01-01'),
      }],
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema rejects license expiry before issue date', () => {
    const doc = new Company({
      ...base,
      licenses: [{
        license_id: 'L001',
        license_name: 'Test',
        issuing_authority: 'Auth',
        issue_date: new Date('2024-06-01'),
        expiry_date: new Date('2024-01-01'),
      }],
    });
    const err = doc.validateSync();
    expect(err.errors['licenses.0.expiry_date']).toBeDefined();
  });

  test('schema rejects negative total_workers', () => {
    const doc = new Company({ ...base, total_workers: -1 });
    const err = doc.validateSync();
    expect(err.errors.total_workers).toBeDefined();
  });

  test('schema rejects invalid revenue_currency', () => {
    const doc = new Company({ ...base, revenue_currency: 'EUR' });
    const err = doc.validateSync();
    expect(err.errors.revenue_currency).toBeDefined();
  });

  test('schema has expected paths', () => {
    const schema = Company.schema;
    expect(schema.paths.company_id).toBeDefined();
    expect(schema.paths.company_name).toBeDefined();
    expect(schema.paths.deleted_at).toBeDefined();
  });

  test('schema defaults status to active', () => {
    const doc = new Company(base);
    expect(doc.status).toBe('Đang hoạt động');
  });

  test('schema defaults revenue_currency to null enum', () => {
    const doc = new Company(base);
    expect(doc.revenue_currency).toBeUndefined();
  });

  function runPreSaveHooks(doc) {
    return new Promise((resolve, reject) => {
      Company.schema.s.hooks.execPre('save', doc, [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  test('pre-save updates license status to expired', async () => {
    const doc = new Company({
      ...base,
      company_id: 'EXISTING',
      licenses: [{
        license_id: 'L001',
        license_name: 'Test',
        issuing_authority: 'Auth',
        issue_date: new Date('2020-01-01'),
        expiry_date: new Date('2020-02-01'),
      }],
    });
    await runPreSaveHooks(doc);
    expect(doc.licenses[0].status).toBe('Hết hạn');
  });

  test('pre-save updates license status to expiring soon', async () => {
    const today = new Date();
    const expiry = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const doc = new Company({
      ...base,
      company_id: 'EXISTING',
      licenses: [{
        license_id: 'L001',
        license_name: 'Test',
        issuing_authority: 'Auth',
        issue_date: new Date('2020-01-01'),
        expiry_date: expiry,
      }],
    });
    await runPreSaveHooks(doc);
    expect(doc.licenses[0].status).toBe('Sắp hết hạn');
  });

  test('pre-save keeps license status valid when far expiry', async () => {
    const today = new Date();
    const expiry = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const doc = new Company({
      ...base,
      company_id: 'EXISTING',
      licenses: [{
        license_id: 'L001',
        license_name: 'Test',
        issuing_authority: 'Auth',
        issue_date: new Date('2020-01-01'),
        expiry_date: expiry,
      }],
    });
    await runPreSaveHooks(doc);
    expect(doc.licenses[0].status).toBe('Hiệu lực');
  });

  test('pre-save generates company_id with zone', async () => {
    generateCompanyId.mockResolvedValue('C001');
    const doc = new Company({ ...base });
    await runPreSaveHooks(doc);
    expect(doc.company_id).toBe('C001');
    expect(IndustrialZone.findOne).toHaveBeenCalledWith({ zone_id: 'Z01', deleted_at: null });
  });

  test('pre-save throws when zone not found', async () => {
    IndustrialZone.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null) });
    const doc = new Company({ ...base, zone_id: 'Z99' });
    await expect(runPreSaveHooks(doc)).rejects.toThrow(/Industrial Zone with zone_id Z99 not found/);
  });

  test('pre-save does not regenerate company_id for existing doc', async () => {
    generateCompanyId.mockResolvedValue('C003');
    const doc = new Company({ ...base, company_id: 'OLD01' });
    doc.isNew = false;
    await runPreSaveHooks(doc);
    expect(doc.company_id).toBe('OLD01');
    expect(generateCompanyId).not.toHaveBeenCalled();
  });
});
