import http from 'k6/http';
import { check } from 'k6';

export default function () {
    const baseUrl = 'http://host.docker.internal:5000';

    // 1. login
    const loginRes = http.post(`${baseUrl}/api/auth/login`, JSON.stringify({
        email: 'perf.company.000001@perf.hepza.test',
        password: 'ChangeMe123!'
    }), {
        headers: { 'Content-Type': 'application/json' }
    });

    console.log(`Login status: ${loginRes.status}`);
    console.log(`Login Set-Cookie headers: ${JSON.stringify(loginRes.headers['Set-Cookie'] || loginRes.headers['set-cookie'])}`);

    const jar = http.cookieJar();
    const cookies = jar.cookiesForURL(baseUrl);
    console.log(`Cookies in jar for ${baseUrl}: ${JSON.stringify(cookies)}`);

    // 2. me
    const meRes = http.get(`${baseUrl}/api/auth/me`, {
        headers: { 'Content-Type': 'application/json' }
    });

    console.log(`Me status: ${meRes.status}`);
    console.log(`Me body: ${meRes.body}`);
}
