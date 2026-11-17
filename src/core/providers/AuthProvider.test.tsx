import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authCallback: null as ((event: string, value: ReturnType<typeof session> | null) => void) | null,
  getUser: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
  openAccountCache: vi.fn(),
  lockAccountCache: vi.fn(),
  isAccountCacheOpen: vi.fn(),
  profileGet: vi.fn(),
  profilePut: vi.fn(),
  profileDelete: vi.fn(),
  dbDelete: vi.fn(),
  setContext: vi.fn(),
  replaceSessionDocument: vi.fn(),
  liveQuery: vi.fn(),
  migrateLegacySession: vi.fn(),
  purgePrivateResponses: vi.fn(),
  clearLocalAuthCredentials: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  remoteProfileResult: null as Promise<unknown> | null,
}));

vi.mock('@/core/db/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: (event: string, value: ReturnType<typeof session> | null) => void) => {
        mocks.authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getUser: (...args: unknown[]) => mocks.getUser(...args),
      signOut: (...args: unknown[]) => mocks.signOut(...args),
    },
    from: (...args: unknown[]) => mocks.from(...args),
  },
}));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: (...args: unknown[]) => mocks.liveQuery(...args) }));
vi.mock('@/core/db/dexie/db', () => ({
  db: {
    perfiles: {
      get: (...args: unknown[]) => mocks.profileGet(...args),
      put: (...args: unknown[]) => mocks.profilePut(...args),
      delete: (...args: unknown[]) => mocks.profileDelete(...args),
    },
    delete: (...args: unknown[]) => mocks.dbDelete(...args),
  },
  openAccountCache: (...args: unknown[]) => mocks.openAccountCache(...args),
  lockAccountCache: (...args: unknown[]) => mocks.lockAccountCache(...args),
  isAccountCacheOpen: (...args: unknown[]) => mocks.isAccountCacheOpen(...args),
}));
vi.mock('@/core/db/sync', () => ({ syncService: { setContext: (...args: unknown[]) => mocks.setContext(...args) } }));
vi.mock('@/core/auth/legacySession', () => ({ migrateLegacySession: (...args: unknown[]) => mocks.migrateLegacySession(...args) }));
vi.mock('@/core/auth/privacy', () => ({
  clearLocalAuthCredentials: (...args: unknown[]) => mocks.clearLocalAuthCredentials(...args),
  purgePrivateResponses: (...args: unknown[]) => mocks.purgePrivateResponses(...args),
}));
vi.mock('@/core/auth/navigation', () => ({ replaceSessionDocument: (path: string) => mocks.replaceSessionDocument(path) }));
vi.mock('@/core/utils/deviceId', () => ({ getDeviceId: () => 'test-device' }));
vi.mock('@/core/utils/logger', () => ({ logger: { warn: (...args: unknown[]) => mocks.loggerWarn(...args), error: (...args: unknown[]) => mocks.loggerError(...args) } }));

import { AuthProvider, useAuth } from '@/core/providers/AuthProvider';

const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const profile = (id: string) => ({
  id, nombre: `Perfil ${id}`, email: `${id}@example.invalid`, rol: 'admin' as const,
  activo: 1, deleted_at: null, business_id: `tenant-${id}`, sync_status: 'synced' as const,
});
const session = (id: string) => ({ user: { id, email: `${id}@example.invalid` }, access_token: `token-${id}` });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

let root: Root;
let container: HTMLDivElement;
let current: ReturnType<typeof useAuth>;
function CaptureAuth() {
  const value = useAuth();
  useEffect(() => { current = value; }, [value]);
  return null;
}
async function renderProvider() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(<AuthProvider><CaptureAuth /></AuthProvider>); });
  await flush();
}
async function flush() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
}
function emit(event: string, value: ReturnType<typeof session> | null) {
  act(() => { mocks.authCallback?.(event, value); });
}
function online(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}
function remoteResult(row: ReturnType<typeof profile> | null) {
  mocks.remoteProfileResult = Promise.resolve({ data: row, error: null });
  mocks.from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: () => mocks.remoteProfileResult }) }),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authCallback = null;
  mocks.remoteProfileResult = null;
  mocks.getUser.mockResolvedValue({ data: { user: { id: userA } }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.profileGet.mockResolvedValue(undefined);
  mocks.profilePut.mockResolvedValue(undefined);
  mocks.openAccountCache.mockResolvedValue(undefined);
  mocks.isAccountCacheOpen.mockReturnValue(true);
  mocks.liveQuery.mockReturnValue(undefined);
  mocks.migrateLegacySession.mockResolvedValue(undefined);
  mocks.purgePrivateResponses.mockResolvedValue(undefined);
  online(true);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  container?.remove();
  vi.restoreAllMocks();
});

