import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { migrateLegacySession } from './legacySession';
const key='sb-synthetic-auth-token';
const session={user:{id:'A'}};
const auth={getSession:vi.fn(),getUser:vi.fn(),setSession:vi.fn()};
const client={auth} as unknown as SupabaseClient;
beforeEach(()=>{
  vi.clearAllMocks(); localStorage.clear();
  localStorage.setItem(key,JSON.stringify({access_token:'SENSITIVE_ACCESS',refresh_token:'SENSITIVE_REFRESH'}));
  auth.getSession.mockResolvedValue({data:{session:null},error:null});
  auth.getUser.mockResolvedValue({data:{user:{id:'A'}},error:null});
  auth.setSession.mockResolvedValue({data:{session},error:null});
});
describe('legacy credential migration',()=>{
  it('removes the legacy credential only after migration and identity verification',async()=>{
    await migrateLegacySession(client,'https://synthetic.supabase.co',localStorage);
    expect(auth.setSession).toHaveBeenCalledOnce(); expect(localStorage.getItem(key)).toBeNull();
  });
  it('also removes a residual credential when a different active session is verified',async()=>{
    auth.getSession.mockResolvedValue({data:{session},error:null});
    localStorage.setItem(key,'malformed-but-obsolete');
    await migrateLegacySession(client,'https://synthetic.supabase.co',localStorage);
    expect(auth.setSession).not.toHaveBeenCalled(); expect(localStorage.getItem(key)).toBeNull();
  });
  it.each(['setSession','getUser','getSession'])('preserves the sole credential when %s fails',async method=>{
    auth[method as keyof typeof auth].mockResolvedValue({data:{session:null,user:null},error:{message:'SENSITIVE'}});
    await expect(migrateLegacySession(client,'https://synthetic.supabase.co',localStorage)).rejects.toThrow();
    expect(localStorage.getItem(key)).not.toBeNull();
  });
  it('preserves the credential if identity verification returns a different user',async()=>{
    auth.getUser.mockResolvedValue({data:{user:{id:'B'}},error:null});
    await expect(migrateLegacySession(client,'https://synthetic.supabase.co',localStorage)).rejects.toThrow();
    expect(localStorage.getItem(key)).not.toBeNull();
  });
  it('does not discard corrupt credentials without a verified current session',async()=>{
    localStorage.setItem(key,'malformed');
    await expect(migrateLegacySession(client,'https://synthetic.supabase.co',localStorage)).rejects.toThrow();
    expect(localStorage.getItem(key)).toBe('malformed');
  });
});
