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
