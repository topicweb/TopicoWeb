import { spawn } from 'node:child_process';
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
const ids = Object.fromEntries(['tenantA','tenantB','adminA','personalA','personalB','inactiveA','patientA','patientB'].map(k=>[k,randomUUID()]));
const pwd = randomBytes(24).toString('base64url') + 'Aa1!';
const emails = Object.fromEntries(['adminA','personalA','personalB','inactiveA'].map(k=>[k,`${randomUUID()}@example.invalid`]));
const createdAuth = [];
const checks=[];
function assert(ok,name,status='n/a'){ checks.push(`${name}: ${status}`); if(!ok) throw new Error(`FAIL ${name} (${status})`); }
async function request(path,{method='GET',token=serviceKey,body,headers={}}={}) {
  const res=await fetch(`${root}${path}`,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{apikey:token===serviceKey?serviceKey:anonKey,Authorization:`Bearer ${token}`,...(body!==undefined?{'content-type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  let data=null; try { data=await res.json(); } catch {}
  return {res,data};
}
const rest=(table,query,options={})=>request(`/rest/v1/${table}?${query}`,options);
async function expectRows(name,result,count){ assert(result.res.ok&&Array.isArray(result.data)&&result.data.length===count,name,result.res.status); }
let failure;
try {
  const roles=[['adminA','admin',ids.tenantA,true],['personalA','personal',ids.tenantA,true],['personalB','personal',ids.tenantB,true],['inactiveA','personal',ids.tenantA,false]];
  for(const [k] of roles){const {res,data}=await request('/auth/v1/admin/users',{method:'POST',body:{email:emails[k],password:pwd,email_confirm:true}}); assert(res.ok&&data?.id,`create-${k}`,res.status); ids[k]=data.id; createdAuth.push(data.id);}
  for(const [id,nombre] of [[ids.tenantA,'Synthetic A'],[ids.tenantB,'Synthetic B']]){const r=await rest('instituciones','select=id',{method:'POST',body:{id,nombre}});assert(r.res.ok,`seed-institucion`,r.res.status);}
  for(const [k,rol,business_id,activo] of roles){const r=await rest('perfiles','select=id',{method:'POST',body:{id:ids[k],nombre:`Test ${k}`,email:emails[k],rol,activo,business_id}});assert(r.res.ok,`seed-perfil-${k}`,r.res.status);}
  const { createBrowserClient, createServerClient } = await import('@supabase/ssr');
  const cookieJar = new Map();
  const browserClient = createBrowserClient(root, anonKey, {
    isSingleton: false,
    auth: { autoRefreshToken: false },
    cookies: {
      getAll: () => [...cookieJar].map(([name,value]) => ({ name, value })),
      setAll: cookies => cookies.forEach(({name,value}) => cookieJar.set(name,value)),
    },
  });
  const {data:ssrLogin,error:ssrLoginError}=await browserClient.auth.signInWithPassword({email:emails.personalA,password:pwd});
  assert(!ssrLoginError&&ssrLogin?.user?.id===ids.personalA&&cookieJar.size>0,'ssr-browser-login-cookie-jar',200);
  const makeServerClient=()=>createServerClient(root,anonKey,{
    auth:{autoRefreshToken:false},
    cookies:{
      getAll:()=>[...cookieJar].map(([name,value])=>({name,value})),
      setAll:cookies=>cookies.forEach(({name,value})=>cookieJar.set(name,value)),
    },
  });
  let serverClient=makeServerClient();
  const {data:ssrUser,error:ssrUserError}=await serverClient.auth.getUser();
  assert(!ssrUserError&&ssrUser?.user?.id===ids.personalA,'ssr-server-get-user',200);
  const {data:refreshed,error:refreshError}=await serverClient.auth.refreshSession();
  assert(!refreshError&&refreshed?.user?.id===ids.personalA,'ssr-server-refresh-session',200);
  serverClient=makeServerClient();
  const {data:afterRefresh,error:afterRefreshError}=await serverClient.auth.getUser();
  assert(!afterRefreshError&&afterRefresh?.user?.id===ids.personalA,'ssr-cookie-jar-after-refresh',200);
  const {error:signOutError}=await serverClient.auth.signOut();
  assert(!signOutError,'ssr-server-signout',200);
  browserClient.auth.stopAutoRefresh();
  async function login(k){const r=await request('/auth/v1/token?grant_type=password',{method:'POST',token:anonKey,body:{email:emails[k],password:pwd}});assert(r.res.ok&&r.data?.access_token,`login-${k}`,r.res.status);return r.data.access_token;}
  const [a,b,p,inactive]=await Promise.all(['adminA','personalB','personalA','inactiveA'].map(login));
  await expectRows('A-lee-institucion-A',await rest('instituciones',`select=id&id=eq.${ids.tenantA}`,{token:a}),1);
  await expectRows('A-lee-perfiles-A',await rest('perfiles',`select=id&business_id=eq.${ids.tenantA}`,{token:a}),3);
  await expectRows('B-no-ve-A',await rest('perfiles',`select=id&business_id=eq.${ids.tenantA}`,{token:b}),0);
  const patient={id:ids.patientA,business_id:ids.tenantA,dni:`T${randomUUID().replaceAll('-','').slice(0,9)}`,nombres:'Synthetic',apellidos:'Patient',categoria:'estudiante'};
  const patientB={...patient,id:ids.patientB,business_id:ids.tenantB,dni:`T${randomUUID().replaceAll('-','').slice(0,9)}`};
  const seededB=await rest('pacientes','select=id',{method:'POST',body:patientB});assert(seededB.res.ok,'seed-paciente-B',seededB.res.status);
  const patch=await rest('perfiles',`id=eq.${ids.personalA}`,{method:'PATCH',token:p,headers:{Prefer:'return=representation'},body:{rol:'admin',business_id:ids.tenantB,activo:false}});
  const verify=await rest('perfiles',`select=rol,business_id,activo&id=eq.${ids.personalA}`);
  assert((![200,201].includes(patch.res.status)||!Array.isArray(patch.data)||patch.data.length===0)&&verify.res.ok&&verify.data?.[0]?.rol==='personal'&&verify.data[0].business_id===ids.tenantA&&verify.data[0].activo===true,'self-cannot-escalate',patch.res.status);
  const ins=await rest('pacientes','select=id',{method:'POST',token:p,headers:{Prefer:'return=representation'},body:patient});assert(ins.res.ok&&ins.data?.length===1&&ins.data[0].id===ids.patientA, 'A-insert-paciente',ins.res.status);
  await expectRows('B-no-ve-paciente-A',await rest('pacientes',`select=id&id=eq.${ids.patientA}`,{token:b}),0);
  const up=await rest('pacientes','on_conflict=id&select=id,nombres',{method:'POST',token:p,headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:{...patient,nombres:'Synthetic Updated'}});assert(up.res.ok&&up.data?.length===1&&up.data[0].id===ids.patientA&&up.data[0].nombres==='Synthetic Updated','A-upsert-paciente',up.res.status);
  const foreign=await rest('pacientes','select=id',{method:'POST',token:p,body:{...patient,id:ids.patientB,business_id:ids.tenantB,dni:`T${randomUUID().replaceAll('-','').slice(0,9)}`}});assert(!foreign.res.ok,'A-insert-paciente-B',foreign.res.status);
  const upd=await rest('pacientes',`id=eq.${ids.patientB}`,{method:'PATCH',token:p,headers:{Prefer:'return=representation'},body:{nombres:'Tampered'}});
  const verifyPatientB=await rest('pacientes',`select=nombres&id=eq.${ids.patientB}`);
  assert(upd.res.ok&&upd.data?.length===0&&verifyPatientB.res.ok&&verifyPatientB.data?.[0]?.nombres==='Synthetic','A-patch-paciente-B',upd.res.status);
  await expectRows('inactive-no-pacientes',await rest('pacientes','select=id',{token:inactive}),0);
  await expectRows('inactive-own-profile',await rest('perfiles',`select=id&id=eq.${ids.inactiveA}`,{token:inactive}),1);
  // Fase 6: paginación real, frontera RPC y reloj no confiable.
  const boundary = async () => {
    const r = await request('/rest/v1/rpc/topico_sync_boundary',{method:'POST',token:p,body:{}});
    assert(r.res.ok && typeof r.data === 'string','server-boundary',r.res.status); return r.data;
  };
  const deniedBoundary=await request('/rest/v1/rpc/topico_sync_boundary',{method:'POST',token:anonKey,body:{}});
  assert(!deniedBoundary.res.ok,'anon-boundary-denied',deniedBoundary.res.status);
  const inactiveBoundary=await request('/rest/v1/rpc/topico_sync_boundary',{method:'POST',token:inactive,body:{}});
  assert(!inactiveBoundary.res.ok,'inactive-boundary-denied',inactiveBoundary.res.status);
  const syntheticRows=Array.from({length:425},(_,i)=>({...patient,id:randomUUID(),dni:`S${randomUUID().replaceAll('-','').slice(0,9)}`,actualizado_at:'2099-01-01T00:00:00Z'}));
  try {
    const seeded=await rest('pacientes','select=id,actualizado_at',{method:'POST',token:p,headers:{Prefer:'return=representation'},body:syntheticRows});
    assert(seeded.res.ok&&seeded.data.length===425,'seed-425-patients',seeded.res.status);
    assert(seeded.data.every(row=>!row.actualizado_at.startsWith('2099')),'server-overrides-client-clock',seeded.res.status);
    const upper=await boundary();
    const found=[]; let after; let pages=0;
    while(true){
      const q=new URLSearchParams({select:'id,actualizado_at',business_id:`eq.${ids.tenantA}`,actualizado_at:`lte.${upper}`,order:'actualizado_at.asc,id.asc',limit:'200'});
      if(after) q.set('or',`(actualizado_at.gt.${after.actualizado_at},and(actualizado_at.eq.${after.actualizado_at},id.gt.${after.id}))`);
      const r=await rest('pacientes',q.toString(),{token:p});
      assert(r.res.ok&&Array.isArray(r.data),'pull-page',r.res.status); pages++; if(!r.data.length)break; found.push(...r.data); after=r.data.at(-1);
    }
    assert(pages>=4&&new Set(found.map(r=>r.id)).size===426,'complete-keyset-pages');
    const edit=await rest('pacientes',`id=eq.${syntheticRows[0].id}&select=id,actualizado_at`,{method:'PATCH',token:p,headers:{Prefer:'return=representation'},body:{nombres:'after-boundary',actualizado_at:'2000-01-01T00:00:00Z'}});
    assert(edit.res.ok&&edit.data[0].actualizado_at>upper,'write-after-boundary-is-newer',edit.res.status);
    const delta=await rest('pacientes',new URLSearchParams({select:'id',business_id:`eq.${ids.tenantA}`,actualizado_at:`gte.${upper}`}).toString(),{token:p});
    assert(delta.res.ok&&delta.data.some(row=>row.id===syntheticRows[0].id),'incremental-includes-later-write',delta.res.status);
    // Una transacción ya estampada tarda en confirmar: la frontera debe esperarla.
    const sql=`BEGIN; UPDATE public.pacientes SET nombres='slow writer' WHERE id='${syntheticRows[1].id}'; SELECT 'writer-ready'; SELECT pg_sleep(1); SELECT clock_timestamp(); COMMIT;`;
    const child=spawn('docker',['exec','-i','supabase_db_topico-refactor-stack-20261116','psql','-U','postgres','-At','-v','ON_ERROR_STOP=1'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let stdout='',stderr=''; let readyResolve,readyReject;
    const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
    child.stdout.on('data',chunk=>{stdout+=chunk; if(stdout.includes('writer-ready'))readyResolve();});
    child.stderr.on('data',chunk=>{stderr+=chunk;});
    const finished=new Promise((resolve,reject)=>{child.on('error',error=>{readyReject(error);reject(error);});child.on('exit',code=>{if(code===0)resolve();else{const error=new Error(`local writer failed (${code})`);readyReject(error);reject(error);}});});
    child.stdin.end(sql);
    try {
      await Promise.race([ready,new Promise((_,reject)=>{const t=setTimeout(()=>reject(new Error('writer start timeout')),10000);t.unref();})]);
      const [waitedBoundary]=await Promise.all([boundary(),finished]);
      const writerTime=stdout.split('\n').find(line=>/^\d{4}-\d{2}-\d{2} /.test(line));
      assert(writerTime&&Date.parse(waitedBoundary)>=Date.parse(writerTime),'boundary-waits-for-prior-transaction');
    } finally { if(child.exitCode===null)child.kill(); await finished.catch(()=>{}); }
  } finally {
    const cleanup=await rest('pacientes',`business_id=eq.${ids.tenantA}&id=neq.${ids.patientA}`,{method:'DELETE'});
    assert(cleanup.res.ok,'phase6-cleanup',cleanup.res.status);
  }
} catch(e){failure=e;} finally {
  const errors=[];
  for(const [table,id] of [['pacientes',ids.patientA],['pacientes',ids.patientB],['perfiles',ids.adminA],['perfiles',ids.personalA],['perfiles',ids.personalB],['perfiles',ids.inactiveA],['instituciones',ids.tenantA],['instituciones',ids.tenantB]]) {
    try { const r=await rest(table,`id=eq.${id}`,{method:'DELETE'});if(!r.res.ok) errors.push(`delete-${table}:${r.res.status}`); }
    catch { errors.push(`delete-${table}:network-error`); }
  }
  for(const id of createdAuth){try{const r=await request(`/auth/v1/admin/users/${id}`,{method:'DELETE'});if(!r.res.ok)errors.push(`delete-auth:${r.res.status}`);}catch{errors.push('delete-auth:network-error');}}
  if(errors.length) {const cleanupError=new Error(`Cleanup failed: ${errors.join(', ')}`);failure=failure?new AggregateError([failure,cleanupError],'Test failure and cleanup failure'):cleanupError;}
}
for(const c of checks) console.log(c);
if(failure) throw failure;
console.log('cleanup: ok');
