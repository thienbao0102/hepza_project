const JWT_ALGORITHM = 'HS256';

const JWT_VERIFY_OPTIONS = {
  algorithms: [JWT_ALGORITHM],
};

const buildJwtSignOptions = (options = {}) => ({
  ...options,
  algorithm: JWT_ALGORITHM,
});

module.exports = {
  JWT_ALGORITHM,
  JWT_VERIFY_OPTIONS,
  buildJwtSignOptions,
};
