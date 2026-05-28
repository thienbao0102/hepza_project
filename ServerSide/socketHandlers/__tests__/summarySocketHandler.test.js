const events = require('../eventCatalog');
const { registerSummaryHandlers } = require('../summarySocketHandler');

describe('summarySocketHandler', () => {
  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerSummaryHandlers(socket);

    events.summary.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });
});
