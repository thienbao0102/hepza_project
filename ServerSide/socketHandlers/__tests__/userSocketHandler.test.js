const events = require('../eventCatalog');
const { registerUserHandlers } = require('../userSocketHandler');

describe('userSocketHandler', () => {
  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerUserHandlers(socket);

    events.user.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });
});
