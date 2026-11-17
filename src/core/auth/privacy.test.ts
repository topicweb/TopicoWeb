import { describe, expect, it, vi } from 'vitest';
import { clearLocalAuthCredentials, purgePrivateResponses } from './privacy';
describe('private response cleanup',()=>{
  it('removes private responses while retaining public assets and unrelated caches',async()=>{
    const urls=['https://app.test/dashboard/patients','https://app.test/login','https://app.test/api/users','https://app.test/dashboard?_rsc=1','https://remote.test/auth/v1/token','https://app.test/_next/static/app.js','https://app.test/logo.webp'];
    const cache={keys:async()=>urls.map(url=>({url})),delete:vi.fn(async (request: Request)=>!!request)};
    const open=vi.fn(async()=>cache);
    await purgePrivateResponses({keys:async()=>['cross-origin','unrelated-app'],open} as unknown as CacheStorage,'https://app.test');
    expect(open).toHaveBeenCalledTimes(1);
    expect(cache.delete.mock.calls.map(c=>(c[0] as unknown as Request).url)).toEqual(urls.slice(0,5));
  });
  it('explicit logout clears only this project credentials and chunks',()=>{
    localStorage.setItem('sb-synthetic-auth-token','secret'); localStorage.setItem('deviceId','device');
    const jar={cookie:'sb-synthetic-auth-token.0=secret; sb-synthetic-auth-token.1=secret; other-project=value'};
    const writes:string[]=[];
    Object.defineProperty(jar,'cookie',{get:()=> 'sb-synthetic-auth-token.0=secret; sb-synthetic-auth-token.1=secret; other-project=value',set:(value:string)=>writes.push(value)});
    clearLocalAuthCredentials('https://synthetic.supabase.co',localStorage,jar as unknown as Document);
    expect(writes).toHaveLength(2); expect(writes.every(v=>v.includes('Max-Age=0'))).toBe(true);
    expect(localStorage.getItem('sb-synthetic-auth-token')).toBeNull(); expect(localStorage.getItem('deviceId')).toBe('device');
  });
  it('does not touch a Workbox precache belonging to another service-worker scope',async()=>{
    const cache={keys:async()=>[{url:'https://app.test/dashboard'}],delete:vi.fn(async()=>true)};
    const open=vi.fn(async()=>cache);
    await purgePrivateResponses({keys:async()=>['workbox-precache-v2-https://app.test/other/','workbox-precache-v2-https://app.test/'],open} as unknown as CacheStorage,'https://app.test');
    expect(open).toHaveBeenCalledOnce(); expect(open).toHaveBeenCalledWith('workbox-precache-v2-https://app.test/');
    expect(cache.delete).toHaveBeenCalledOnce();
  });
});
