const events = require('../eventCatalog');
const { registerRegulationHandlers } = require('../regulationSocketHandler');

describe('regulationSocketHandler', () => {
  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerRegulationHandlers(socket);

    events.regulation.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });
});
