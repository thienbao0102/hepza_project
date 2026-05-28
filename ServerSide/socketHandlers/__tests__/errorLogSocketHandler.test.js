const events = require('../eventCatalog');
const { registerErrorLogHandlers } = require('../errorLogSocketHandler');

describe('errorLogSocketHandler', () => {
  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerErrorLogHandlers(socket);

    events.errorLog.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });
});
