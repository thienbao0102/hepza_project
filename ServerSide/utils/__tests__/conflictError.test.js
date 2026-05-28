const { VersionConflictError, MissingVersionError, StateConflictError } = require('../conflictError');

describe('conflictError classes', () => {
  test('VersionConflictError has correct defaults', () => {
    const err = new VersionConflictError();
    expect(err.name).toBe('VersionConflictError');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('VERSION_CONFLICT');
    expect(err.message).toContain('thay đổi');
  });

  test('VersionConflictError accepts custom message', () => {
    const err = new VersionConflictError('custom message');
    expect(err.message).toBe('custom message');
  });

  test('MissingVersionError has correct defaults', () => {
    const err = new MissingVersionError();
    expect(err.name).toBe('MissingVersionError');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('VERSION_REQUIRED');
  });

  test('StateConflictError has correct defaults', () => {
    const err = new StateConflictError();
    expect(err.name).toBe('StateConflictError');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('STATE_CONFLICT');
  });
});
