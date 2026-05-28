#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    }
  }
  return args;
}

function loadJson(filePath, fallback) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeMethodPath(method, apiPath) {
  return `${method.toUpperCase()} ${apiPath}`;
}

function hasAdminOnlyAccess(operation) {
  const description = String(operation.description || '').toLowerCase();
  if (!description.includes('admin')) return false;
  return !description.includes('manager') && !description.includes('company');
}

function isSensitiveRoute(method, apiPath, operation, exclusions) {
  const methodPath = normalizeMethodPath(method, apiPath);
  const lowerPath = apiPath.toLowerCase();
  const tags = Array.isArray(operation.tags) ? operation.tags : [];

  if ((exclusions.excludedExact || []).includes(methodPath)) return true;
  if ((exclusions.excludedPathContains || []).some((needle) => lowerPath.includes(String(needle).toLowerCase()))) return true;
  if ((exclusions.excludedTags || []).some((tag) => tags.includes(tag))) return true;
  if (hasAdminOnlyAccess(operation)) return true;

  return false;
}

function cloneWithoutEmptyPaths(spec, includeMutations, exclusions) {
  const filtered = {
    ...spec,
    paths: {},
  };

  const stats = {
    inputOperations: 0,
    includedOperations: 0,
    excludedSensitive: 0,
    excludedMutation: 0,
  };

  const writeMethods = new Set(['post', 'put', 'patch', 'delete']);

  for (const [apiPath, pathItem] of Object.entries(spec.paths || {})) {
    const nextPathItem = {};
    for (const [method, operation] of Object.entries(pathItem || {})) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
        nextPathItem[method] = operation;
        continue;
      }

      stats.inputOperations += 1;
      if (isSensitiveRoute(method, apiPath, operation || {}, exclusions)) {
        stats.excludedSensitive += 1;
        continue;
      }

      if (writeMethods.has(method) && !includeMutations) {
        stats.excludedMutation += 1;
        continue;
      }

      nextPathItem[method] = operation;
      stats.includedOperations += 1;
    }

    const operationKeys = Object.keys(nextPathItem).filter((key) => ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(key));
    if (operationKeys.length > 0) {
      filtered.paths[apiPath] = nextPathItem;
    }
  }

  filtered.info = {
    ...(filtered.info || {}),
    description: `${filtered.info?.description || ''}\n\nFiltered for safe ZAP DAST scanning. Mutations included: ${includeMutations}.`,
  };

  return { filtered, stats };
}

const args = parseArgs(process.argv);
const inputPath = args.input;
const outputPath = args.output;
const excludePath = args.exclude || path.join('security', 'zap', 'excluded-routes.json');
const includeMutations = String(args['include-mutations'] || process.env.ZAP_INCLUDE_MUTATIONS || 'false').toLowerCase() === 'true';

if (!inputPath || !outputPath) {
  console.error('Usage: filter-openapi-for-zap.js --input <openapi.json> --output <filtered.json> [--exclude excluded-routes.json] [--include-mutations true|false]');
  process.exit(2);
}

const spec = loadJson(inputPath, null);
if (!spec || typeof spec !== 'object') {
  console.error(`Invalid OpenAPI input: ${inputPath}`);
  process.exit(2);
}

const exclusions = loadJson(excludePath, { excludedExact: [], excludedPathContains: [], excludedTags: [] });
const { filtered, stats } = cloneWithoutEmptyPaths(spec, includeMutations, exclusions);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(filtered, null, 2)}\n`);
console.log(JSON.stringify(stats, null, 2));

if (stats.includedOperations === 0) {
  console.error('Filtered OpenAPI has no operations to scan.');
  process.exit(3);
}
