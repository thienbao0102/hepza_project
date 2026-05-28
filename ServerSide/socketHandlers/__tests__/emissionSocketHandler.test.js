const events = require('../eventCatalog');
const { registerEmissionHandlers } = require('../emissionSocketHandler');

describe('emissionSocketHandler', () => {
  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerEmissionHandlers(socket);

    events.emission.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });
});
