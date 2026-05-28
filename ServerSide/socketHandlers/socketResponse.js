const successAck = (data = null, message = 'success', meta = null) => ({
  isSuccess: true,
  data,
  message,
  error: null,
  meta,
});

const errorAck = (error = 'Internal Server Error', meta = null) => ({
  isSuccess: false,
  data: null,
  message: null,
  error,
  meta,
});

module.exports = { successAck, errorAck };
