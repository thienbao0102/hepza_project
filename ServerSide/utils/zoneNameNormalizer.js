const removeDiacritics = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

const normalizeZoneSearchText = (value = '') => (
  removeDiacritics(value)
    .toUpperCase()
    .replace(/[()/_.,-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const normalizeZoneNameForCompare = (value = '') => {
  let normalized = normalizeZoneSearchText(value);

  normalized = normalized
    .replace(/\bKHU\s+CONG\s+NGHIEP\b/g, 'KCN')
    .replace(/\bKHU\s+CHE\s+XUAT\b/g, 'KCX')
    .replace(/\bVIET\s*NAM\s*-\s*SINGAPORE\b/g, 'VSIP')
    .replace(/\bVIET\s*NAM\s+SINGAPORE\b/g, 'VSIP')
    .replace(/\bVIETNAM\s*-\s*SINGAPORE\b/g, 'VSIP')
    .replace(/\bVIETNAM\s+SINGAPORE\b/g, 'VSIP')
    .replace(/[()/_.,-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
};

module.exports = {
  normalizeZoneSearchText,
  normalizeZoneNameForCompare,
};
