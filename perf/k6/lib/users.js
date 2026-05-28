import exec from 'k6/execution';
import { SharedArray } from 'k6/data';

const splitCsvLine = (line) => {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseUsersCsv = (csvText) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  if (lines.length < 2) {
    throw new Error('User CSV must contain a header row and at least one user row');
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());

  return lines
    .slice(1)
    .map((line) => {
      const columns = splitCsvLine(line);
      const row = {};

      headers.forEach((header, index) => {
        row[header] = (columns[index] || '').trim();
      });

      return {
        email: row.email,
        password: row.password,
        role: row.role || 'company',
        flow: row.flow || row.role || 'company_dashboard',
        company_id: row.company_id || '',
        zone_id: row.zone_id || '',
        user_id: row.user_id || '',
      };
    })
    .filter((row) => row.email && row.password);
};

const csvPath = __ENV.USER_CSV || '../../data/users.local.csv';
const users = new SharedArray('hepza-load-test-users', () =>
  parseUsersCsv(open(csvPath))
);

export const getUsers = (filterFn = null) => (
  typeof filterFn === 'function' ? users.filter(filterFn) : users
);

export const validateUserPool = (requiredCount, filterFn = null) => {
  const availableUsers = getUsers(filterFn);
  if (availableUsers.length < requiredCount) {
    throw new Error(
      `Need at least ${requiredCount} unique test users, but only found ${availableUsers.length} matching rows in ${csvPath}`
    );
  }
};

export const getAssignedUser = (filterFn = null) => {
  const availableUsers = getUsers(filterFn);
  const index = exec.vu.idInTest - 1;

  if (index < 0 || index >= availableUsers.length) {
    throw new Error(
      `VU ${exec.vu.idInTest} has no dedicated user. Add more rows to ${csvPath}`
    );
  }

  return availableUsers[index];
};
