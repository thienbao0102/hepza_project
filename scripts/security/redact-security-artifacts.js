#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TEXT_EXTENSIONS = new Set(['.json', '.sarif', '.md', '.txt', '.html', '.htm', '.xml', '.log', '.csv']);
const UNSAFE_SEGMENTS = new Set(['node_modules', 'dist', 'coverage', 'uploads', '.security-tmp']);
const UNSAFE_NAME_PATTERNS = [/^\.env/i, /cookie/i, /\.jar$/i, /zap-options/i, /auth-response/i, /cookie-jar/i];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    args[key] = argv[i + 1];
    i += 1;
  }
  return args;
}

function shouldSkip(filePath, root, outputRoot) {
  const relative = path.relative(root, filePath);
  if (!relative || relative.startsWith('..')) return true;
  if (outputRoot && !path.relative(outputRoot, filePath).startsWith('..')) return true;

  const segments = relative.split(path.sep);
  if (segments.some((segment) => UNSAFE_SEGMENTS.has(segment))) return true;
  if (segments.some((segment) => UNSAFE_NAME_PATTERNS.some((pattern) => pattern.test(segment)))) return true;

  const ext = path.extname(filePath).toLowerCase();
  return !TEXT_EXTENSIONS.has(ext);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRedactors(extraValues) {
  const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
  const headerPattern = /\b(Authorization|Cookie|Set-Cookie|x-csrf-token|csrfToken|__Secure-csrfToken|authToken|__Secure-authToken|refreshToken|__Secure-refreshToken)\b\s*[:=]\s*[^\r\n,;"'}]+/gi;
  const jsonSecretPattern = /("(?:password|token|secret|cookie|csrf|x-csrf-token|authorization|set-cookie|refreshToken|authToken|accessToken)"\s*:\s*")[^"]*(")/gi;
  const setCookiePattern = /((?:Set-Cookie|Cookie):\s*)[^\r\n]+/gi;
  const redactors = [
    (text) => text.replace(jwtPattern, '[REDACTED_JWT]'),
    (text) => text.replace(headerPattern, '$1=[REDACTED]'),
    (text) => text.replace(jsonSecretPattern, '$1[REDACTED]$2'),
    (text) => text.replace(setCookiePattern, '$1[REDACTED_COOKIE]'),
  ];

  for (const value of extraValues) {
    if (!value || value.length < 4) continue;
    const pattern = new RegExp(escapeRegExp(value), 'g');
    redactors.push((text) => text.replace(pattern, '[REDACTED_SECRET]'));
  }

  return redactors;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(next));
    if (entry.isFile()) files.push(next);
  }
  return files;
}

const args = parseArgs(process.argv);
const inputRoot = path.resolve(args.input || 'security-reports');
const outputRoot = path.resolve(args.output || path.join(inputRoot, 'sanitized'));
const envValues = String(process.env.REDACT_VALUES || '')
  .split(/[\n,]/)
  .map((value) => value.trim())
  .filter(Boolean);
const redactors = buildRedactors(envValues);

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });

let copied = 0;
for (const file of walk(inputRoot)) {
  if (shouldSkip(file, inputRoot, outputRoot)) continue;
  const relative = path.relative(inputRoot, file);
  const destination = path.join(outputRoot, relative.replace(/^raw[\\/]/, ''));
  let content = fs.readFileSync(file, 'utf8');
  for (const redact of redactors) content = redact(content);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  copied += 1;
}

console.log(`Sanitized ${copied} report file(s) into ${outputRoot}`);
