jest.mock('../../models/counterModel');

const Counter = require('../../models/counterModel');
const { generateId, generateCompanyId } = require('../autoIncrement');

describe('autoIncrement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('generateId returns formatted id with default 3 digits', async () => {
    Counter.findOneAndUpdate.mockResolvedValue({ sequence_value: 5, digits: 3 });
    const id = await generateId('user', 'U');
    expect(id).toBe('U005');
    expect(Counter.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'user' },
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  });

  test('generateId uses minDigits when digits field missing', async () => {
    Counter.findOneAndUpdate.mockResolvedValue({ sequence_value: 12 });
    const id = await generateId('report', 'R');
    expect(id).toBe('R012');
  });

  test('generateCompanyId formats with zoneId and 5 digits', async () => {
    Counter.findOneAndUpdate.mockResolvedValue({ sequence_value: 7, digits: 5 });
    const id = await generateCompanyId('Z01');
    expect(id).toBe('Z01DN00007');
  });

  test('generateCompanyId uses default 5 digits when missing', async () => {
    Counter.findOneAndUpdate.mockResolvedValue({ sequence_value: 3 });
    const id = await generateCompanyId('Z99');
    expect(id).toBe('Z99DN00003');
  });
});
