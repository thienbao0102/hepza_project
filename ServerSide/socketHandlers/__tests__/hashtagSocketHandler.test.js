const events = require('../eventCatalog');
const { registerHashtagHandlers } = require('../hashtagSocketHandler');

describe('hashtagSocketHandler', () => {
  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerHashtagHandlers(socket);

    events.hashtag.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });
});