describe('AuthProvider session boundaries', () => {
  it('does not open a cache or start sync when no session exists', async () => {
    await renderProvider();
    emit('SIGNED_OUT', null);
    await flush();

    expect(mocks.openAccountCache).not.toHaveBeenCalled();
    expect(mocks.profileGet).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.setContext.mock.calls.every(([context]) => context === null)).toBe(true);
    expect(current.user).toBeNull();
    expect(current.businessId).toBeNull();
  });

  it('verifies the online identity and remote profile before exposing authenticated context', async () => {
    const identityCheck = deferred<unknown>();
    const remoteCheck = deferred<unknown>();
    mocks.getUser.mockReturnValue(identityCheck.promise);
    mocks.remoteProfileResult = remoteCheck.promise;
    mocks.from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => mocks.remoteProfileResult }) }),
    }));
    await renderProvider();
    emit('SIGNED_IN', session(userA));

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.openAccountCache).not.toHaveBeenCalled();
    await flush();
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    expect(mocks.openAccountCache).not.toHaveBeenCalled();

    await act(async () => { identityCheck.resolve({ data: { user: { id: userA } }, error: null }); });
    await flush();
    expect(mocks.openAccountCache).toHaveBeenCalledWith(userA);
    expect(mocks.from).toHaveBeenCalledWith('perfiles');
    expect(current.user).toBeNull();
    expect(mocks.setContext.mock.calls.every(([context]) => context === null)).toBe(true);

    await act(async () => { remoteCheck.resolve({ data: profile(userA), error: null }); });
    await flush();
    expect(mocks.profilePut).toHaveBeenCalledWith(expect.objectContaining({ id: userA, activo: 1 }));
    expect(current.user?.id).toBe(userA);
    expect(current.perfil?.id).toBe(userA);
    expect(current.businessId).toBe(`tenant-${userA}`);
    expect(mocks.setContext).toHaveBeenCalledWith(expect.objectContaining({ userId: userA, businessId: `tenant-${userA}` }));
  });

  it('restores only the matching account profile while offline', async () => {
    online(false);
    mocks.profileGet.mockImplementation(async (id: string) => id === userA ? profile(userA) : undefined);
    await renderProvider();
    emit('SIGNED_IN', session(userA));
    await flush();

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.openAccountCache).toHaveBeenCalledWith(userA);
    expect(mocks.profileGet).toHaveBeenCalledWith(userA);
    expect(current.user?.id).toBe(userA);
    expect(current.perfil?.id).toBe(userA);
  });

  it('does not expose another account when the offline cache has no matching profile', async () => {
    online(false);
    mocks.profileGet.mockImplementation(async (id: string) => id === userA ? profile(userA) : undefined);
    await renderProvider();
    emit('SIGNED_IN', session(userB));
    await flush();
    await flush();

    expect(mocks.openAccountCache).toHaveBeenCalledWith(userB);
    expect(mocks.profileGet).toHaveBeenCalledWith(userB);
    expect(current.user).toBeNull();
    expect(current.perfil).toBeNull();
    expect(current.businessId).toBeNull();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.clearLocalAuthCredentials).not.toHaveBeenCalled();
    expect(mocks.lockAccountCache).toHaveBeenCalled();
  });

  it('locks and hard-navigates before opening the second account cache', async () => {
    remoteResult(profile(userA));
    await renderProvider();
    emit('SIGNED_IN', session(userA));
    await flush();
    expect(current.user?.id).toBe(userA);
    const openCount = mocks.openAccountCache.mock.calls.length;

    emit('SIGNED_IN', session(userB));

    expect(mocks.lockAccountCache).toHaveBeenCalled();
    expect(mocks.replaceSessionDocument).toHaveBeenCalledWith('/dashboard');
    expect(mocks.openAccountCache).toHaveBeenCalledTimes(openCount);
    expect(current.user).toBeNull();
    expect(current.businessId).toBeNull();
  });

  it('keeps cached tables intact and locks on sign-out, even when Auth sign-out errors', async () => {
    remoteResult(profile(userA));
    await renderProvider();
    emit('SIGNED_IN', session(userA));
    await flush();
    mocks.signOut.mockResolvedValue({ error: new Error('offline') });
    const profileReads = mocks.profileGet.mock.calls.length;

    await act(async () => { await current.signOut(); });

    expect(mocks.lockAccountCache).toHaveBeenCalled();
    expect(mocks.replaceSessionDocument).toHaveBeenCalledWith('/login');
    expect(mocks.profileDelete).not.toHaveBeenCalled();
    expect(mocks.dbDelete).not.toHaveBeenCalled();
    expect(mocks.profileGet).toHaveBeenCalledTimes(profileReads);
    expect(mocks.loggerWarn.mock.calls).toEqual([['auth.sign_out_failed']]);
    expect(current.user).toBeNull();
    expect(current.businessId).toBeNull();
  });

  it('ignores a stale remote profile response after the session changes', async () => {
    const remoteA = deferred<unknown>();
    mocks.remoteProfileResult = remoteA.promise;
    mocks.from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => mocks.remoteProfileResult }) }),
    }));
    await renderProvider();
    emit('SIGNED_IN', session(userA));
    await flush();
    expect(mocks.from).toHaveBeenCalledWith('perfiles');

    emit('SIGNED_IN', session(userB));
    await act(async () => { remoteA.resolve({ data: profile(userA), error: null }); });
    await flush();

    expect(mocks.profilePut).not.toHaveBeenCalled();
    expect(mocks.openAccountCache).toHaveBeenCalledTimes(1);
    expect(mocks.lockAccountCache).toHaveBeenCalled();
    expect(current.user).toBeNull();
    expect(mocks.replaceSessionDocument).toHaveBeenCalledWith('/dashboard');
  });

  it('does not discard credentials after a transient verification failure', async () => {
    mocks.getUser.mockResolvedValue({data:{user:null},error:{status:503}});
    await renderProvider(); emit('SIGNED_IN',session(userA)); await flush();
    expect(current.user).toBeNull(); expect(mocks.openAccountCache).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled(); expect(mocks.clearLocalAuthCredentials).not.toHaveBeenCalled();
  });

  it('explicit offline logout locks immediately without waiting for the network', async () => {
    online(false); mocks.profileGet.mockResolvedValue(profile(userA));
    await renderProvider(); emit('INITIAL_SESSION',session(userA)); await flush();
    await act(async()=>{await current.signOut();});
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.clearLocalAuthCredentials).toHaveBeenCalledOnce();
    expect(mocks.replaceSessionDocument).toHaveBeenCalledWith('/login');
    expect(mocks.dbDelete).not.toHaveBeenCalled(); expect(current.user).toBeNull();
  });

  it.each(['storage','pageshow'])('locks the old document after %s crosses a session boundary', async kind => {
    remoteResult(profile(userA));
    await renderProvider(); emit('SIGNED_IN',session(userA)); await flush();
    await act(async()=>{
      if(kind==='storage') window.dispatchEvent(new StorageEvent('storage',{key:'topico:session-changed'}));
      else {const event=new Event('pageshow'); Object.defineProperty(event,'persisted',{value:true});window.dispatchEvent(event);}
    });
    expect(mocks.lockAccountCache).toHaveBeenCalled();
    expect(mocks.replaceSessionDocument).toHaveBeenCalledWith('/login');
    expect(current.user).toBeNull(); expect(current.businessId).toBeNull();
    expect(mocks.dbDelete).not.toHaveBeenCalled();
  });
});
