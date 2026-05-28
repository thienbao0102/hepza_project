const events = require('../eventCatalog');
const { registerCompanyHandlers } = require('../companySocketHandler');

describe('companySocketHandler', () => {
  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerCompanyHandlers(socket);

    events.company.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });
});
