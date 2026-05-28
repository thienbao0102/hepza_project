const cacheManager = require('../lib/cacheManager');

const TAX_LOOKUP_CACHE_TTL_SECONDS = 10 * 24 * 60 * 60; // 10 days
const VIETQR_LOOKUP_URL = 'https://api.vietqr.io/v2/business';
const TAX_CODE_REGEX = /^\d{10}(-\d{3})?$/;

const normalizeTaxCode = (taxCode) => String(taxCode || '').trim();

const extractLookupData = (payload = {}) => {
  const data = payload?.data || payload?.result || payload;
  const companyName =
    data?.name ||
    data?.companyName ||
    data?.company_name ||
    data?.businessName ||
    null;
  const address =
    data?.address ||
    data?.businessAddress ||
    data?.companyAddress ||
    null;

  return {
    company_name: companyName,
    address,
    raw: data,
  };
};

const lookupTaxCode = async (taxCode) => {
  const normalizedTaxCode = normalizeTaxCode(taxCode);
  if (!TAX_CODE_REGEX.test(normalizedTaxCode)) {
    throw new Error('Mã số thuế không đúng định dạng. Vui lòng nhập 10 chữ số hoặc 13 chữ số chi nhánh.');
  }

  const cacheKey = `tax_lookup:${normalizedTaxCode}`;
  const cached = await cacheManager.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      tax_code: normalizedTaxCode,
      cached: true,
    };
  }

  const response = await fetch(`${VIETQR_LOOKUP_URL}/${encodeURIComponent(normalizedTaxCode)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.desc || payload?.message || 'Không thể tra cứu MST từ VietQR.');
  }

  if (payload?.code && payload.code !== '00') {
    throw new Error(payload?.desc || 'Không tìm thấy dữ liệu doanh nghiệp theo MST.');
  }

  const extracted = extractLookupData(payload);
  if (!extracted.company_name && !extracted.address) {
    throw new Error('Không nhận được dữ liệu tên và địa chỉ doanh nghiệp từ MST.');
  }

  const result = {
    tax_code: normalizedTaxCode,
    company_name: extracted.company_name,
    address: extracted.address,
    source: 'vietqr',
    cached: false,
  };

  await cacheManager.set(cacheKey, result, TAX_LOOKUP_CACHE_TTL_SECONDS);
  return result;
};

module.exports = {
  lookupTaxCode,
};
