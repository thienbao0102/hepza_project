const crypto = require('crypto');

const generateRandomPassword = () => {
  const length = 8;
  const charset =
    'abcdefghjkmnpqrstuvwxyz' +
    'ABCDEFGHJKMNPQRSTUVWXYZ' +
    '23456789' +
    '@#!';

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(charset.length);
    password += charset[randomIndex];
  }
  return password;
};

const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString(); // OTP 6 chữ số
};

module.exports = { generateRandomPassword, generateOtp };
