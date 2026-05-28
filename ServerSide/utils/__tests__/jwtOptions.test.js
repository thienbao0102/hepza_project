const {
  JWT_ALGORITHM,
  JWT_VERIFY_OPTIONS,
  buildJwtSignOptions,
} = require('../jwtOptions');

describe('jwtOptions', () => {
  test('exposes an HS256 verify allowlist only', () => {
    expect(JWT_ALGORITHM).toBe('HS256');
    expect(JWT_VERIFY_OPTIONS).toEqual({ algorithms: ['HS256'] });
  });

  test('buildJwtSignOptions merges caller options while forcing HS256', () => {
    expect(buildJwtSignOptions({ expiresIn: '15m', issuer: 'hepza' })).toEqual({
      expiresIn: '15m',
      issuer: 'hepza',
      algorithm: 'HS256',
    });
  });

  test('buildJwtSignOptions forces HS256 even when caller passes different algorithm', () => {
    const opts = buildJwtSignOptions({ algorithm: 'RS256' });
    expect(opts.algorithm).toBe('HS256');
  });

  test('buildJwtSignOptions works with empty options', () => {
    expect(buildJwtSignOptions()).toEqual({ algorithm: 'HS256' });
  });
});
