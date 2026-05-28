const { successAck, errorAck } = require('../socketResponse');

describe('socketResponse', () => {
  test('successAck shape', () => {
    expect(successAck({ id: 1 }, 'ok', { page: 1 })).toEqual({
      isSuccess: true,
      data: { id: 1 },
      message: 'ok',
      error: null,
      meta: { page: 1 },
    });
  });

  test('errorAck shape', () => {
    const rs = errorAck('bad request', { code: 'VALIDATION' });
    expect(rs.isSuccess).toBe(false);
    expect(rs.error).toBe('bad request');
  });
});
