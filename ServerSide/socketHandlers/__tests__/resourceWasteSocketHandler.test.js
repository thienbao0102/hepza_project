const events = require('../eventCatalog');
const { registerResourceWasteHandlers } = require('../resourceWasteSocketHandler');

describe('resourceWasteSocketHandler', () => {
  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerResourceWasteHandlers(socket);

    events.resourceWaste.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });
});
