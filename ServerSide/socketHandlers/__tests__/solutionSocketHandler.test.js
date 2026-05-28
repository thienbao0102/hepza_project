const events = require('../eventCatalog');
const { registerSolutionHandlers } = require('../solutionSocketHandler');

describe('solutionSocketHandler', () => {
  test('registers all expected events', () => {
    const on = jest.fn();
    const socket = { on };

    registerSolutionHandlers(socket);

    events.solution.forEach((eventName) => {
      expect(on).toHaveBeenCalledWith(eventName, expect.any(Function));
    });
  });
});
