const events = require('../eventCatalog');
const { registerNotificationHandlers } = require('../notificationSocketHandler');

describe('notificationSocketHandler', () => {
  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerNotificationHandlers(socket);

    events.notification.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });
});
