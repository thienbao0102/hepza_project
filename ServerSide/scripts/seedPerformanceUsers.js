#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { hashPassword } = require('../utils/passwordHasher');

require('dotenv').config();

const Company = require('../models/companyModel');
const IndustrialZone = require('../models/industrialZoneModel');
const User = require('../models/userModel');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DEFAULT_OUTPUT_CSV = path.join(ROOT_DIR, 'perf', 'data', 'users.local.csv');
const DEFAULT_PASSWORD = process.env.PERF_PASSWORD || 'ChangeMe123!';
const DEFAULT_EMAIL_DOMAIN = process.env.PERF_EMAIL_DOMAIN || 'perf.hepza.test';
const DEFAULT_ZONE_COUNT = Number(process.env.PERF_ZONE_COUNT || 10);

const FLOW_ORDER = [
  'company_dashboard',
  'company_history',
  'resource_declaration',
  'declaration_history',
  'notification_reader',
  'export_light',
  'export_download',
  'manager_monitor',
  'admin_overview',
  'socket_presence',
];

const DEFAULT_FLOW_COUNTS = {
  company_dashboard: 400,
  company_history: 100,
  resource_declaration: 150,
  declaration_history: 100,
  notification_reader: 100,
  export_light: 50,
  export_download: 50,
  manager_monitor: 30,
  admin_overview: 20,
  socket_presence: 200,
};

const FLOW_ROLE_MAP = {
  company_dashboard: 'company',
  company_history: 'company',
  resource_declaration: 'company',
  declaration_history: 'company',
  notification_reader: 'company',
  export_light: 'company',
  export_download: 'company',
  socket_presence: 'company',
  manager_monitor: 'manager',
  admin_overview: 'admin',
};

const escapeCsvValue = (value) => {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const pad = (value, width = 6) => String(value).padStart(width, '0');

const parseCliArgs = () => {
  const result = {
    cleanup: false,
    csvPath: DEFAULT_OUTPUT_CSV,
    countsJson: process.env.PERF_FLOW_COUNTS_JSON || '',
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--cleanup') {
      result.cleanup = true;
      continue;
    }

    if (arg === '--csv' || arg === '--output') {
      result.csvPath = args[index + 1] || result.csvPath;
      index += 1;
      continue;
    }

    if (arg === '--counts-json') {
      result.countsJson = args[index + 1] || result.countsJson;
      index += 1;
      continue;
    }
  }

  return result;
};

