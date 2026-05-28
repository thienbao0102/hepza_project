import http from 'k6/http';
import { check, sleep } from 'k6';
import { ensureSession, withAuth } from './lib/auth.js';
import { randomThinkTime } from './lib/time.js';
import { getAssignedUser, validateUserPool } from './lib/users.js';
import { mainUserJourney } from './http-main-flows.js';

const baseUrl = (__ENV.BASE_URL || 'http://backend:5000').replace(/\/$/, '');
const targetUsers = Number(__ENV.TARGET_VUS || 20);
const benchmarkMode = __ENV.BENCHMARK_MODE || 'capacity';

export const options = {
    noCookiesReset: true,
    scenarios: {
        local_benchmark: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 5 },
                { duration: '60s', target: 5 },
                { duration: '30s', target: 10 },
                { duration: '60s', target: 10 },
                { duration: '30s', target: 20 },
                { duration: '60s', target: 20 },
                { duration: '20s', target: 0 },
            ],
            gracefulRampDown: '10s',
            exec: 'benchmarkJourney',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'],
        'http_req_duration{kind:read}': ['p(95)<=3000', 'p(99)<=5000'],
        'http_req_duration{kind:write}': ['p(95)<=5000', 'p(99)<=8000'],
        checks: ['rate>0.99'],
    },
};

const flowFilter = (user) => user.flow !== 'socket_presence';
validateUserPool(targetUsers, flowFilter);

export function benchmarkJourney() {
    const user = getAssignedUser(flowFilter);
    const flow = user.flow || 'company_dashboard';

    ensureSession(baseUrl, user, { flow });

    if (benchmarkMode === 'ratelimit') {
        for (let i = 0; i < 5; i++) {
            const res = http.post(`${baseUrl}/api/auth/refresh`, null, withAuth(baseUrl, { kind: 'auth', endpoint: 'refresh_ratelimit_test' }, { csrf: false }));
            check(res, { 'status is 2xx or 429': (r) => r.status >= 200 && r.status < 300 || r.status === 429 });
            if (res.status === 429) check(res, { 'rate limited': (r) => r.status === 429 });
            sleep(0.1);
        }
    } else {
        // Full business flows — same as production benchmark
        // Covers: company_dashboard, company_history, manager_monitor,
        //         admin_overview, notification_reader, export_light
        mainUserJourney();
    }
}
