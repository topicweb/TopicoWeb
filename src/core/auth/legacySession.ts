import type { SupabaseClient } from '@supabase/supabase-js';

/** Remove a legacy credential only after a current session is confirmed or a
 * matching migration succeeds. Never erase the sole credential after failure. */
export async function migrateLegacySession(client: SupabaseClient, url: string | undefined, storage: Storage): Promise<void> {
  if (!url) return;
  const project = new URL(url).hostname.split('.')[0];
  const key = `sb-${project}-auth-token`;
  const raw = storage.getItem(key);
  if (!raw) return;
  const current = await client.auth.getSession();
  if (current.error) throw new Error('Legacy session check failed');
  if (current.data.session) {
    // Online getUser validates the active identity; offline retain until retry.
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const verified = await client.auth.getUser();
    if (verified.error || verified.data.user?.id !== current.data.session.user.id) throw new Error('Current session is unverified');
    storage.removeItem(key);
    return;
  }
  const parsed = JSON.parse(raw);
  const candidate = parsed.currentSession ?? parsed;
  if (typeof candidate.access_token !== 'string' || typeof candidate.refresh_token !== 'string') throw new Error('Invalid legacy credential');
  const result = await client.auth.setSession({ access_token: candidate.access_token, refresh_token: candidate.refresh_token });
  if (result.error || !result.data.session) throw new Error('Legacy migration failed');
  const verified = await client.auth.getUser();
  if (verified.error || verified.data.user?.id !== result.data.session.user.id) throw new Error('Legacy identity mismatch');
  storage.removeItem(key);
}
