import { randomUUID, randomBytes } from 'node:crypto';

const base=process.env.LOCAL_SUPABASE_URL, anonKey=process.env.LOCAL_SUPABASE_ANON_KEY, serviceKey=process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
if(!base||!anonKey||!serviceKey) throw new Error('Missing LOCAL_SUPABASE_* configuration');
const url=new URL(base);
if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname)) throw new Error('LOCAL_SUPABASE_URL must use loopback HTTP');
const root=url.origin, uuid=()=>randomUUID(), ids=Object.fromEntries(['tenantA','tenantB','adminA','personalA','personalB','inactiveA','patientA','patientB','programA','programB','careA','careB','medA','medB','zeroMed','out10','out7a','out7b','in1','in2','retry','badMeasure','batchIn','batchOut'].map(k=>[k,uuid()]));
const pwd=randomBytes(24).toString('base64url')+'Aa1!', emails=Object.fromEntries(['adminA','personalA','personalB','inactiveA'].map(k=>[k,`${uuid()}@example.invalid`]));
const createdAuth=[], checks=[]; let failure;
function assert(ok,name,status='n/a'){checks.push(`${name}: ${status}`);if(!ok)throw new Error(`FAIL ${name} (${status})`)}
async function request(path,{method='GET',token=serviceKey,body,headers={}}={}){
 const res=await fetch(`${root}${path}`,{method,redirect:'error',signal:AbortSignal.timeout(20000),headers:{apikey:token===serviceKey?serviceKey:anonKey,Authorization:`Bearer ${token}`,...(body!==undefined?{'content-type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 let data;try{data=await res.json()}catch{data=null}return {res,data};
}
const rest=(table,query,opts={})=>request(`/rest/v1/${table}?${query}`,opts);
const row=(table,id,token)=>rest(table,`select=*&id=eq.${id}`,{token});
const expectReject=async(name,p)=>{const r=await p;assert(!r.res.ok,name,r.res.status);return r};
const med=(id,business_id,nombre,stock_actual=0)=>({id,business_id,nombre,stock_actual,stock_minimo:0,tipo_medida:'UNIDAD'});
const movement=(id,medicine_id,{business_id=ids.tenantA,tipo='ENTRADA',cantidad=1,tipo_medida='UNIDAD',atencion_id=null}={})=>({id,business_id,medicamento_id:medicine_id,tipo,cantidad,tipo_medida,atencion_id});
async function stock(id,expected,name){const r=await row('medicamentos',id);assert(r.res.ok&&r.data?.length===1&&r.data[0].stock_actual===expected,name,r.res.status)}
try{
 const roles=[['adminA','admin',ids.tenantA,true],['personalA','personal',ids.tenantA,true],['personalB','personal',ids.tenantB,true],['inactiveA','personal',ids.tenantA,false]];
 for(const [k] of roles){const r=await request('/auth/v1/admin/users',{method:'POST',body:{email:emails[k],password:pwd,email_confirm:true}});assert(r.res.ok&&r.data?.id,`create-${k}`,r.res.status);ids[k]=r.data.id;createdAuth.push(r.data.id)}
 for(const [id,nombre] of [[ids.tenantA,'Stock Test A'],[ids.tenantB,'Stock Test B']]){const r=await rest('instituciones','select=id',{method:'POST',body:{id,nombre}});assert(r.res.ok,`tenant-${nombre}`,r.res.status)}
 for(const [k,rol,business_id,activo] of roles){const r=await rest('perfiles','select=id',{method:'POST',body:{id:ids[k],nombre:k,email:emails[k],rol,activo,business_id}});assert(r.res.ok,`profile-${k}`,r.res.status)}
 const login=async k=>{const r=await request('/auth/v1/token?grant_type=password',{method:'POST',token:anonKey,body:{email:emails[k],password:pwd}});assert(r.res.ok&&r.data?.access_token,`login-${k}`,r.res.status);return r.data.access_token};
 const [a,b,inactive]=await Promise.all(['personalA','personalB','inactiveA'].map(login));
 for(const [id,business_id] of [[ids.programA,ids.tenantA],[ids.programB,ids.tenantB]]){const r=await rest('programas_estudio','select=id',{method:'POST',body:{id,business_id,nombre:`Program ${id}`}});assert(r.res.ok,'seed-program',r.res.status)}
 const mkPatient=(id,business_id,programa_id)=>({id,business_id,programa_id,dni:`T${uuid().replaceAll('-','').slice(0,9)}`,nombres:'Stock',apellidos:'Test',categoria:'estudiante'});
 for(const p of [mkPatient(ids.patientA,ids.tenantA,ids.programA),mkPatient(ids.patientB,ids.tenantB,ids.programB)]){const r=await rest('pacientes','select=id',{method:'POST',body:p});assert(r.res.ok,'seed-patient',r.res.status)}
 for(const [id,business_id,paciente_id,perfil_id] of [[ids.careA,ids.tenantA,ids.patientA,ids.personalA],[ids.careB,ids.tenantB,ids.patientB,ids.personalB]]){const r=await rest('atenciones','select=id',{method:'POST',body:{id,business_id,paciente_id,perfil_id,motivo_consulta:'Stock integration test'}});assert(r.res.ok,'seed-care-without-dispense',r.res.status)}
 for(const m of [med(ids.medA,ids.tenantA,'Medication A'),med(ids.medB,ids.tenantB,'Medication B')]){const r=await rest('medicamentos','select=id',{method:'POST',body:m});assert(r.res.ok,'service-seed-medication',r.res.status)}
 const zeroMedicine=med(ids.zeroMed,ids.tenantA,'Zero Medication'); delete zeroMedicine.stock_actual;
 const createdMedicine=await rest('medicamentos','select=id,stock_actual',{method:'POST',token:a,headers:{Prefer:'return=representation'},body:zeroMedicine});
 assert(createdMedicine.res.ok&&createdMedicine.data?.[0]?.stock_actual===0,'authenticated-create-zero-stock',createdMedicine.res.status);
 await expectReject('authenticated-initial-absolute-stock-denied',rest('medicamentos','select=id',{method:'POST',token:a,body:med(uuid(),ids.tenantA,'Forbidden',5)}));
 // Tenant RLS isolation across every row type.
 for(const [table,id] of [['pacientes',ids.patientB],['perfiles',ids.personalB],['programas_estudio',ids.programB],['medicamentos',ids.medB],['atenciones',ids.careB]]){const r=await row(table,id,a);assert(r.res.ok&&r.data?.length===0,`tenant-isolation-${table}`,r.res.status)}
 // Composite tenant FKs for every cross-tenant reference.
 await expectReject('cross-tenant-patient-program',rest('pacientes','select=id',{method:'POST',body:mkPatient(uuid(),ids.tenantA,ids.programB)}));
 await expectReject('cross-tenant-care-patient',rest('atenciones','select=id',{method:'POST',body:{id:uuid(),business_id:ids.tenantA,paciente_id:ids.patientB,perfil_id:ids.personalA,motivo_consulta:'invalid'}}));
 await expectReject('cross-tenant-care-profile',rest('atenciones','select=id',{method:'POST',body:{id:uuid(),business_id:ids.tenantA,paciente_id:ids.patientA,perfil_id:ids.personalB,motivo_consulta:'invalid'}}));
 await expectReject('cross-tenant-movement-medicine',rest('movimientos_stock','select=id',{method:'POST',token:a,body:movement(uuid(),ids.medB)}));
 await expectReject('cross-tenant-movement-care',rest('movimientos_stock','select=id',{method:'POST',token:a,body:movement(uuid(),ids.medA,{atencion_id:ids.careB})}));
 await stock(ids.medB,0,'cross-tenant-stock-unchanged');
 // Constraints must reject invalid values; integer column also rejects fractions.
 for(const [name,data] of [['zero',movement(uuid(),ids.medA,{cantidad:0})],['negative',movement(uuid(),ids.medA,{cantidad:-1})],['fractional',movement(uuid(),ids.medA,{cantidad:1.5})],['null-quantity',movement(uuid(),ids.medA,{cantidad:null})],['null-type',movement(uuid(),ids.medA,{tipo:null})]]) await expectReject(`invalid-${name}`,rest('movimientos_stock','select=id',{method:'POST',token:a,body:data}));
 // Initial insert applies its delta exactly once. An identical upsert is replay-safe.
 let r=await rest('movimientos_stock','on_conflict=id&select=id',{method:'POST',token:a,headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:movement(ids.out10,ids.medA,{cantidad:10})});assert(r.res.ok,'entry-10',r.res.status);await stock(ids.medA,10,'entry-applied-once');
 r=await rest('movimientos_stock','on_conflict=id&select=id',{method:'POST',token:a,headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:movement(ids.out10,ids.medA,{cantidad:10})});assert(r.res.ok,'identical-event-replay',r.res.status);await stock(ids.medA,10,'replay-does-not-reapply');
 await expectReject('immutable-event-edit',rest('movimientos_stock',`id=eq.${ids.out10}`,{method:'PATCH',token:a,body:{cantidad:9}}));
 await expectReject('authenticated-direct-stock-patch',rest('medicamentos',`id=eq.${ids.medA}`,{method:'PATCH',token:a,headers:{Prefer:'return=representation'},body:{stock_actual:999}}));await stock(ids.medA,10,'direct-patch-preserved-stock');
 // Metadata upsert must retain the server-owned balance; measure changes are guarded.
 r=await rest('medicamentos','on_conflict=id&select=id,nombre,stock_actual',{method:'POST',token:a,headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:{id:ids.medA,business_id:ids.tenantA,nombre:'Medication A renamed',tipo_medida:'UNIDAD'}});assert(r.res.ok&&r.data?.[0]?.nombre==='Medication A renamed','metadata-upsert',r.res.status);await stock(ids.medA,10,'metadata-keeps-stock');
 await expectReject('measure-change-used-medication',rest('medicamentos',`id=eq.${ids.medA}`,{method:'PATCH',token:a,body:{tipo_medida:'VOLUMEN_ML'}}));
 // One of two concurrent withdrawals can consume 7 from 10; the other must roll back.
 const withdrawals=await Promise.all([ids.out7a,ids.out7b].map(id=>rest('movimientos_stock','select=id',{method:'POST',token:a,body:movement(id,ids.medA,{tipo:'SALIDA',cantidad:7})})));
 assert(withdrawals.filter(x=>x.res.ok).length===1,'concurrent-withdrawals-one-wins',withdrawals.map(x=>x.res.status).join(','));await stock(ids.medA,3,'concurrent-withdrawals-balance');
 let events=await rest('movimientos_stock',`select=id&id=in.(${ids.out7a},${ids.out7b})`,{token:a});assert(events.res.ok&&events.data?.length===1,'concurrent-withdrawals-one-event',events.res.status);
 const [inOne,inTwo]=await Promise.all([ids.in1,ids.in2].map(id=>rest('movimientos_stock','select=id',{method:'POST',token:a,body:movement(id,ids.medA,{cantidad:2})})));assert(inOne.res.ok&&inTwo.res.ok,'concurrent-entries-both-succeed',`${inOne.res.status},${inTwo.res.status}`);await stock(ids.medA,7,'concurrent-entries-summed');
 // Retry same UUID remains idempotent.
 r=await rest('movimientos_stock','on_conflict=id&select=id',{method:'POST',token:a,headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:movement(ids.retry,ids.medA,{cantidad:4})});assert(r.res.ok,'retry-first',r.res.status);
 r=await rest('movimientos_stock','on_conflict=id&select=id',{method:'POST',token:a,headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:movement(ids.retry,ids.medA,{cantidad:4})});assert(r.res.ok,'retry-same-uuid',r.res.status);await stock(ids.medA,11,'retry-applied-once');
 await expectReject('measure-mismatch-event',rest('movimientos_stock','select=id',{method:'POST',token:a,body:movement(ids.badMeasure,ids.medA,{cantidad:1,tipo_medida:'PESO_MG'})}));await stock(ids.medA,11,'mismatch-does-not-change-balance');
 // A multi-row POST is one transaction: valid entry must roll back with later overdraw.
 await expectReject('batch-atomic-failure',rest('movimientos_stock','select=id',{method:'POST',token:a,body:[movement(ids.batchIn,ids.medA,{cantidad:5}),movement(ids.batchOut,ids.medA,{tipo:'SALIDA',cantidad:100})]}));
 await stock(ids.medA,11,'batch-rollback-balance');events=await rest('movimientos_stock',`select=id&id=in.(${ids.batchIn},${ids.batchOut})`,{token:a});assert(events.res.ok&&events.data?.length===0,'batch-rollback-events',events.res.status);
 // Snapshot returns only this tenant's balances and applied movement IDs.
 r=await request('/rest/v1/rpc/topico_stock_snapshot',{method:'POST',token:a,body:{medicine_ids:[ids.medA,ids.medB],pending_ids:[ids.out10,ids.out7a,ids.out7b,ids.in1,ids.in2,ids.retry]}});
 const meds=r.data?.medicamentos??[], applied=r.data?.applied_ids??[];assert(r.res.ok&&meds.length===1&&meds[0].id===ids.medA&&meds[0].stock_actual===11,'snapshot-medicine-tenant-filter',r.res.status);assert(r.res.ok&&applied.length===5&&applied.includes(ids.out10)&&applied.includes(ids.in1)&&applied.includes(ids.in2)&&applied.includes(ids.retry)&&[ids.out7a,ids.out7b].filter(id=>applied.includes(id)).length===1,'snapshot-applied-ids',r.res.status);
 // Anon is denied, while inactive authenticated identities cannot see or mutate tenant data.
 r=await request('/rest/v1/rpc/topico_stock_snapshot',{method:'POST',token:anonKey,body:{medicine_ids:[ids.medA],pending_ids:[]}});assert(!r.res.ok,'anon-snapshot-denied',r.res.status);
 const inactiveMed=await row('medicamentos',ids.medA,inactive);assert(inactiveMed.res.ok&&inactiveMed.data?.length===0,'inactive-cannot-read-stock',inactiveMed.res.status);
 await expectReject('inactive-cannot-insert-movement',rest('movimientos_stock','select=id',{method:'POST',token:inactive,body:movement(uuid(),ids.medA)}));
}catch(e){failure=e}
finally{
 const errors=[];
 for(const table of ['movimientos_stock','atenciones','pacientes','medicamentos','programas_estudio','perfiles','instituciones']){
  const query=table==='instituciones'?`id=in.(${ids.tenantA},${ids.tenantB})`:`business_id=in.(${ids.tenantA},${ids.tenantB})`;
  try{const r=await rest(table,query,{method:'DELETE'});if(!r.res.ok)errors.push(`${table}:${r.res.status}`)}catch{errors.push(`${table}:network`)}
 }
 for(const id of createdAuth){try{const r=await request(`/auth/v1/admin/users/${id}`,{method:'DELETE'});if(!r.res.ok)errors.push(`auth:${r.res.status}`)}catch{errors.push('auth:network')}}
 if(errors.length){const ce=new Error(`Cleanup failed: ${errors.join(', ')}`);failure=failure?new AggregateError([failure,ce],'Test and cleanup failed'):ce}
}
for(const c of checks)console.log(c);if(failure)throw failure;console.log('cleanup: ok');

