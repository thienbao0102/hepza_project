import http from 'k6/http';
import { check, sleep } from 'k6';
import { ensureSession, withAuth } from './lib/auth.js';
import { buildUrl } from './lib/http.js';
import { resolvePeriodWindow, randomThinkTime } from './lib/time.js';
import { getAssignedUser } from './lib/users.js';

const baseUrl = (__ENV.BASE_URL || '').replace(/\/$/, '');
const flowFilter = (user) => user.flow !== 'socket_presence';

if (!baseUrl) {
  throw new Error('BASE_URL is required, for example BASE_URL=https://api2.hepza.click');
}

const { periodStart, periodEnd, periodKeys } = resolvePeriodWindow();

const parseJson = (response, label) => {
  const ok = check(response, {
    [`${label} status is 2xx`]: (res) => res.status >= 200 && res.status < 300,
  });

  if (!ok) {
    throw new Error(`${label} failed: status=${response.status} body=${response.body}`);
  }

  if (!response.body) {
    return null;
  }

  return response.json();
};

const readMe = (flow) => parseJson(
  http.get(`${baseUrl}/api/auth/me`, withAuth(baseUrl, { flow, endpoint: 'me', kind: 'read' }, { csrf: false })),
  `${flow} /api/auth/me`
);

const readSummary = (user, flow) => parseJson(
  http.get(
    buildUrl(baseUrl, '/api/report/get-summary-record', {
      role: user.role,
      periodKeyStart: periodStart,
      periodKeyEnd: periodEnd,
      include: [1],
      company_id: user.company_id,
      zone_id: user.zone_id,
    }),
    withAuth(baseUrl, { flow, endpoint: 'summary_record', kind: 'read' }, { csrf: false })
  ),
  `${flow} summary`
);

const readSummaryByPeriod = (user, flow) => parseJson(
  http.get(
    buildUrl(baseUrl, '/api/report/get-summary-record-by-periodkey', {
      role: user.role,
      periodKeyStart: periodStart,
      periodKeyEnd: periodEnd,
      include: [1],
      company_id: user.company_id,
      zone_id: user.zone_id,
    }),
    withAuth(baseUrl, { flow, endpoint: 'summary_period', kind: 'read' }, { csrf: false })
  ),
  `${flow} summary by period`
);

const readEmission = (user, flow) => parseJson(
  http.get(
    buildUrl(baseUrl, '/api/emission/get-emission-data', {
      periodKeyStart: periodStart,
      periodKeyEnd: periodEnd,
      include: [1],
      company_id: user.company_id,
      zone_id: user.zone_id,
    }),
    withAuth(baseUrl, { flow, endpoint: 'emission', kind: 'read' }, { csrf: false })
  ),
  `${flow} emission`
);

const readResourceDetail = (user, flow) => parseJson(
  http.get(
    buildUrl(baseUrl, '/api/resource-waste/get-data-resource', {
      periodKeyStart: periodStart,
      periodKeyEnd: periodEnd,
      include: [1],
      company_id: user.company_id,
      zone_id: user.zone_id,
    }),
    withAuth(baseUrl, { flow, endpoint: 'resource_detail', kind: 'read' }, { csrf: false })
  ),
  `${flow} resource detail`
);

const readResourceHistory = (user, flow) => parseJson(
  http.get(
    buildUrl(baseUrl, '/api/resource-waste/get-all-data-resource-with-history', {
      company_id: user.company_id,
      zone_id: user.zone_id,
      periodKeys,
    }),
    withAuth(baseUrl, { flow, endpoint: 'resource_history', kind: 'read' }, { csrf: false })
  ),
  `${flow} resource history`
);

const readNotifications = (flow) => parseJson(
  http.get(
    buildUrl(baseUrl, '/api/notifications/my-notifications', {
      page: 1,
      limit: 20,
      sort: 'newest',
    }),
    withAuth(baseUrl, { flow, endpoint: 'notifications', kind: 'read' }, { csrf: false })
  ),
  `${flow} notifications`
);

const markNotificationRead = (notificationId, flow) => {
  if (!notificationId) return null;

  return parseJson(
    http.put(
      `${baseUrl}/api/notifications/read/${notificationId}`,
      null,
      withAuth(baseUrl, { flow, endpoint: 'notification_mark_read', kind: 'write' })
    ),
    `${flow} mark notification as read`
  );
};

const readManagedCompanies = (flow) => parseJson(
  http.get(
    buildUrl(baseUrl, '/api/companies/get-managed-companies', {
      page: 1,
      limit: 10,
      filters: JSON.stringify({}),
      sort: JSON.stringify({}),
    }),
    withAuth(baseUrl, { flow, endpoint: 'managed_companies', kind: 'read' }, { csrf: false })
  ),
  `${flow} managed companies`
);

const readAllCompanies = (flow) => parseJson(
  http.get(
    buildUrl(baseUrl, '/api/companies/get-all-companies', {
      page: 1,
      limit: 10,
      filters: JSON.stringify({}),
      sort: JSON.stringify({}),
    }),
    withAuth(baseUrl, { flow, endpoint: 'all_companies', kind: 'read' }, { csrf: false })
  ),
  `${flow} all companies`
);

