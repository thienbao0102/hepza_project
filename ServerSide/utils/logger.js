const LEVELS = Object.freeze({
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
});

const DEFAULT_LEVEL_BY_ENV = Object.freeze({
  production: 'info',
  test: 'warn',
  development: 'debug',
});

const nativeConsole = Object.freeze({
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  log: console.log.bind(console),
});

let consoleBridgeInstalled = false;

function resolveLogLevel() {
  const env = process.env.NODE_ENV || 'development';
  const configuredLevel = String(process.env.LOG_LEVEL || '').toLowerCase();
  const fallbackLevel = DEFAULT_LEVEL_BY_ENV[env] || DEFAULT_LEVEL_BY_ENV.development;

  return LEVELS[configuredLevel] !== undefined ? configuredLevel : fallbackLevel;
}

function serializeMeta(meta) {
  if (meta === undefined || meta === null) return '';
  if (meta instanceof Error) {
    return `${meta.name}: ${meta.message}${meta.stack ? `\n${meta.stack}` : ''}`;
  }
  if (typeof meta === 'string') return meta;

  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

function write(level, message, ...meta) {
  const currentLevel = resolveLogLevel();
  if (LEVELS[level] > LEVELS[currentLevel]) return;

  const timestamp = new Date().toISOString();
  const scope = process.env.LOG_SCOPE || 'server';
  const detail = meta.map(serializeMeta).filter(Boolean).join(' ');
  const baseMessage = serializeMeta(message);
  const line = `[${timestamp}] [${scope}] [${level.toUpperCase()}] ${baseMessage}${detail ? ` ${detail}` : ''}`;

  if (level === 'error') {
    nativeConsole.error(line);
    return;
  }

  if (level === 'warn') {
    nativeConsole.warn(line);
    return;
  }

  nativeConsole.log(line);
}

const logger = {
  error: (message, ...meta) => write('error', message, ...meta),
  warn: (message, ...meta) => write('warn', message, ...meta),
  info: (message, ...meta) => write('info', message, ...meta),
  debug: (message, ...meta) => write('debug', message, ...meta),
  installConsoleBridge: () => {
    if (consoleBridgeInstalled) return;
    consoleBridgeInstalled = true;

    console.error = (...args) => logger.error(args[0], ...args.slice(1));
    console.warn = (...args) => logger.warn(args[0], ...args.slice(1));
    console.info = (...args) => logger.info(args[0], ...args.slice(1));
    console.debug = (...args) => logger.debug(args[0], ...args.slice(1));
    console.log = (...args) => logger.info(args[0], ...args.slice(1));
  },
};

module.exports = logger;
