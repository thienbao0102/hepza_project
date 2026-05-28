import http from 'k6/http';
import { check, sleep } from 'k6';
import { ensureSession, withAuth } from './lib/auth.js';
import { buildUrl } from './lib/http.js';
import { resolvePeriodWindow, randomThinkTime } from './lib/time.js';
import { getAssignedUser, validateUserPool } from './lib/users.js';

const baseUrl = (__ENV.BASE_URL || '').replace(/\/$/, '');
const targetUsers = Number(__ENV.TARGET_EXPORT_USERS || 10);
const rampUpSeconds = Number(__ENV.RAMP_UP_SECONDS || 120);
const holdSeconds = Number(__ENV.HOLD_SECONDS || 300);
const rampDownSeconds = Number(__ENV.RAMP_DOWN_SECONDS || 120);
const flowFilter = (user) => ['export_download', 'export_light'].includes(user.flow);

if (!baseUrl) {
  throw new Error('BASE_URL is required, for example BASE_URL=https://api2.hepza.click');
}

validateUserPool(targetUsers, flowFilter);

const { periodStart, periodEnd } = resolvePeriodWindow();

export const options = {
  scenarios: {
    export_download: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: `${rampUpSeconds}s`, target: targetUsers },
        { duration: `${holdSeconds}s`, target: targetUsers },
        { duration: `${rampDownSeconds}s`, target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'exportDownloadJourney',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{kind:write}': ['p(95)<=8000'],
    'http_req_duration{kind:download}': ['p(95)<=15000'],
    checks: ['rate>0.98'],
  },
};

const parseJson = (response, label) => {
  const ok = check(response, {
    [`${label} status is 2xx`]: (res) => res.status >= 200 && res.status < 300,
  });

  if (!ok) {
    throw new Error(`${label} failed: status=${response.status} body=${response.body}`);
  }

  return response.body ? response.json() : null;
};

export function exportDownloadJourney() {
  const user = getAssignedUser(flowFilter);
  const flow = 'export_download';

  ensureSession(baseUrl, user, { flow });

  const payload = {
    periodKeyStart: periodStart,
    periodKeyEnd: periodEnd,
    include: [2, 3],
    option: user.role === 'admin' ? 3 : user.role === 'manager' ? 2 : 1,
  };

  if (user.company_id) {
    payload.company_ids = [user.company_id];
  }

  if (user.zone_id) {
    payload.zone_id = user.zone_id;
  }

  const initResponse = parseJson(
    http.post(
      `${baseUrl}/api/export/init`,
      JSON.stringify(payload),
      withAuth(baseUrl, { flow, endpoint: 'export_init', kind: 'write' })
    ),
    'export init'
  );

  sleep(randomThinkTime(1, 2));

  const downloadResponse = http.get(
    buildUrl(baseUrl, '/api/export/export-resource-waste', {
      periodKeyStart: periodStart,
      periodKeyEnd: periodEnd,
      include: [2, 3],
      company_ids: user.company_id || undefined,
      zone_id: user.zone_id || undefined,
      option: payload.option,
      export_id: initResponse ? initResponse.export_id : undefined,
      fileType: 'xlsx',
    }),
    withAuth(baseUrl, { flow, endpoint: 'export_download', kind: 'download' })
  );

  check(downloadResponse, {
    'export download status is 200': (res) => res.status === 200,
    'export download has xlsx content type': (res) =>
      (res.headers['Content-Type'] || '').includes('spreadsheetml'),
  });

  sleep(randomThinkTime(1, 3));
}
