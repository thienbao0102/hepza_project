const collectNormalizedText = (value, bucket = []) => {
  if (value === null || value === undefined) return bucket;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    bucket.push(String(value).toLowerCase());
    return bucket;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectNormalizedText(item, bucket));
    return bucket;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectNormalizedText(item, bucket));
  }

  return bucket;
};

const hasAll = (haystack, ...needles) => needles.every((needle) => haystack.includes(needle));

export const resolveErrorCode = (error) => {
  const normalizedMessage = collectNormalizedText([
    error?.code,
    error?.message,
    error?.error,
    error?.response?.data,
    error?.data,
  ]).join(' | ');

  if (
    normalizedMessage.includes('too many requests') ||
    normalizedMessage.includes('đợi 10 giây') ||
    normalizedMessage.includes('đợi 1 phút') ||
    normalizedMessage.includes('tránh spam')
  ) {
    return 'TOO_MANY_REQUESTS';
  }

  if (
    normalizedMessage.includes('state_conflict') ||
    normalizedMessage.includes('record has already been') ||
    normalizedMessage.includes('thay đổi trạng thái')
  ) {
    return 'STATE_CONFLICT';
  }

  if (
    normalizedMessage.includes('version_conflict') ||
    normalizedMessage.includes('version_required') ||
    normalizedMessage.includes('dữ liệu đã bị thay đổi bởi người khác') ||
    normalizedMessage.includes('thiếu phiên bản dữ liệu hiện tại')
  ) {
    return 'VERSION_CONFLICT';
  }

  if (
    normalizedMessage.includes('chỉ được phép có 1 tài khoản') ||
    (normalizedMessage.includes('công ty') && normalizedMessage.includes('đã có tài khoản'))
  ) {
    return 'DUPLICATE_USER_COMPANY';
  }

  if (normalizedMessage.includes('đã có manager') || normalizedMessage.includes('gán 1 manager')) {
    return 'DUPLICATE_MANAGER_ZONE';
  }

  if (
    normalizedMessage.includes('zone_name_1') ||
    (normalizedMessage.includes('zone') && normalizedMessage.includes('duplicate'))
  ) {
    return 'DUPLICATE_ZONE_NAME';
  }

  if (
    normalizedMessage.includes('email_1') ||
    (normalizedMessage.includes('email') && normalizedMessage.includes('duplicate')) ||
    (normalizedMessage.includes('email') && normalizedMessage.includes('exist')) ||
    (normalizedMessage.includes('email') && normalizedMessage.includes('taken')) ||
    (normalizedMessage.includes('email') && normalizedMessage.includes('đã được dùng'))
  ) {
    return 'DUPLICATE_EMAIL';
  }

  if (
    normalizedMessage.includes('phone_number_1') ||
    (normalizedMessage.includes('phone') && normalizedMessage.includes('duplicate')) ||
    (normalizedMessage.includes('số điện thoại') && normalizedMessage.includes('tồn tại')) ||
    (normalizedMessage.includes('số điện thoại') && normalizedMessage.includes('đã được dùng'))
  ) {
    return 'DUPLICATE_PHONE';
  }

  if (
    normalizedMessage.includes('tài khoản đại diện') &&
    (normalizedMessage.includes('bắt buộc') || normalizedMessage.includes('thiếu'))
  ) {
    return 'MISSING_REPRESENTATIVE_ACCOUNT';
  }

  if (
    normalizedMessage.includes('company_name_1') ||
    normalizedMessage.includes('duplicate company name')
  ) {
    return 'DUPLICATE_COMPANY_NAME';
  }

  if (
    normalizedMessage.includes('company_id_1') ||
    normalizedMessage.includes('duplicate company id')
  ) {
    return 'DUPLICATE_COMPANY_ID';
  }

  if (
    normalizedMessage.includes('license_id_1') ||
    (normalizedMessage.includes('license') && normalizedMessage.includes('duplicate'))
  ) {
    return 'DUPLICATE_LICENSE_ID';
  }

  if (hasAll(normalizedMessage, 'location', 'required')) return 'MISSING_LOCATION';
  if (hasAll(normalizedMessage, 'zone_name', 'required')) return 'MISSING_ZONE_NAME';

  if (
    (normalizedMessage.includes('founded_year') || normalizedMessage.includes('established_year')) &&
    normalizedMessage.includes('required')
  ) {
    return 'MISSING_FOUNDED_YEAR';
  }

  if (hasAll(normalizedMessage, 'address', 'required')) return 'MISSING_ADDRESS';
  if (hasAll(normalizedMessage, 'total_workers', 'required')) return 'MISSING_TOTAL_WORKERS';
  if (hasAll(normalizedMessage, 'license_name', 'required')) return 'MISSING_LICENSE_NAME';
  if (hasAll(normalizedMessage, 'license_id', 'required')) return 'MISSING_LICENSE_ID';
  if (hasAll(normalizedMessage, 'company_type', 'required')) return 'MISSING_COMPANY_TYPE';
  if (hasAll(normalizedMessage, 'industry_group', 'required')) return 'MISSING_INDUSTRY_GROUP';

  if (normalizedMessage.includes('industry') && normalizedMessage.includes('required')) {
    if (!normalizedMessage.includes('group')) return 'MISSING_INDUSTRY';
  }

  if (normalizedMessage.includes('zone') && normalizedMessage.includes('required')) {
    return 'MISSING_ZONE';
  }

  if (normalizedMessage.includes('not found') || normalizedMessage.includes('không tìm thấy')) {
    if (normalizedMessage.includes('manager')) return 'MANAGER_NOT_FOUND';
    if (normalizedMessage.includes('zone') || normalizedMessage.includes('khu công nghiệp')) return 'ZONE_NOT_FOUND';
    if (normalizedMessage.includes('company') || normalizedMessage.includes('doanh nghiệp')) return 'COMPANY_NOT_FOUND';
    if (normalizedMessage.includes('license') || normalizedMessage.includes('giấy phép')) return 'LICENSE_NOT_FOUND';
    if (normalizedMessage.includes('user') || normalizedMessage.includes('tài khoản')) return 'USER_NOT_FOUND';
    if (normalizedMessage.includes('solution') || normalizedMessage.includes('giải pháp')) return 'SOLUTION_NOT_FOUND';
  }

  if (normalizedMessage.includes('không có thay đổi') || normalizedMessage.includes('no change')) {
    return 'NO_CHANGES';
  }

  if (
    (normalizedMessage.includes('url') && normalizedMessage.includes('hợp lệ')) ||
    normalizedMessage.includes('invalid url')
  ) {
    return 'INVALID_LINK';
  }

  if (
    normalizedMessage.includes('solution_name_1') ||
    (normalizedMessage.includes('giải pháp') &&
      normalizedMessage.includes('tồn tại') &&
      !normalizedMessage.includes('không'))
  ) {
    return 'DUPLICATE_SOLUTION_NAME';
  }

  if (
    (normalizedMessage.includes('tên giải pháp') && normalizedMessage.includes('bắt buộc')) ||
    hasAll(normalizedMessage, 'solution_name', 'required')
  ) {
    return 'MISSING_SOLUTION_NAME';
  }

  if (
    (normalizedMessage.includes('nhóm giải pháp') && normalizedMessage.includes('bắt buộc')) ||
    hasAll(normalizedMessage, 'group_solution', 'required')
  ) {
    return 'MISSING_GROUP_SOLUTION';
  }

  if (normalizedMessage.includes('hashtag') && normalizedMessage.includes('không tồn tại')) {
    return 'INVALID_TAGS';
  }

  if (
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('validation') ||
    normalizedMessage.includes('must be a number') ||
    normalizedMessage.includes('không hợp lệ')
  ) {
    return 'INVALID_DATA';
  }

  return 'INTERNAL_ERROR';
};
