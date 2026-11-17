// Explicit live smoke, isolated UUID tenant. Never uses existing users' sessions.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
if (!process.argv.includes('--confirm-production-smoke')) throw new Error('Explicit production smoke flag required');
const origin='https://topicoweb.netlify.app';
const apiOrigin='https://lyskgesbczpuihadaxbw.supabase.co';
const source=await readFile('.env.local','utf8');
const env=Object.fromEntries(source.split(/\r?\n/).flatMap(l=>{const m=l.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);return m?[[m[1],m[2].trim().replace(/^(['"])(.*)\1$/,'$2')]]:[];}));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,apiOrigin);
assert.ok(env.SUPABASE_SERVICE_ROLE_KEY);
const tenant=randomUUID(),patient=randomUUID(),email=`release-${randomUUID()}@example.com`,newEmail=`release-${randomUUID()}@example.com`;
const password=randomBytes(24).toString('base64url')+'Aa1!';
const authIds=new Set();
const profile=await mkdtemp(path.join(tmpdir(),'topico-production-smoke-'));
let chrome,browser,page;
const network=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function request(route,method='GET',body) {
 let r;
 for(let attempt=0;attempt<4;attempt++){
  try{r=await fetch(apiOrigin+route,{method,redirect:'error',signal:AbortSignal.timeout(20000),
  headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   if(r.status<500&&r.status!==429)break;
  }catch(e){if(attempt===3)throw new Error(`Synthetic API ${method} ${route.split('?')[0]} network failure (${e.cause?.code??e.name})`);}
  await sleep(500*(attempt+1));
 }
 assert.ok(r,'HTTP response missing');
 const data=await r.json().catch(()=>null);
 assert.ok(r.ok,`Synthetic API ${method} ${route.split('?')[0]} failed (${r.status}); body withheld`);
 return data;
}
class CDP {
 constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();this.open=new Promise((r,j)=>{this.ws.addEventListener('open',r,{once:true});this.ws.addEventListener('error',j,{once:true});});this.ws.addEventListener('message',e=>{const m=JSON.parse(e.data);const p=this.pending.get(m.id);if(p){this.pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}});}
 async call(method,params={}){await this.open;const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`));},25000);this.pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});this.ws.send(JSON.stringify({id,method,params}));});}
}
async function evaluate(expression){const r=await page.call('Runtime.evaluate',{expression:`(async()=>(${expression}))()`,awaitPromise:true,returnByValue:true});assert.ok(!r.exceptionDetails,'Browser evaluation failed; private context withheld');return r.result.value;}
async function waitFor(expression,label){for(let i=0;i<160;i++){try{if(await evaluate(expression)){console.log(`PASS ${label}`);return;}}catch{}await sleep(200);}throw new Error(`Timeout ${label}`);}
async function fill(selector,value){await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error('missing field');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);await sleep(100);}
try {
 await request('/rest/v1/instituciones','POST',{id:tenant,nombre:'Release verification synthetic'});
 await writeFile(path.join(profile,'fixture.json'),JSON.stringify({tenant,authIds:[]}));
 const user=await request('/auth/v1/admin/users','POST',{email,password,email_confirm:true});authIds.add(user.id);
 await writeFile(path.join(profile,'fixture.json'),JSON.stringify({tenant,authIds:[...authIds]}));
 await request('/rest/v1/perfiles','POST',{id:user.id,email,nombre:'Release verification',rol:'admin',activo:true,business_id:tenant});
 await request('/rest/v1/pacientes','POST',{id:patient,business_id:tenant,dni:'99999999',nombres:'RELEASE_SYNTHETIC_PATIENT',apellidos:'TEST',categoria:'estudiante'});
 chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,'--remote-debugging-port=0','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;
 for(let i=0;i<120;i++){try{port=Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split(/\r?\n/)[0]);break;}catch{}await sleep(100);}
 assert.ok(port,'Chrome did not start');
 const version=await fetch(`http://127.0.0.1:${port}/json/version`).then(r=>r.json());browser=new CDP(version.webSocketDebuggerUrl);
 const {targetId}=await browser.call('Target.createTarget',{url:origin+'/login'});
 let target;
 for(let i=0;i<80;i++){target=(await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json())).find(t=>t.id===targetId);if(target)break;await sleep(100);}
 assert.ok(target);page=new CDP(target.webSocketDebuggerUrl);await page.call('Page.enable');await page.call('Runtime.enable');
 page.ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.responseReceived'){try{const u=new URL(m.params.response.url);network.push({host:u.hostname,path:u.pathname,status:m.params.response.status});}catch{}}else if(m.method==='Network.loadingFailed')network.push({failure:m.params.errorText});});
 await page.call('Network.enable');
 await waitFor('!!document.querySelector("input[name=email]")','published login form');
 await waitFor('document.readyState==="complete"','document hydration resources loaded');await sleep(1200);
 await fill('input[name=email]',email);await fill('input[name=password]',password);
 await evaluate('document.querySelector("form").requestSubmit()');
 await waitFor('location.pathname==="/dashboard" && !!document.querySelector(\'button[title="Cerrar Sesión"]\')','production login and dashboard');
 await page.call('Page.navigate',{url:origin+'/dashboard/patients'});
 await waitFor('document.body.innerText.includes("RELEASE_SYNTHETIC_PATIENT")','production PULL and tenant patient UI');
 await page.call('Page.navigate',{url:origin+'/dashboard/users'});
 await waitFor('[...document.querySelectorAll("button")].some(b=>b.textContent.includes("Nuevo Usuario"))','administrator UI');
 await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Nuevo Usuario")).click()');
 await waitFor('!!document.querySelector(".glass-modal input[type=email]")','user creation form');
 await fill('.glass-modal input[type=text]','RELEASE_SYNTHETIC_USER');await fill('.glass-modal input[type=email]',newEmail);await fill('.glass-modal input[type=password]',password);
 await evaluate('document.querySelector(".glass-modal form").requestSubmit()');
 let created;
 for(let i=0;i<100;i++){const rows=await request(`/rest/v1/perfiles?select=id,email,rol&business_id=eq.${tenant}&email=eq.${encodeURIComponent(newEmail)}`);if(rows.length){created=rows[0];authIds.add(created.id);break;}await sleep(300);}
 assert.ok(created,'Production Server Action did not persist user');assert.equal(created.rol,'personal');
 const confirmed=await request(`/auth/v1/admin/users/${created.id}`);assert.equal(confirmed.email,newEmail);assert.ok(confirmed.email_confirmed_at);
 await waitFor(`document.body.innerText.includes(${JSON.stringify(newEmail)})`,'production user action and canonical profile shown');
 await page.call('Page.navigate',{url:origin+'/dashboard/patients'});
 await waitFor('document.body.innerText.includes("RELEASE_SYNTHETIC_PATIENT")','patient before offline reload');
 await waitFor('!!navigator.serviceWorker.controller','production service worker controls page');
 await page.call('Network.enable');await page.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await page.call('Page.reload',{ignoreCache:true});
 await waitFor('document.body.innerText.includes("RELEASE_SYNTHETIC_PATIENT")','published PWA offline reload');
 await evaluate('document.querySelector(\'button[title="Cerrar Sesión"]\').click()');
 await waitFor('!document.body.innerText.includes("RELEASE_SYNTHETIC_PATIENT") && !document.querySelector(\'button[title="Cerrar Sesión"]\')','published offline logout');
 const privateCached=await evaluate(`(async()=>{for(const n of await caches.keys())for(const r of await(await caches.open(n)).keys()){const u=new URL(r.url);if(u.origin!==location.origin||['/dashboard','/login','/api','/auth','/rest','/_next/data'].some(p=>u.pathname===p||u.pathname.startsWith(p+'/'))||u.searchParams.has('_rsc'))return true;}return false;})()`);
 assert.equal(privateCached,false);console.log('PASS production Cache Storage excludes private responses');
} catch(e){console.error(`FAIL production smoke: ${e.message}`);try{console.log(JSON.stringify({browser:await evaluate('({path:location.pathname,alert:document.querySelector("[role=alert]")?.textContent??null,loading:!!document.querySelector("button[type=submit][disabled]")})()'),network:network.slice(-20)}));}catch{}process.exitCode=1;}
finally {
 page?.ws.close();try{if(browser)await browser.call('Browser.close');}catch{}browser?.ws.close();
 if(chrome&&chrome.exitCode===null)await new Promise(r=>{const timer=setTimeout(r,3000);chrome.once('exit',()=>{clearTimeout(timer);r();});chrome.kill();});
 await sleep(300);
 try {
  const profiles=await request(`/rest/v1/perfiles?select=id&business_id=eq.${tenant}`);profiles.forEach(p=>authIds.add(p.id));
  for(const table of ['movimientos_stock','atenciones','pacientes','medicamentos','programas_estudio','perfiles','instituciones'])await request(`/rest/v1/${table}?${table==='instituciones'?'id':'business_id'}=eq.${tenant}`,'DELETE');
  for(const id of authIds)await request(`/auth/v1/admin/users/${id}`,'DELETE');
  assert.equal((await request(`/rest/v1/instituciones?select=id&id=eq.${tenant}`)).length,0);
  console.log('PASS isolated production fixtures removed');
 } catch(e){console.error(`FAIL production fixture cleanup: ${e.message}; scoped manifest retained at ${profile}`);process.exitCode=1;}
}
