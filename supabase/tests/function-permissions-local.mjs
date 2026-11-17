import { randomUUID, randomBytes } from 'node:crypto';

const base = process.env.LOCAL_SUPABASE_URL;
const anonKey = process.env.LOCAL_SUPABASE_ANON_KEY;
const serviceKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
if (!base || !anonKey || !serviceKey) throw new Error('Missing LOCAL_SUPABASE_* configuration');
const url = new URL(base);
if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
  throw new Error('LOCAL_SUPABASE_URL must use http://127.0.0.1 or http://localhost');
}
const root = url.origin;
const ids = { active: randomUUID(), inactive: randomUUID(), deleted: randomUUID() };
const emails = Object.fromEntries(Object.keys(ids).map(k => [k, `${randomUUID()}@example.invalid`]));
const password = `${randomBytes(24).toString('base64url')}Aa1!`;
const created = [];
const checks = [];
function assert(ok, name, status = 'n/a') {
  checks.push(`${name}: ${status}`);
  if (!ok) throw new Error(`FAIL ${name} (${status})`);
}
async function request(path, { method = 'GET', token = serviceKey, body, headers = {} } = {}) {
  const res = await fetch(`${root}${path}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: {
      apikey: token === serviceKey ? serviceKey : anonKey,
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { res, data };
}
const rest = (table, query, options = {}) => request(`/rest/v1/${table}?${query}`, options);
async function login(key) {
  const { res, data } = await request('/auth/v1/token?grant_type=password', {
    method: 'POST', token: anonKey, body: { email: emails[key], password },
  });
  assert(res.ok && data?.access_token, `login-${key}`, res.status);
  return data.access_token;
}
let failure;
try {
  for (const key of Object.keys(ids)) {
    const { res, data } = await request('/auth/v1/admin/users', {
      method: 'POST', body: { email: emails[key], password, email_confirm: true },
    });
    assert(res.ok && data?.id, `create-${key}`, res.status);
    ids[key] = data.id;
    created.push(data.id);
  }
  for (const [key, rol, activo, deletedAt] of [
    ['active', 'admin', true, null],
    ['inactive', 'admin', false, null],
    ['deleted', 'personal', true, new Date().toISOString()],
  ]) {
    const { res } = await rest('perfiles', 'select=id', {
      method: 'POST',
      body: { id: ids[key], nombre: `Function test ${key}`, email: emails[key], rol, activo, deleted_at: deletedAt },
    });
    assert(res.ok, `seed-profile-${key}`, res.status);
  }

  const [activeToken, inactiveToken, deletedToken] = await Promise.all([
    login('active'), login('inactive'), login('deleted'),
  ]);
  const activeRole = await request('/rest/v1/rpc/get_my_role', { method: 'POST', token: activeToken, body: {} });
  assert(activeRole.res.ok && activeRole.data === 'admin', 'active-get-my-role', activeRole.res.status);
  const inactiveRole = await request('/rest/v1/rpc/get_my_role', { method: 'POST', token: inactiveToken, body: {} });
  assert(inactiveRole.res.ok && inactiveRole.data === null, 'inactive-get-my-role-null', inactiveRole.res.status);
  const deletedRole = await request('/rest/v1/rpc/get_my_role', { method: 'POST', token: deletedToken, body: {} });
  assert(deletedRole.res.ok && deletedRole.data === null, 'deleted-get-my-role-null', deletedRole.res.status);

  const anonPasswordRpc = await request('/rest/v1/rpc/validate_password_strength', {
    method: 'POST', token: anonKey, body: { password_text: password },
  });
  assert(!anonPasswordRpc.res.ok, 'anon-password-rpc-denied', anonPasswordRpc.res.status);
  const authenticatedPasswordRpc = await request('/rest/v1/rpc/validate_password_strength', {
    method: 'POST', token: activeToken, body: { password_text: password },
  });
  assert(!authenticatedPasswordRpc.res.ok, 'authenticated-password-rpc-denied', authenticatedPasswordRpc.res.status);
} catch (e) {
  failure = e;
} finally {
  for (const id of created) {
    try {
      const r = await request(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
      if (!r.res.ok) failure ??= new Error(`Cleanup failed for Auth user (${r.res.status})`);
    } catch { failure ??= new Error('Cleanup failed for Auth user (network error)'); }
  }
}
for (const check of checks) console.log(check);
if (failure) throw failure;
console.log('cleanup: ok');
