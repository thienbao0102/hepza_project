const events = require('../eventCatalog');
const { registerIndustryHandlers } = require('../industrySocketHandler');

describe('industrySocketHandler', () => {
  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerIndustryHandlers(socket);

    events.industry.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });
});