const readZones = (flow) => parseJson(
  http.get(
    buildUrl(baseUrl, '/api/zones/get-all-zones', {
      page: 1,
      limit: 10,
      filters: JSON.stringify({}),
    }),
    withAuth(baseUrl, { flow, endpoint: 'zones', kind: 'read' }, { csrf: false })
  ),
  `${flow} zones`
);

const readSolutions = (flow) => parseJson(
  http.get(
    `${baseUrl}/api/solution/get-solution-data`,
    withAuth(baseUrl, { flow, endpoint: 'solutions', kind: 'read' }, { csrf: false })
  ),
  `${flow} solutions`
);

const readRegulations = (flow) => parseJson(
  http.get(
    `${baseUrl}/api/regulations/get-regulation-data`,
    withAuth(baseUrl, { flow, endpoint: 'regulations', kind: 'read' }, { csrf: false })
  ),
  `${flow} regulations`
);

const readSendHistory = (flow) => parseJson(
  http.get(
    buildUrl(baseUrl, '/api/notifications/get-send-history', {
      page: 1,
      limit: 20,
      sort: 'newest',
    }),
    withAuth(baseUrl, { flow, endpoint: 'notification_send_history', kind: 'read' }, { csrf: false })
  ),
  `${flow} notification send history`
);

const initExport = (user, flow) => {
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

  return parseJson(
    http.post(
      `${baseUrl}/api/export/init`,
      JSON.stringify(payload),
      withAuth(baseUrl, { flow, endpoint: 'export_init', kind: 'write' })
    ),
    `${flow} init export`
  );
};

// ── Resource Declaration (company role) ──

const PERF_PERIOD_KEY = 209912; // Far-future period to avoid real data collision

/**
 * Build a minimal but realistic resource declaration payload.
 * Skips file uploads (per user requirement) but exercises the full
 * insert-data logic: fuel sections + waste section.
 */
const buildDeclarationPayload = () => ({
  periodKey: PERF_PERIOD_KEY,
  'Điện': [
    {
      sub_group: 'Điện sản xuất',
      name: 'Perf Test - Điện SX',
      quantity: Math.floor(Math.random() * 10000) + 1000,
      unit: 'kWh',
    },
  ],
  'Nước': [
    {
      sub_group: 'Nước sản xuất',
      name: 'Perf Test - Nước SX',
      quantity: Math.floor(Math.random() * 500) + 50,
      unit: 'm3',
    },
  ],
  'Chất thải': [
    {
      main_group: 'Chất thải rắn sinh hoạt',
      name: 'Perf Test - CTRSH',
      quantity: Math.floor(Math.random() * 100) + 10,
      unit: 'kg',
    },
  ],
});

const declareResource = (flow) => {
  const payload = buildDeclarationPayload();
  const res = http.post(
    `${baseUrl}/api/resource-waste/insert-data`,
    JSON.stringify(payload),
    withAuth(baseUrl, { flow, endpoint: 'resource_insert', kind: 'write' })
  );
  // 409 = month already declared — acceptable during benchmark reruns
  check(res, {
    [`${flow} insert status 2xx or 409`]: (r) => (r.status >= 200 && r.status < 300) || r.status === 409,
  });
  return res.json();
};

const updateResource = (user, flow) => {
  // First read current data to get summaryVersion
  const currentData = readResourceDetail(user, flow);
  // Build update payload with summaryVersion for optimistic locking
  const payload = Object.assign({}, buildDeclarationPayload(), {
    summaryVersion: 0, // version 0 for perf test period
  });
  const res = http.post(
    `${baseUrl}/api/resource-waste/update-data`,
    JSON.stringify(payload),
    withAuth(baseUrl, { flow, endpoint: 'resource_update', kind: 'write' })
  );
  check(res, {
    [`${flow} update status 2xx or 409`]: (r) => (r.status >= 200 && r.status < 300) || r.status === 409,
  });
  return res.json();
};

const readEnvironmentalReports = (user, flow) => parseJson(
  http.get(
    `${baseUrl}/api/env-reports/${user.company_id}`,
    withAuth(baseUrl, { flow, endpoint: 'env_reports', kind: 'read' }, { csrf: false })
  ),
  `${flow} environmental reports`
);

const readExportHistory = (flow) => parseJson(
  http.get(
    `${baseUrl}/api/export/history`,
    withAuth(baseUrl, { flow, endpoint: 'export_history', kind: 'read' }, { csrf: false })
  ),
  `${flow} export history`
);

const runCompanyDashboardFlow = (user) => {
  const flow = 'company_dashboard';
  ensureSession(baseUrl, user, { flow });
  readMe(flow);
  sleep(randomThinkTime(0.5, 1.5));
  readSummary(user, flow);
  sleep(randomThinkTime(0.5, 1.5));
  readEmission(user, flow);
  sleep(randomThinkTime(0.5, 1.5));
  readResourceDetail(user, flow);
  sleep(randomThinkTime(0.5, 1.5));
  readNotifications(flow);
};

