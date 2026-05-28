const { successAck, errorAck } = require('./socketResponse');

const registerDomainHandlers = (socket, handlers) => {
  handlers.forEach((h) => {
    socket.on(h.event, async (payload = {}, cb) => {
      try {
        const result = await h.execute({ socket, payload });
        const ack = successAck(result, h.message || 'success', null);

        if (typeof cb === 'function') return cb(ack);
        socket.emit(`${h.event}:response`, ack);
      } catch (error) {
        const ack = errorAck(error?.message || 'Internal Server Error', {
          statusCode: error?.statusCode || 400,
          code: error?.code || 'SERVER_ERROR',
        });

        if (typeof cb === 'function') return cb(ack);
        socket.emit(`${h.event}:response`, ack);
      }
    });
  });
};

module.exports = { registerDomainHandlers };
