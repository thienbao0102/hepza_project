import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { ensureSession, getCookieHeader } from './lib/auth.js';
import { randomThinkTime } from './lib/time.js';
import { getAssignedUser, validateUserPool } from './lib/users.js';

const baseUrl = (__ENV.BASE_URL || '').replace(/\/$/, '');
const targetUsers = Number(__ENV.TARGET_SOCKET_USERS || 200);
const rampUpSeconds = Number(__ENV.RAMP_UP_SECONDS || 300);
const holdSeconds = Number(__ENV.HOLD_SECONDS || 900);
const rampDownSeconds = Number(__ENV.RAMP_DOWN_SECONDS || 180);
const flowFilter = (user) => user.flow === 'socket_presence';

const socketHandshakeSuccess = new Rate('socketio_handshake_success');
const socketAuthFailures = new Counter('socketio_auth_failures_total');
const socketSessionDuration = new Trend('socketio_session_duration_seconds');

if (!baseUrl) {
  throw new Error('BASE_URL is required, for example BASE_URL=https://api2.hepza.click');
}

validateUserPool(targetUsers, flowFilter);

const toSocketUrl = (url) => {
  if (url.startsWith('https://')) {
    return `wss://${url.slice('https://'.length)}/socket.io/?EIO=4&transport=websocket`;
  }
  return `ws://${url.slice('http://'.length)}/socket.io/?EIO=4&transport=websocket`;
};

export const options = {
  scenarios: {
    socket_presence: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: `${rampUpSeconds}s`, target: targetUsers },
        { duration: `${holdSeconds}s`, target: targetUsers },
        { duration: `${rampDownSeconds}s`, target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'socketPresenceJourney',
    },
  },
  thresholds: {
    socketio_handshake_success: ['rate>0.99'],
    checks: ['rate>0.99'],
  },
};

export function socketPresenceJourney() {
  const user = getAssignedUser(flowFilter);
  const flow = 'socket_presence';

  ensureSession(baseUrl, user, { flow });

  const cookieHeader = getCookieHeader(baseUrl);
  const startTime = Date.now();
  let socketIoReady = false;

  const response = ws.connect(
    toSocketUrl(baseUrl),
    {
      headers: {
        Cookie: cookieHeader,
        Origin: baseUrl,
      },
      tags: {
        flow,
        kind: 'socket',
      },
    },
    (socket) => {
      socket.on('message', (message) => {
        if (message === '2') {
          socket.send('3');
          return;
        }

        if (message.startsWith('0')) {
          socket.send('40');
          return;
        }

        if (message.startsWith('40')) {
          socketIoReady = true;
          if (user.user_id) {
            socket.send(`42["join","${user.user_id}"]`);
          }
          return;
        }

        if (
          message.includes('Bạn chưa đăng nhập') ||
          message.includes('không hợp lệ') ||
          message.includes('hết hạn')
        ) {
          socketAuthFailures.add(1);
          socket.close();
        }
      });

      socket.setTimeout(holdSeconds * 1000, () => {
        socket.close();
      });
    }
  );

  check(response, {
    'websocket upgraded': (res) => res && res.status === 101,
  });

  socketHandshakeSuccess.add(socketIoReady);
  socketSessionDuration.add((Date.now() - startTime) / 1000);

  sleep(randomThinkTime(1, 2));
}