const runCompanyHistoryFlow = (user) => {
  const flow = 'company_history';
  ensureSession(baseUrl, user, { flow });
  readMe(flow);
  sleep(randomThinkTime(0.5, 1.5));
  readResourceHistory(user, flow);
  sleep(randomThinkTime(0.5, 1.5));
  readSummaryByPeriod(user, flow);
  sleep(randomThinkTime(0.5, 1.5));
  readResourceDetail(user, flow);
};

const runManagerMonitorFlow = (user) => {
  const flow = 'manager_monitor';
  ensureSession(baseUrl, user, { flow });
  readMe(flow);
  sleep(randomThinkTime(0.5, 1.5));
  readManagedCompanies(flow);
  sleep(randomThinkTime(0.5, 1.5));
  readSummary(user, flow);
  sleep(randomThinkTime(0.5, 1.5));
  readSendHistory(flow);
  sleep(randomThinkTime(0.5, 1.5));
  readZones(flow);
};

const runAdminOverviewFlow = (user) => {
  const flow = 'admin_overview';
  ensureSession(baseUrl, user, { flow });
  readMe(flow);
  sleep(randomThinkTime(0.5, 1.5));
  readAllCompanies(flow);
  sleep(randomThinkTime(0.5, 1.5));
  readZones(flow);
  sleep(randomThinkTime(0.5, 1.5));
  readSummary(user, flow);
  sleep(randomThinkTime(0.5, 1.5));
  readSolutions(flow);
  sleep(randomThinkTime(0.5, 1.5));
  readRegulations(flow);
};

const runNotificationReaderFlow = (user) => {
  const flow = 'notification_reader';
  ensureSession(baseUrl, user, { flow });
  readMe(flow);
  sleep(randomThinkTime(0.5, 1.5));
  const notificationData = readNotifications(flow);
  const notifications = notificationData && notificationData.notifications
    ? notificationData.notifications
    : [];
  const notificationId = notifications.length > 0 ? notifications[0].notification_I_id : null;
  sleep(randomThinkTime(0.5, 1.5));
  markNotificationRead(notificationId, flow);
};

const runExportLightFlow = (user) => {
  const flow = 'export_light';
  ensureSession(baseUrl, user, { flow });
  readMe(flow);
  sleep(randomThinkTime(0.5, 1.5));
  initExport(user, flow);
  sleep(randomThinkTime(0.5, 1.5));
  readExportHistory(flow);
};

// ── NEW: Resource Declaration Flow (company role) ──
// Simulates: Company user logs in → declares resources → reads back
const runResourceDeclarationFlow = (user) => {
  const flow = 'resource_declaration';
  ensureSession(baseUrl, user, { flow });
  readMe(flow);
  sleep(randomThinkTime(0.5, 1.5));

  // Step 1: Try to declare (insert) resources for the perf test period
  declareResource(flow);
  sleep(randomThinkTime(0.5, 1.5));

  // Step 2: Read back the declared data to verify
  readResourceDetail(user, flow);
  sleep(randomThinkTime(0.5, 1.5));

  // Step 3: Try to update the declaration
  updateResource(user, flow);
  sleep(randomThinkTime(0.5, 1.5));

  // Step 4: Read summary after declaration
  readSummary(user, flow);
};

// ── NEW: Declaration History Flow (company role) ──
// Simulates: Company user views their declaration history and environmental reports
const runDeclarationHistoryFlow = (user) => {
  const flow = 'declaration_history';
  ensureSession(baseUrl, user, { flow });
  readMe(flow);
  sleep(randomThinkTime(0.5, 1.5));

  // Step 1: View resource history across periods
  readResourceHistory(user, flow);
  sleep(randomThinkTime(0.5, 1.5));

  // Step 2: View detailed resource data for current period
  readResourceDetail(user, flow);
  sleep(randomThinkTime(0.5, 1.5));

  // Step 3: View summary by period
  readSummaryByPeriod(user, flow);
  sleep(randomThinkTime(0.5, 1.5));

  // Step 4: View environmental reports list
  readEnvironmentalReports(user, flow);
  sleep(randomThinkTime(0.5, 1.5));

  // Step 5: View emission data
  readEmission(user, flow);
};

export function mainUserJourney() {
  const user = getAssignedUser(flowFilter);
  const flow = user.flow || 'company_dashboard';

  switch (flow) {
    case 'company_history':
      runCompanyHistoryFlow(user);
      break;
    case 'manager_monitor':
      runManagerMonitorFlow(user);
      break;
    case 'admin_overview':
      runAdminOverviewFlow(user);
      break;
    case 'notification_reader':
      runNotificationReaderFlow(user);
      break;
    case 'export_light':
      runExportLightFlow(user);
      break;
    case 'resource_declaration':
      runResourceDeclarationFlow(user);
      break;
    case 'declaration_history':
      runDeclarationHistoryFlow(user);
      break;
    case 'company_dashboard':
    default:
      runCompanyDashboardFlow(user);
      break;
  }

  sleep(randomThinkTime(1, 3));
}
