class ApiError extends Error {
  constructor(message, status, code, response = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.response = response;
  }
}

export default ApiError;