const parseFlowCounts = (countsJson) => {
  if (!countsJson) {
    return { ...DEFAULT_FLOW_COUNTS };
  }

  let parsed;
  try {
    parsed = JSON.parse(countsJson);
  } catch (error) {
    throw new Error(`PERF_FLOW_COUNTS_JSON is invalid JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('PERF_FLOW_COUNTS_JSON must be a JSON object');
  }

  const merged = { ...DEFAULT_FLOW_COUNTS };
  for (const [flow, count] of Object.entries(parsed)) {
    if (!FLOW_ORDER.includes(flow)) {
      throw new Error(`Unknown flow name in PERF_FLOW_COUNTS_JSON: ${flow}`);
    }

    const normalizedCount = Number(count);
    if (!Number.isInteger(normalizedCount) || normalizedCount < 0) {
      throw new Error(`Flow count for ${flow} must be a non-negative integer`);
    }

    merged[flow] = normalizedCount;
  }

  return merged;
};

const getMongoUri = () => process.env.ATLAS_URI || process.env.MONGO_URI || process.env.MONGODB_URI;

const buildFlowRows = (flowCounts) => {
  const rows = [];
  for (const flow of FLOW_ORDER) {
    const count = Number(flowCounts[flow] || 0);
    if (!count) continue;

    for (let index = 1; index <= count; index += 1) {
      rows.push({
        flow,
        role: FLOW_ROLE_MAP[flow],
        flowIndex: index,
      });
    }
  }

  return rows;
};

const buildZoneName = (index) => `HEPZA PERF ZONE ${pad(index, 3)}`;

const buildCompanyName = (index) => `HEPZA PERF COMPANY ${pad(index, 5)}`;

const buildCompanyRegistrationNumber = (index) => `88${pad(index, 8)}`;

const buildEmail = (role, index) => `perf.${role}.${pad(index, 6)}@${DEFAULT_EMAIL_DOMAIN}`;

const buildPhoneNumber = (role, index) => {
  const prefixMap = {
    company: '0905',
    manager: '0915',
    admin: '0925',
  };

  return `${prefixMap[role] || '0935'}${pad(index, 6)}`;
};

const buildFullName = (role, index) => {
  const labelMap = {
    company: 'Company User',
    manager: 'Manager',
    admin: 'Admin',
  };

  return `Perf ${labelMap[role] || 'User'} ${pad(index, 6)}`;
};

const ensureZone = async (index) => {
  const zoneName = buildZoneName(index);
  let zone = await IndustrialZone.findOne({ zone_name: zoneName });

  if (zone) {
    if (zone.deleted_at) {
      zone.deleted_at = null;
      zone.deleted_by = null;
      zone.status = 'active';
      zone.updated_at = new Date();
      await zone.save();
    }

    return zone;
  }

  zone = new IndustrialZone({
    zone_name: zoneName,
    zone_type: 'KCN',
    location: `Perf load-test zone ${pad(index, 3)}`,
    status: 'active',
    created_by: 'perf-seed',
    updated_by: 'perf-seed',
  });

  await zone.save();
  return zone;
};

const ensureCompanyUser = async (index, zoneCount, hashedPassword) => {
  const zone = await ensureZone(((index - 1) % zoneCount) + 1);
  const companyRegistrationNumber = buildCompanyRegistrationNumber(index);
  const companyName = buildCompanyName(index);
  const email = buildEmail('company', index);
  const phoneNumber = buildPhoneNumber('company', index);

  let company = await Company.findOne({ company_registration_number: companyRegistrationNumber });
  let companyNeedsSave = false;

  if (company) {
    if (company.deleted_at) {
      company.deleted_at = null;
      company.deleted_by = null;
      companyNeedsSave = true;
    }

    if (company.company_name !== companyName) {
      company.company_name = companyName;
      companyNeedsSave = true;
    }

    if (company.zone_id !== zone.zone_id) {
      company.zone_id = zone.zone_id;
      companyNeedsSave = true;
    }

    if (!Array.isArray(company.industry) || company.industry.join(',') !== 'Khac') {
      company.industry = ['Khac'];
      companyNeedsSave = true;
    }

    if (!Array.isArray(company.industry_group) || company.industry_group.join(',') !== 'Khac') {
      company.industry_group = ['Khac'];
      companyNeedsSave = true;
    }
  }

  if (!company) {
    company = new Company({
      company_name: companyName,
      company_registration_number: companyRegistrationNumber,
      zone_id: zone.zone_id,
      industry: ['Khac'],
      industry_group: ['Khac'],
      company_type: 'Private',
      address: `Perf test address ${pad(index, 5)}`,
      status: 'Đang hoạt động',
      created_by: 'perf-seed',
      updated_by: 'perf-seed',
    });

    await company.save();
  }

  if (companyNeedsSave) {
    company.updated_by = 'perf-seed';
    await company.save();
  }

  let user = await User.findOne({ email });
  let userNeedsSave = false;

  if (user) {
    if (user.deleted_at) {
      user.deleted_at = null;
      user.deleted_by = null;
      userNeedsSave = true;
    }

    if (user.full_name !== buildFullName('company', index)) {
      user.full_name = buildFullName('company', index);
      userNeedsSave = true;
    }

    if (user.phone_number !== phoneNumber) {
      user.phone_number = phoneNumber;
      userNeedsSave = true;
    }

    if (user.role !== 'company') {
      user.role = 'company';
      userNeedsSave = true;
    }

    if (user.zone_id !== zone.zone_id) {
      user.zone_id = zone.zone_id;
      userNeedsSave = true;
    }

    if (user.company_id !== company.company_id) {
      user.company_id = company.company_id;
      userNeedsSave = true;
    }

    if (user.password !== hashedPassword) {
      user.password = hashedPassword;
      userNeedsSave = true;
    }

    if (user.firstLogin !== false) {
      user.firstLogin = false;
      userNeedsSave = true;
    }
  }

  if (!user) {
    user = new User({
      full_name: buildFullName('company', index),
      phone_number: phoneNumber,
      email,
      role: 'company',
      zone_id: zone.zone_id,
      company_id: company.company_id,
      password: hashedPassword,
      firstLogin: false,
      created_by: 'perf-seed',
      updated_by: 'perf-seed',
    });

    await user.save();
  } else if (userNeedsSave) {
    user.updated_by = 'perf-seed';
    await user.save();
  }

  if (company.user_id !== user.user_id || company.representative_user_id !== user.user_id) {
    company.user_id = user.user_id;
    company.representative_user_id = user.user_id;
    company.updated_by = 'perf-seed';
    await company.save();
  }

  return {
    email: user.email,
    password: DEFAULT_PASSWORD,
    role: 'company',
    flow: 'company_dashboard',
    company_id: company.company_id,
    zone_id: zone.zone_id,
    user_id: user.user_id,
  };
};

const ensureManagerUser = async (index, zoneCount, hashedPassword) => {
  const zone = await ensureZone(((index - 1) % zoneCount) + 1);
  const email = buildEmail('manager', index);
  const phoneNumber = buildPhoneNumber('manager', index);

  let user = await User.findOne({ email });
  let userNeedsSave = false;

  if (user) {
    if (user.deleted_at) {
      user.deleted_at = null;
      user.deleted_by = null;
      userNeedsSave = true;
    }

    if (user.full_name !== buildFullName('manager', index)) {
      user.full_name = buildFullName('manager', index);
      userNeedsSave = true;
    }

    if (user.phone_number !== phoneNumber) {
      user.phone_number = phoneNumber;
      userNeedsSave = true;
    }

    if (user.role !== 'manager') {
      user.role = 'manager';
      userNeedsSave = true;
    }

    if (user.zone_id !== zone.zone_id) {
      user.zone_id = zone.zone_id;
      userNeedsSave = true;
    }

    if (user.password !== hashedPassword) {
      user.password = hashedPassword;
      userNeedsSave = true;
    }

    if (user.firstLogin !== false) {
      user.firstLogin = false;
      userNeedsSave = true;
    }
  }

  if (!user) {
    user = new User({
      full_name: buildFullName('manager', index),
      phone_number: phoneNumber,
      email,
      role: 'manager',
      zone_id: zone.zone_id,
      password: hashedPassword,
      firstLogin: false,
      created_by: 'perf-seed',
      updated_by: 'perf-seed',
    });

    await user.save();
  } else if (userNeedsSave) {
    user.updated_by = 'perf-seed';
    await user.save();
  }

  const currentManagers = Array.isArray(zone.managers_ids) ? zone.managers_ids : [];
  if (!currentManagers.includes(user.user_id)) {
    await IndustrialZone.findOneAndUpdate(
      { zone_id: zone.zone_id },
      { $addToSet: { managers_ids: user.user_id }, $set: { updated_by: 'perf-seed' } }
    );
  }

  return {
    email: user.email,
    password: DEFAULT_PASSWORD,
    role: 'manager',
    flow: 'manager_monitor',
    company_id: '',
    zone_id: zone.zone_id,
    user_id: user.user_id,
  };
};

const ensureAdminUser = async (index, hashedPassword) => {
  const email = buildEmail('admin', index);
  const phoneNumber = buildPhoneNumber('admin', index);

  let user = await User.findOne({ email });
  let userNeedsSave = false;

  if (user) {
    if (user.deleted_at) {
      user.deleted_at = null;
      user.deleted_by = null;
      userNeedsSave = true;
    }

    if (user.full_name !== buildFullName('admin', index)) {
      user.full_name = buildFullName('admin', index);
      userNeedsSave = true;
    }

    if (user.phone_number !== phoneNumber) {
      user.phone_number = phoneNumber;
      userNeedsSave = true;
    }

    if (user.role !== 'admin') {
      user.role = 'admin';
      userNeedsSave = true;
    }

    if (user.password !== hashedPassword) {
      user.password = hashedPassword;
      userNeedsSave = true;
    }

    if (user.firstLogin !== false) {
      user.firstLogin = false;
      userNeedsSave = true;
    }
  }

  if (!user) {
    user = new User({
      full_name: buildFullName('admin', index),
      phone_number: phoneNumber,
      email,
      role: 'admin',
      password: hashedPassword,
      firstLogin: false,
      created_by: 'perf-seed',
      updated_by: 'perf-seed',
    });

    await user.save();
  } else if (userNeedsSave) {
    user.updated_by = 'perf-seed';
    await user.save();
  }

  return {
    email: user.email,
    password: DEFAULT_PASSWORD,
    role: 'admin',
    flow: 'admin_overview',
    company_id: '',
    zone_id: '',
    user_id: user.user_id,
  };
};

const writeCsv = async (csvPath, rows) => {
  const header = ['email', 'password', 'role', 'flow', 'company_id', 'zone_id', 'user_id'];
  const lines = [header.join(',')];

  for (const row of rows) {
    lines.push([
      row.email,
      row.password,
      row.role,
      row.flow,
      row.company_id || '',
      row.zone_id || '',
      row.user_id || '',
    ].map(escapeCsvValue).join(','));
  }

  await fs.promises.mkdir(path.dirname(csvPath), { recursive: true });
  await fs.promises.writeFile(csvPath, `${lines.join('\n')}\n`, 'utf8');
};

const cleanupPerformanceUsers = async () => {
  const userResult = await User.deleteMany({
    email: {
      $regex: /^perf\.(company|manager|admin)\./,
    },
  });

  const companyResult = await Company.deleteMany({
    company_name: { $regex: /^HEPZA PERF COMPANY / },
  });

  const zoneResult = await IndustrialZone.deleteMany({
    zone_name: { $regex: /^HEPZA PERF ZONE / },
  });

  return {
    usersDeleted: userResult.deletedCount || 0,
    companiesDeleted: companyResult.deletedCount || 0,
    zonesDeleted: zoneResult.deletedCount || 0,
  };
};

const main = async () => {
  const { cleanup, csvPath, countsJson } = parseCliArgs();

  if (cleanup) {
    const mongoUri = getMongoUri();
    if (!mongoUri) {
      throw new Error('ATLAS_URI, MONGO_URI, or MONGODB_URI is required for cleanup mode');
    }

    await mongoose.connect(mongoUri);
    try {
      const result = await cleanupPerformanceUsers();
      console.log(`✅ Cleanup completed: ${result.usersDeleted} users, ${result.companiesDeleted} companies, ${result.zonesDeleted} zones removed.`);
    } finally {
      await mongoose.disconnect();
    }

    return;
  }

  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error('ATLAS_URI, MONGO_URI, or MONGODB_URI is required');
  }

  const flowCounts = parseFlowCounts(countsJson);
  const socketUserCount = Number(flowCounts.socket_presence || 0);
  const companyHttpCount = FLOW_ORDER
    .filter((flow) => FLOW_ROLE_MAP[flow] === 'company' && flow !== 'socket_presence')
    .reduce((total, flow) => total + Number(flowCounts[flow] || 0), 0);
  const managerCount = Number(flowCounts.manager_monitor || 0);
  const adminCount = Number(flowCounts.admin_overview || 0);
  const companyRoleCount = companyHttpCount + socketUserCount;
  const httpReadyCount = companyHttpCount + managerCount + adminCount;
  const zoneCount = Math.max(DEFAULT_ZONE_COUNT, managerCount, 1);

  const flowRows = buildFlowRows(flowCounts);
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const csvRows = [];

  await mongoose.connect(mongoUri);
  try {
    let companyIndex = 0;
    let managerIndex = 0;
    let adminIndex = 0;

    for (const flowRow of flowRows) {
      if (flowRow.role === 'company') {
        companyIndex += 1;
        const row = await ensureCompanyUser(companyIndex, zoneCount, hashedPassword);
        row.flow = flowRow.flow;
        csvRows.push(row);
        continue;
      }

      if (flowRow.role === 'manager') {
        managerIndex += 1;
        const row = await ensureManagerUser(managerIndex, zoneCount, hashedPassword);
        row.flow = flowRow.flow;
        csvRows.push(row);
        continue;
      }

      if (flowRow.role === 'admin') {
        adminIndex += 1;
        const row = await ensureAdminUser(adminIndex, hashedPassword);
        row.flow = flowRow.flow;
        csvRows.push(row);
      }
    }

    await writeCsv(csvPath, csvRows);

    console.log('✅ Performance user pool prepared');
    console.log(`- HTTP-ready users: ${httpReadyCount}`);
    console.log(`- Socket users: ${socketUserCount}`);
    console.log(`- Company-role users total: ${companyRoleCount}`);
    console.log(`- Manager users: ${managerCount}`);
    console.log(`- Admin users: ${adminCount}`);
    console.log(`- Zones: ${zoneCount}`);
    console.log(`- CSV: ${csvPath}`);
    console.log(`- Default password: ${DEFAULT_PASSWORD}`);
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  });
}
