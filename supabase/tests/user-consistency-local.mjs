import { randomUUID, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.env.LOCAL_SUPABASE_URL;
const anon = process.env.LOCAL_SUPABASE_ANON_KEY;
const service = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
if (!root || !anon || !service) throw new Error('Missing local test configuration');
const base = new URL(root);
if (base.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(base.hostname)) throw new Error('Loopback only');
const password = randomBytes(24).toString('base64url')+'Aa1!';
const tenantA = randomUUID(), tenantB = randomUUID();
const users = [], messages = [];
const email = () => `${randomUUID()}@example.invalid`;
function check(ok, label) { if (!ok) throw new Error(`FAIL ${label}`); console.log(`OK ${label}`); }
async function call(path, { method='GET', token=service, body, headers={} }={}) {
  const res = await fetch(base.origin+path, { method, redirect:'error', signal:AbortSignal.timeout(15000),
    headers:{apikey:token===service?service:anon, Authorization:`Bearer ${token}`, 'content-type':'application/json', ...headers},
    ...(body===undefined?{}:{body:JSON.stringify(body)}) });
  let data; try { data = await res.json(); } catch { data = null; }
  return { res, data };
}
const rest = (table, query, options) => call(`/rest/v1/${table}?${query}`, options);
async function create(address, marker) {
  const result = await call('/auth/v1/admin/users', {method:'POST', body:{ email:address, password, email_confirm:true,
    ...(marker?{app_metadata:{topico_provisioning:marker}}:{}) }});
  if (result.res.ok && result.data?.id) users.push(result.data.id);
  return result;
}
async function profile(id) {
  const result = await rest('perfiles',`select=*&id=eq.${id}`);
  if (!result.res.ok || !Array.isArray(result.data)) throw new Error('Profile read failed');
  return result.data[0];
}
function localSql(sql) {
  const result = spawnSync('C:/Program Files/Docker/Docker/resources/bin/docker.exe', [
    'exec','-i','supabase_db_topico-refactor-stack-20261116','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1',
  ], { input:sql, encoding:'utf8', timeout:15000, windowsHide:true });
  // No imprimir stdout/stderr: incluso errores de fixtures pueden incluir datos.
  if (result.error || result.status!==0) throw new Error('Synthetic database fault injection failed');
}
const dropFault = 'ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS topico_test_profile_failure;';
let failure;
try {
  check((await call('/rest/v1/rpc/topico_user_consistency_ready',{method:'POST',body:{}})).data===true,'readiness-service');
  check(!(await call('/rest/v1/rpc/topico_user_consistency_ready',{method:'POST',body:{},token:anon})).res.ok,'readiness-denied-anon');
  for (const id of [tenantA,tenantB]) check((await rest('instituciones','',{method:'POST',body:{id,nombre:'Synthetic'}})).res.ok,'seed-institution');
  const adminEmail=email(), personalEmail=email();
  const admin=(await create(adminEmail)).data, personal=(await create(personalEmail)).data;
  check(admin?.id&&personal?.id,'seed-auth');
  for (const [user,rol,address] of [[admin,'admin',adminEmail],[personal,'personal',personalEmail]]) {
    check((await rest('perfiles','',{method:'POST',body:{id:user.id,email:address,nombre:'Synthetic',rol,activo:true,business_id:tenantA}})).res.ok,'seed-profile');
  }
  const login=await call('/auth/v1/token?grant_type=password',{method:'POST',token:anon,body:{email:personalEmail,password}});
  const token=login.data?.access_token;
  check(login.res.ok&&token,'login-personal');
  check(!(await call('/rest/v1/rpc/topico_user_consistency_ready',{method:'POST',body:{},token})).res.ok,'readiness-denied-authenticated');
  const context={version:1,request_id:randomUUID(),requested_by:admin.id,business_id:tenantA,nombre:'Provisioned',rol:'personal',activo:true};
  const provisioned=await create(email(),context);
  check(provisioned.res.ok,'provision-auth');
  const provisionedProfile=await profile(provisioned.data.id);
  check(provisionedProfile?.business_id===tenantA&&provisionedProfile.email===provisioned.data.email&&provisionedProfile.rol==='personal','provision-profile-atomic');
  check((await call(`/auth/v1/admin/users/${provisioned.data.id}`,{method:'PUT',body:{app_metadata:{topico_provisioning:context,synthetic_flag:true}}})).res.ok,
    'unchanged-provision-marker-does-not-reinsert');

  for (const bad of [{...context,requested_by:personal.id},{...context,business_id:tenantB},{...context,nombre:'x'.repeat(151)}]) {
    const address=email();
    check(!(await create(address,bad)).res.ok,'invalid-provision-aborts');
    check((await create(address,{...context,request_id:randomUUID()})).res.ok,'same-email-retry-after-abort');
  }
  // Fallo real del INSERT perfil, después de validar contexto: Auth debe revertir.
  localSql(dropFault+"ALTER TABLE public.perfiles ADD CONSTRAINT topico_test_profile_failure CHECK (nombre <> '__topico_fail_profile__') NOT VALID;");
  const failedEmail=email();
  check(!(await create(failedEmail,{...context,nombre:'__topico_fail_profile__'})).res.ok,'profile-insert-failure-aborts-auth');
  localSql(dropFault);
  check((await create(failedEmail,{...context,request_id:randomUUID()})).res.ok,'profile-failure-retry-no-orphan');

  const before=(await profile(personal.id)).email;
  const wrongWrite=await rest('perfiles',`id=eq.${personal.id}`,{method:'PATCH',body:{email:email()}});
  check(!wrongWrite.res.ok&&(await profile(personal.id)).email===before,'stale-service-email-write-rejected');
  const newAdminEmail=email();
  // Un fallo real del espejo debe revertir también el cambio Auth.
  localSql(dropFault+`ALTER TABLE public.perfiles ADD CONSTRAINT topico_test_profile_failure CHECK (email <> '${newAdminEmail}') NOT VALID;`);
  check(!(await call(`/auth/v1/admin/users/${provisioned.data.id}`,{method:'PUT',body:{email:newAdminEmail,email_confirm:true}})).res.ok,'profile-email-failure-aborts-auth');
  check((await call(`/auth/v1/admin/users/${provisioned.data.id}`)).data?.email===provisioned.data.email
    &&(await profile(provisioned.data.id)).email===provisioned.data.email,'failed-email-change-keeps-auth-and-profile');
  localSql(dropFault);
  check((await call(`/auth/v1/admin/users/${provisioned.data.id}`,{method:'PUT',body:{email:newAdminEmail,email_confirm:true}})).res.ok,'admin-email-change');
  check((await profile(provisioned.data.id)).email===newAdminEmail,'auth-email-mirrored-atomically');
  const duplicate=await call(`/auth/v1/admin/users/${provisioned.data.id}`,{method:'PUT',body:{email:adminEmail,email_confirm:true}});
  check(!duplicate.res.ok&&(await profile(provisioned.data.id)).email===newAdminEmail,'duplicate-auth-email-rejected');

  // La metadata editable por el usuario nunca provisiona ni cambia privilegios.
  check((await call('/auth/v1/user',{method:'PUT',token,body:{data:{topico_provisioning:context,rol:'admin'}}})).res.ok,'untrusted-user-metadata-update');
  check((await profile(personal.id)).rol==='personal','untrusted-metadata-not-authority');

  const newOwnEmail=email();
  const pending=await call('/auth/v1/user',{method:'PUT',token,body:{email:newOwnEmail}});
  check(pending.res.ok&&pending.data?.email===personalEmail,'own-email-awaits-confirmation');
  check((await profile(personal.id)).email===personalEmail,'pending-email-not-written-to-profile');

  // Leer exclusivamente correos sintéticos de esta ejecución, sin mostrar tokens.
  const mailbox=new URL('http://127.0.0.1:54324');
  for (const address of [personalEmail,newOwnEmail]) {
    let confirmation;
    for (let attempt=0;attempt<15&&!confirmation;attempt++) {
      const listing=await (await fetch(new URL('/api/v1/messages',mailbox),{signal:AbortSignal.timeout(5000)})).json();
      const message=listing.messages?.find(m=>m.To?.some(to=>to.Address===address));
      if (message) {
        if (!messages.includes(message.ID)) messages.push(message.ID);
        const body=await (await fetch(new URL(`/api/v1/message/${message.ID}`,mailbox),{signal:AbortSignal.timeout(5000)})).json();
        for (const link of `${body.HTML??''} ${body.Text??''}`.match(/https?:\/\/[^\s"'<>]+/g)??[]) {
          const candidate=new URL(link.replaceAll('&amp;','&'));
          if(candidate.origin===base.origin&&candidate.pathname==='/auth/v1/verify'&&candidate.searchParams.get('type')==='email_change') {confirmation=candidate;break;}
        }
      }
      if(!confirmation) await new Promise(resolve=>setTimeout(resolve,200));
    }
    check(Boolean(confirmation),'confirmation-email-received');
    const verified=await fetch(confirmation,{redirect:'manual',signal:AbortSignal.timeout(10000)});
    check(verified.status===302||verified.status===303,'confirmation-link-accepted');
  }
  const finalAuth=await call(`/auth/v1/admin/users/${personal.id}`);
  check(finalAuth.data?.email===newOwnEmail&&(await profile(personal.id)).email===newOwnEmail,'confirmed-own-email-matches-profile');
} catch(error) { failure=error; }
finally {
  const errors=[];
  try {localSql(dropFault);} catch {errors.push('remove-synthetic-fault');}
  for(const id of users) {
    try{if(!(await rest('perfiles',`id=eq.${id}`,{method:'DELETE'})).res.ok)errors.push('delete-profile');}catch{errors.push('delete-profile-network');}
    try{if(!(await call(`/auth/v1/admin/users/${id}`,{method:'DELETE'})).res.ok)errors.push('delete-auth');}catch{errors.push('delete-auth-network');}
  }
  for(const id of [tenantA,tenantB]) {try{if(!(await rest('instituciones',`id=eq.${id}`,{method:'DELETE'})).res.ok)errors.push('delete-institution');}catch{errors.push('delete-institution-network');}}
  for(const id of messages) {try{const response=await fetch(`http://127.0.0.1:54324/api/v1/messages`,{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({IDs:[id]}),signal:AbortSignal.timeout(5000)});if(!response.ok)errors.push('delete-test-mail');}catch{errors.push('delete-test-mail-network');}}
  if(errors.length) failure=failure?new AggregateError([failure,new Error('Cleanup failed')],'Test and cleanup failed'):new Error('Cleanup failed');
}
if(failure) throw failure;
console.log('OK cleanup');
