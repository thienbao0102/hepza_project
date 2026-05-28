export const downloadBlobFile = (response, fallbackName = 'export.xlsx') => {
  if (!response?.data) {
    console.warn('downloadBlobFile: empty response');
    return;
  }

  const headers = response.headers || {};
  const contentDisposition = headers['content-disposition'];

  let fileName = fallbackName;

  if (contentDisposition) {
    // RFC 5987 (UTF-8 filename)
    const utf8Match = contentDisposition.match(/filename\*\=UTF-8''(.+)/i);
    if (utf8Match?.[1]) {
      fileName = decodeURIComponent(utf8Match[1]);
    } else {
      const asciiMatch = contentDisposition.match(/filename="(.+)"/);
      if (asciiMatch?.[1]) fileName = asciiMatch[1];
    }
  }

  const blob = new Blob([response.data], {
    type: headers['content-type'] || 'application/octet-stream',
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  a.remove();
  window.URL.revokeObjectURL(url);
};
