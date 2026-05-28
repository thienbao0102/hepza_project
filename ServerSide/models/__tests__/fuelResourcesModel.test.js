const FuelResource = require('../fuelResourcesModel');

describe('fuelResourcesModel', () => {
  test('schema requires fuelName, quantity, unit', () => {
    const doc = new FuelResource({});
    const err = doc.validateSync();
    expect(err.errors.fuelName).toBeDefined();
    expect(err.errors.quantity).toBeDefined();
    expect(err.errors.unit).toBeDefined();
  });

  test('schema accepts valid el Grid', () => {
    const doc = new FuelResource({
      fuelName: 'Điện',
      quantity: 100,
      unit: 'kWh',
      company_id: 'C001',
      zone_id: 'Z01',
      periodKey: 202401,
      main_group: 'el',
      sub_group: 'Grid',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema rejects invalid sub_group for main_group', () => {
    const doc = new FuelResource({
      fuelName: 'Điện',
      quantity: 100,
      unit: 'kWh',
      company_id: 'C001',
      zone_id: 'Z01',
      periodKey: 202401,
      main_group: 'el',
      sub_group: 'tap',
    });
    const err = doc.validateSync();
    expect(err.errors.sub_group).toBeDefined();
  });

  test('schema accepts valid wa subgroup', () => {
    const doc = new FuelResource({
      fuelName: 'Nước',
      quantity: 50,
      unit: 'm3',
      company_id: 'C001',
      zone_id: 'Z01',
      periodKey: 202401,
      main_group: 'wa',
      sub_group: 'rain',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema accepts valid co subgroup', () => {
    const doc = new FuelResource({
      fuelName: 'Than',
      quantity: 10,
      unit: 'tấn',
      company_id: 'C001',
      zone_id: 'Z01',
      periodKey: 202401,
      main_group: 'co',
      sub_group: 'COL',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  test('schema has expected paths', () => {
    const schema = FuelResource.schema;
    expect(schema.paths.billImage).toBeDefined();
    expect(schema.paths.isDeleted).toBeDefined();
  });

  test('schema defaults isDeleted to false', () => {
    const doc = new FuelResource({
      fuelName: 'Xăng',
      quantity: 5,
      unit: 'lít',
      company_id: 'C001',
      zone_id: 'Z01',
      periodKey: 202401,
      main_group: 'co',
      sub_group: 'PET',
    });
    expect(doc.isDeleted).toBe(false);
  });
});
