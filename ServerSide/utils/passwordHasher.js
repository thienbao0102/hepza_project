const bcrypt = require('bcrypt');

const DEFAULT_BCRYPT_ROUNDS = 11;

const getBcryptRounds = () => {
  const parsed = Number.parseInt(process.env.BCRYPT_ROUNDS || '', 10);

  if (!Number.isInteger(parsed) || parsed < 4 || parsed > 15) {
    return DEFAULT_BCRYPT_ROUNDS;
  }

  return parsed;
};

const hashPassword = async (plainTextPassword) => {
  return bcrypt.hash(plainTextPassword, getBcryptRounds());
};

const verifyPassword = async (plainTextPassword, hashedPassword) => {
  return bcrypt.compare(plainTextPassword, hashedPassword);
};

const getHashRounds = (hashedPassword) => {
  try {
    return bcrypt.getRounds(hashedPassword);
  } catch (_) {
    return null;
  }
};

const needsRehash = (hashedPassword) => {
  const currentRounds = getHashRounds(hashedPassword);
  if (!currentRounds) {
    return false;
  }

  return currentRounds < getBcryptRounds();
};

module.exports = {
  DEFAULT_BCRYPT_ROUNDS,
  getBcryptRounds,
  hashPassword,
  verifyPassword,
  needsRehash,
  getHashRounds,
};
