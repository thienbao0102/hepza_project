export const buildUrl = (baseUrl, pathname, query = {}) => {
  const search = [];

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          search.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
        }
      });
      return;
    }

    search.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });

  if (!search.length) {
    return `${baseUrl}${pathname}`;
  }

  return `${baseUrl}${pathname}?${search.join('&')}`;
};
