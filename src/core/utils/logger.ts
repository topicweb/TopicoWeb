/** Structured logger. Only reviewed event names and low-risk aggregate fields are emitted. */
export const LOG_EVENTS = [
  'device.storage_unavailable', 'device.storage_failed', 'device.reset',
  'sync.table_failed', 'sync.conflict_skipped', 'sync.foreign_key_retry',
  'sync.request_failed', 'sync.completed', 'network.initial_state', 'network.online', 'network.offline',
  'service_worker.registered', 'service_worker.registration_failed',
  'report.generate_failed', 'visit.save_failed', 'stock.operation_failed', 'movement.register_failed',
  'auth.legacy_session', 'auth.profile_refresh_skipped', 'auth.profile_resolution_failed', 'auth.email_refresh_skipped',
  'auth.session_rejected', 'auth.legacy_migration_failed', 'auth.sign_out_failed', 'auth.cache_failed', 'security.csp_report',
] as const;

export type LogEvent = (typeof LOG_EVENTS)[number];
export type LogFields = {
  /** Broad subsystem label; never place user or record data here. */
  area?: 'patients' | 'visits' | 'inventory' | 'movements' | 'profiles' | 'programs' | 'institutions' | 'sync' | 'auth' | 'device' | 'service_worker' | 'reports';
  operation?: 'read' | 'create' | 'update' | 'delete' | 'push' | 'pull' | 'register' | 'reset' | 'refresh' | 'resolve';
  count?: number;
  online?: boolean;
  cspDirective?: 'default-src' | 'script-src' | 'style-src' | 'img-src' | 'connect-src' | 'font-src' | 'object-src' | 'base-uri' | 'frame-ancestors' | 'form-action' | 'upgrade-insecure-requests' | 'other';
};

const eventSet: ReadonlySet<string> = new Set(LOG_EVENTS);
const areas: ReadonlySet<string> = new Set(['patients', 'visits', 'inventory', 'movements', 'profiles', 'programs', 'institutions', 'sync', 'auth', 'device', 'service_worker', 'reports']);
const operations: ReadonlySet<string> = new Set(['read', 'create', 'update', 'delete', 'push', 'pull', 'register', 'reset', 'refresh', 'resolve']);
const directives: ReadonlySet<string> = new Set(['default-src', 'script-src', 'style-src', 'img-src', 'connect-src', 'font-src', 'object-src', 'base-uri', 'frame-ancestors', 'form-action', 'upgrade-insecure-requests', 'other']);
const isDevelopment = process.env.NODE_ENV === 'development';

function safeFields(fields?: LogFields): LogFields {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};
  const safe: LogFields = {};
  if (typeof fields.area === 'string' && areas.has(fields.area)) safe.area = fields.area;
  if (typeof fields.operation === 'string' && operations.has(fields.operation)) safe.operation = fields.operation;
  if (typeof fields.count === 'number' && Number.isSafeInteger(fields.count) && fields.count >= 0) safe.count = fields.count;
  if (typeof fields.online === 'boolean') safe.online = fields.online;
  if (typeof fields.cspDirective === 'string' && directives.has(fields.cspDirective)) safe.cspDirective = fields.cspDirective as LogFields['cspDirective'];
  return safe;
}

class Logger {
  private write(level: 'debug' | 'info' | 'warn' | 'error', event: LogEvent, fields?: LogFields): void {
    // Runtime guard protects JavaScript callers and casts that bypass the TypeScript union.
    if (!eventSet.has(event)) return;
    if (!isDevelopment && level !== 'warn' && level !== 'error') return;
    const record = { event, ...safeFields(fields) };
    if (level === 'error') console.error(record);
    else if (level === 'warn') console.warn(record);
    else console.log(record);
  }

  debug(event: LogEvent, fields?: LogFields): void { this.write('debug', event, fields); }
  info(event: LogEvent, fields?: LogFields): void { this.write('info', event, fields); }
  warn(event: LogEvent, fields?: LogFields): void { this.write('warn', event, fields); }
  error(event: LogEvent, fields?: LogFields): void { this.write('error', event, fields); }
}

export const logger = new Logger();
