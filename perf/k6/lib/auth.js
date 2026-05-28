import http from 'k6/http';
import { check, fail } from 'k6';

const ACCESS_COOKIE_NAMES = ['__Secure-authToken', 'authToken'];
const CSRF_COOKIE_NAMES = ['__Secure-csrfToken', 'csrfToken'];
const REFRESH_WINDOW_MS = 13 * 60 * 1000;

let activeSession = null;

/**
 * Generate a deterministic fake IP for each K6 VU.
 * This helps avoid rate-limit collisions when all requests originate
 * from the same K6 runner (same source IP).
 */
const getFakeIp = () => {
  const vu = typeof __VU !== 'undefined' ? __VU : 1;
  const seg2 = (vu * 7 + 13) % 256;
  const seg3 = (vu * 31 + 47) % 256;
  const seg4 = (vu * 101 + 17) % 256;
  return `10.${seg2}.${seg3}.${seg4}`;
};

const extractCookieFromResponse = (response, names) => {
  for (const name of names) {
    const values = response.cookies ? response.cookies[name] : undefined;
    if (values && values.length > 0) {
      return values[0].value;
    }
  }
  return null;
};

const extractCookieFromJar = (baseUrl, names) => {
  const jar = http.cookieJar();
  const cookies = jar.cookiesForURL(baseUrl);

  for (const name of names) {
    const values = cookies ? cookies[name] : undefined;
    if (values && values.length > 0) {
      return values[0];
    }
  }

  return null;
};

const login = (baseUrl, user, tags = {}) => {
  const loginTags = Object.assign({}, tags, {
    endpoint: 'login',
    kind: 'auth',
  });

  const response = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': getFakeIp(),
      },
      tags: loginTags,
    }
  );

  const ok = check(response, {
    'login status is 200': (res) => res.status === 200,
  });

  if (!ok) {
    fail(`Login failed for ${user.email}: status=${response.status} body=${response.body}`);
  }

  activeSession = {
    email: user.email,
    csrfToken:
      extractCookieFromResponse(response, CSRF_COOKIE_NAMES) ||
      extractCookieFromJar(baseUrl, CSRF_COOKIE_NAMES),
    authenticatedAt: Date.now(),
    accessToken:
      extractCookieFromResponse(response, ACCESS_COOKIE_NAMES) ||
      extractCookieFromJar(baseUrl, ACCESS_COOKIE_NAMES),
  };

  if (!activeSession.csrfToken) {
    fail(`CSRF cookie was not set for ${user.email}`);
  }

  return activeSession;
};

const refresh = (baseUrl, tags = {}) => {
  if (!activeSession) return null;

  const refreshTags = Object.assign({}, tags, {
    endpoint: 'refresh',
    kind: 'auth',
  });

  const response = http.post(`${baseUrl}/api/auth/refresh`, null, {
    headers: {
      'X-Forwarded-For': getFakeIp(),
    },
    tags: refreshTags,
  });

  const ok = check(response, {
    'refresh status is 200/202': (res) => res.status === 200 || res.status === 202,
  });

  if (!ok) {
    return null;
  }

  const nextCsrfToken =
    extractCookieFromResponse(response, CSRF_COOKIE_NAMES) ||
    extractCookieFromJar(baseUrl, CSRF_COOKIE_NAMES) ||
    activeSession.csrfToken;

  activeSession = Object.assign({}, activeSession, {
    csrfToken: nextCsrfToken,
    authenticatedAt: Date.now(),
  });

  return activeSession;
};

export const ensureSession = (baseUrl, user, tags = {}) => {
  if (!activeSession || activeSession.email !== user.email) {
    return login(baseUrl, user, tags);
  }

  if (Date.now() - activeSession.authenticatedAt >= REFRESH_WINDOW_MS) {
    return refresh(baseUrl, tags) || login(baseUrl, user, tags);
  }

  return activeSession;
};

export const withAuth = (_baseUrl, tags = {}, options = {}) => {
  const headers = {
    'X-Forwarded-For': getFakeIp(),
  };

  if (options.json !== false) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.csrf !== false && activeSession && activeSession.csrfToken) {
    headers['x-csrf-token'] = activeSession.csrfToken;
  }

  // Force append cookies manually because K6's internal jar may drop Secure/SameSite cookies
  if (activeSession && activeSession.accessToken && activeSession.csrfToken) {
    const authCookieName = _baseUrl.includes('localhost') ? 'authToken' : '__Secure-authToken';
    const csrfCookieName = _baseUrl.includes('localhost') ? 'csrfToken' : '__Secure-csrfToken';
    headers['Cookie'] = `${authCookieName}=${activeSession.accessToken}; ${csrfCookieName}=${activeSession.csrfToken}`;
  }

  return {
    headers,
    tags,
  };
};

export const getCookieHeader = (baseUrl) => {
  const cookies = http.cookieJar().cookiesForURL(baseUrl);
  return Object.entries(cookies)
    .flatMap(([name, values]) => values.map((value) => `${name}=${value}`))
    .join('; ');
};
