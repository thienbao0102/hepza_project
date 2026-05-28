const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_PATTERN = /^\d{10,11}$/;

export const normalizeEmailInput = (value = '') => String(value || '').trim().toLowerCase();

export const normalizePhoneInput = (value = '') => String(value || '').replace(/\D/g, '');

export const validateFullName = (value, label = 'Họ và tên') => {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');

  if (!normalized) {
    return `${label} là bắt buộc.`;
  }

  if (normalized.length < 2) {
    return `${label} phải có ít nhất 2 ký tự.`;
  }

  return '';
};

export const validateEmail = (value) => {
  const normalized = normalizeEmailInput(value);

  if (!normalized) {
    return 'Email là bắt buộc.';
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    return 'Email không đúng định dạng. Ví dụ: ten@doanhnghiep.com';
  }

  return '';
};

export const validatePhoneNumber = (value) => {
  const normalized = normalizePhoneInput(value);

  if (!normalized) {
    return 'Số điện thoại là bắt buộc.';
  }

  if (!PHONE_PATTERN.test(normalized)) {
    return 'Số điện thoại phải gồm 10-11 chữ số.';
  }

  return '';
};

export const validatePasswordMinLength = (value, label = 'Mật khẩu') => {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return `${label} là bắt buộc.`;
  }

  if (normalized.length < 8) {
    return `${label} phải có ít nhất 8 ký tự.`;
  }

  return '';
};
