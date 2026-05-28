jest.mock('../../models/abbreviationModel');

const Abbreviation = require('../../models/abbreviationModel');
const { loadAbbreviations, getName, getCode, convertUsingGetName } = require('../abbreviationInMemory');

describe('abbreviationInMemory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loadAbbreviations builds map from database', async () => {
    Abbreviation.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: 'MET', name_group: 'Kim loại' },
        { _id: 'WOOD', name_group: 'Gỗ' },
      ]),
    });
    await loadAbbreviations();
    expect(getName('MET')).toBe('Kim loại');
    expect(getName('WOOD')).toBe('Gỗ');
  });

  test('getName returns code when not found', () => {
    expect(getName('UNKNOWN')).toBe('UNKNOWN');
  });

  test('getCode returns matched code by exact normalized name', async () => {
    Abbreviation.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: 'MET', name_group: 'Kim loại' },
      ]),
    });
    await loadAbbreviations();
    expect(getCode('Kim loại')).toBe('MET');
  });

  test('getCode falls back to hardcoded map for water types', () => {
    expect(getCode('nước mưa')).toBe('rain');
    expect(getCode('nuoc may')).toBe('tap');
    expect(getCode('nước giếng')).toBe('well');
  });

  test('getCode falls back to hardcoded map for electricity', () => {
    expect(getCode('điện lưới')).toBe('Grid');
    expect(getCode('dien tai tao')).toBe('Renewable');
  });

  test('getCode falls back to hardcoded map for materials', () => {
    expect(getCode('kim loại')).toBe('MET');
    expect(getCode('go')).toBe('WOOD');
    expect(getCode('nhựa')).toBe('POL');
  });

  test('getCode returns raw name when no match and warns', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getCode('xyz-unknown')).toBe('xyz-unknown');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('xyz-unknown'));
    warnSpy.mockRestore();
  });

  test('getCode returns exact code if it exists as a key', async () => {
    Abbreviation.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: 'TAP', name_group: 'Nước máy' },
      ]),
    });
    await loadAbbreviations();
    expect(getCode('TAP')).toBe('TAP');
  });

  test('getCode returns hardcoded value when name is a hardcoded value', () => {
    expect(getCode('rain')).toBe('rain');
  });

  test('convertUsingGetName replaces known abbreviations in object values', async () => {
    Abbreviation.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: 'MET', name_group: 'Kim loại' },
      ]),
    });
    await loadAbbreviations();
    const result = convertUsingGetName({ type: 'MET', qty: 10 });
    expect(result.type).toBe('Kim loại');
    expect(result.qty).toBe(10);
  });
});
