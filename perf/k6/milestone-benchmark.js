import http from 'k6/http';
import { check } from 'k6';
import { ensureSession } from './lib/auth.js';
import { getAssignedUser, validateUserPool } from './lib/users.js';
import { mainUserJourney } from './http-main-flows.js';

const baseUrl = (__ENV.BASE_URL || 'https://api2.hepza.click').replace(/\/$/, '');
const targetUsers = Number(__ENV.MILESTONE_VUS || 100);
const rampDuration = __ENV.MILESTONE_RAMP || '2m';
const holdDuration = __ENV.MILESTONE_HOLD || '3m';

export const options = {
    scenarios: {
        milestone_load: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: rampDuration, target: targetUsers },
                { duration: holdDuration, target: targetUsers },
                { duration: '30s', target: 0 },
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
    mainUserJourney();
}
