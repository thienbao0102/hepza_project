const events = require('../eventCatalog');
const { registerZoneHandlers } = require('../zoneSocketHandler');

describe('zoneSocketHandler', () => {
  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerZoneHandlers(socket);

    events.zone.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });
});
