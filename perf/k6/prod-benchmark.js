import http from 'k6/http';
import { check } from 'k6';
import { ensureSession } from './lib/auth.js';
import { getAssignedUser, validateUserPool } from './lib/users.js';
import { mainUserJourney } from './http-main-flows.js';

const baseUrl = (__ENV.BASE_URL || 'https://api2.hepza.click').replace(/\/$/, '');
const targetUsers = Number(__ENV.TARGET_VUS || 2048);

export const options = {
    // Production runs might be long, but we do not recommend keeping cookie sessions infinitely
    // unless we manage them. Still, we use ensureSession which relies on explicit auth handling.
    // noCookiesReset: true, 

    scenarios: {
        prod_benchmark_ramping: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 100 },    // Ramp to 100 users
                { duration: '3m', target: 100 },    // Hold at 100 users
                { duration: '2m', target: 500 },    // Scale to 500
                { duration: '3m', target: 500 },    // Hold at 500
                { duration: '3m', target: 1000 },   // Scale to 1000
                { duration: '3m', target: 1000 },   // Hold at 1000
                { duration: '4m', target: targetUsers }, // Scale to max (~2048+)
                { duration: '5m', target: targetUsers }, // Hold at max
                { duration: '3m', target: 0 },      // Ramp down
            ],
            gracefulRampDown: '30s',
            exec: 'benchmarkJourney',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'],    // Dưới 1% lỗi
        'http_req_duration{kind:read}': ['p(95)<=3000', 'p(99)<=5000'],
        'http_req_duration{kind:write}': ['p(95)<=5000', 'p(99)<=8000'],
        checks: ['rate>0.99'],
    },
};

const flowFilter = (user) => user.flow !== 'socket_presence';
// Validate whether user pool has sufficient users
validateUserPool(targetUsers, flowFilter);

export function benchmarkJourney() {
    const user = getAssignedUser(flowFilter);
    const flow = user.flow || 'company_dashboard';

    // Login or resume session.
    ensureSession(baseUrl, user, { flow });

    // Execute business flow
    mainUserJourney();
}
