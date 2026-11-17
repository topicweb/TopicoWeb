#!/usr/bin/env node
/** Local Supabase + real Chromium PWA session/cache smoke. Never targets non-loopback. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomBytes } from 'node:crypto';
import { createServer } from 'node:net';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const cli = 'C:/Users/rival/AppData/Local/Programs/Supabase/supabase.exe';
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const stack = path.join(process.env.LOCALAPPDATA ?? 'C:/Users/rival/AppData/Local', 'Temp', 'topico-refactor-stack-20261116');
const profile = await mkdtemp(path.join(tmpdir(), 'topico-pwa-session-'));
let next, chrome, browser;
let restRequest;
const tenantA=randomUUID(), tenantB=randomUUID(), patientA=randomUUID(), pendingA=randomUUID();
const users=[];
const password=randomBytes(24).toString('base64url')+'Aa1!';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const capture = (file, args, options) => execFileSync(file, args, { ...options, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
try {
  const statusText = capture(cli, ['status', '--workdir', stack, '-o', 'json'], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
  const jsonStart = statusText.indexOf('{');
  assert.ok(jsonStart >= 0, 'Supabase CLI did not return status JSON');
  const status = JSON.parse(statusText.slice(jsonStart));
  const apiUrl = status.API_URL ?? status.api_url;
  const anonKey = status.ANON_KEY ?? status.anon_key;
  const serviceKey = status.SERVICE_ROLE_KEY ?? status.service_role_key;
  const api = new URL(apiUrl);
  assert.equal(api.protocol, 'http:');
  assert.ok(['127.0.0.1', 'localhost'].includes(api.hostname), 'Supabase must be local loopback');
  assert.ok(anonKey && serviceKey, 'local Supabase keys missing');
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: api.origin, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey };
  restRequest=async(route,method='GET',body)=>{
    const response=await fetch(`${api.origin}${route}`,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json().catch(()=>null);
    assert.ok(response.ok,`synthetic setup/cleanup ${method} ${route.split('?')[0]} failed (${response.status})`);
    return data;
  };
  for (const id of [tenantA,tenantB]) await restRequest('/rest/v1/instituciones','POST',{id,nombre:'PWA synthetic'});
  for (const business_id of [tenantA,tenantB]) {
    const email=`${randomUUID()}@example.invalid`;
    const user=await restRequest('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
    users.push({id:user.id,email,business_id});
    await restRequest('/rest/v1/perfiles','POST',{id:user.id,email,nombre:'PWA synthetic',rol:'personal',activo:true,business_id});
  }
  await restRequest('/rest/v1/pacientes','POST',{id:patientA,business_id:tenantA,dni:randomUUID().slice(0,8),nombres:'PWA_SYNTHETIC_PATIENT_A',apellidos:'TEST',categoria:'estudiante'});

  // Build output is captured to a temporary file; environment/keys never enter logs.
  const buildLog = path.join(profile, 'next-build.log');
  process.stdout.write(process.argv.includes('--skip-build')?'CHECK reusing previous local-env PWA build\n':'CHECK isolated local-env PWA build starting\n');
  try { if (!process.argv.includes('--skip-build')) capture(node, ['node_modules/next/dist/bin/next', 'build', '--webpack'], { cwd: root, env, maxBuffer: 16 * 1024 * 1024 }); }
  catch (error) { await import('node:fs/promises').then(fs => fs.writeFile(buildLog, String(error.stderr ?? 'build failed'))); throw new Error(`Local-env build failed; private log retained at ${buildLog}`); }
  if (!process.argv.includes('--skip-build')) process.stdout.write('PASS isolated local-env PWA build\n');

  // Use a task-specific localhost port to avoid touching unrelated servers.
  const probe=createServer();
  await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
  const port=probe.address().port;
  await new Promise(resolve=>probe.close(resolve));
  next = spawn(node, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env, windowsHide: true, stdio: 'ignore' });
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 120; i++) { try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {} await sleep(500); }
  assert.ok(ready, 'Next local server did not start');
  const denied=await fetch(`${origin}/dashboard`,{redirect:'manual'});
  assert.equal(denied.status,307,'dashboard requires session');
  assert.equal(new URL(denied.headers.get('location'),origin).pathname,'/login');
  assert.ok(denied.headers.get('cache-control')?.includes('no-store'));
  assert.equal(denied.headers.get('x-content-type-options'),'nosniff');
  assert.ok(denied.headers.get('content-security-policy-report-only')?.includes('report-uri /api/csp-report'));
  assert.equal(denied.headers.get('content-security-policy'),null,'CSP must remain report-only');
  const received=await fetch(`${origin}/api/csp-report`,{method:'POST',headers:{'content-type':'application/csp-report'},body:JSON.stringify({'csp-report':{'effective-directive':'script-src','document-uri':`${origin}/dashboard?synthetic-sensitive=true`}})});
  assert.equal(received.status,204);assert.equal(await received.text(),'');
  process.stdout.write('PASS HTTP guard, no-store, report-only headers and CSP receiver\n');

  chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-dev-shm-usage', `--user-data-dir=${profile}/chrome`, '--remote-debugging-port=0', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let wsUrl, debugPort;
  for (let i = 0; i < 100; i++) { try { const active = (await readFile(path.join(profile, 'chrome', 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0]; debugPort = Number(active); wsUrl = (await fetch(`http://127.0.0.1:${active}/json/version`).then(r => r.json())).webSocketDebuggerUrl; break; } catch { await sleep(100); } }
  assert.ok(wsUrl, 'Chrome CDP did not start');
  class CDP {
    constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.open = new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once: true }); this.ws.addEventListener('error', reject, { once: true }); }); this.ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && this.pending.has(m.id)) { const p = this.pending.get(m.id); this.pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } }); }
    async call(method, params = {}) { await this.open; const id = ++this.id; return new Promise((resolve, reject) => { const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},30000); this.pending.set(id, { resolve:value=>{clearTimeout(timer);resolve(value);}, reject:error=>{clearTimeout(timer);reject(error);} }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  }
  browser = new CDP(wsUrl);
  const { targetId } = await browser.call('Target.createTarget', { url: `${origin}/` });
  const targets = `http://127.0.0.1:${debugPort}/json/list`;
  let pageWs;
  for (let i = 0; i < 100; i++) { const list = await fetch(targets).then(r => r.json()); pageWs = list.find(t => t.id === targetId)?.webSocketDebuggerUrl; if (pageWs) break; await sleep(50); }
  assert.ok(pageWs, 'Chrome page target missing');
  const page = new CDP(pageWs);
  await page.call('Page.enable'); await page.call('Runtime.enable');
  await page.call('Network.enable');
  await page.call('Network.setBlockedURLs',{urls:['*supabase.co*','*supabase.com*']});
  async function evaluate(expression) { const result = await page.call('Runtime.evaluate', { expression: `(async()=>(${expression}))()`, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(`Browser assertion failed (${result.exceptionDetails.exception?.className ?? 'evaluation'})`); return result.result.value; }
  async function waitFor(expression,label) { for(let i=0;i<160;i++){ try{if(await evaluate(expression)) {process.stdout.write(`PASS ${label}\n`);return;}}catch{} await sleep(150); } throw new Error(`Timeout: ${label}`); }
  async function navigate(pathname) {await page.call('Page.navigate',{url:`${origin}${pathname}`});await sleep(300);}
  async function login(user) {
    await navigate('/login');
    await waitFor('!!document.querySelector("input[name=email]")','login form available');
    await evaluate(`(()=>{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; for(const [name,value] of ${JSON.stringify([['email',user.email],['password',password]])}) {const input=document.querySelector('input[name='+name+']');set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
    await sleep(100);
    await evaluate('document.querySelector("form").requestSubmit()');
    await waitFor(`location.pathname==="/dashboard" && !!document.querySelector('button[title="Cerrar Sesión"]')`,'UI authenticated dashboard');
  }
  const dbRead=(userId,id)=>`(async()=>{const name='TopicoDatabase:account:${userId}'; if(!(await indexedDB.databases()).some(d=>d.name===name))return null; const d=await new Promise((res,rej)=>{const r=indexedDB.open(name);r.onsuccess=()=>res(r.result);r.onerror=rej;});try{return await new Promise((res,rej)=>{const r=d.transaction('pacientes').objectStore('pacientes').get('${id}');r.onsuccess=()=>res(r.result??null);r.onerror=rej;});}finally{d.close();}})()`;
  await waitFor(`location.origin===${JSON.stringify(origin)} && document.readyState === "complete"`,'local application document loaded');
  assert.equal(await evaluate('location.origin'), origin);
  assert.equal(await evaluate('document.querySelector("body") !== null'), true);
  await evaluate('navigator.serviceWorker.register("/sw.js", {scope:"/"})');
  let sw = false;
  for (let i = 0; i < 100; i++) { sw = await evaluate('!!navigator.serviceWorker.controller || !!(await navigator.serviceWorker.ready)'); if (sw) break; await sleep(100); }
  assert.ok(sw, 'service worker unavailable');
  const offline = await fetch(`${origin}/offline`);
  assert.ok(offline.ok, 'offline shell route missing');
  const report = await evaluate(`(async()=>({caches:await caches.keys(), registration:!!(await navigator.serviceWorker.getRegistration())}))()`);
  assert.ok(report.registration);
  assert.equal(report.caches.some(name => /auth|dashboard|api|rsc/i.test(name)), false, 'sensitive cache name found');
  process.stdout.write('PASS real Chromium service worker and public offline shell\n');
  await login(users[0]);
  await waitFor(`!!(await ${dbRead(users[0].id,patientA)})`,'tenant A patient downloaded');
  await navigate('/dashboard/patients');
  await waitFor('document.body.innerText.includes("PWA_SYNTHETIC_PATIENT_A")','patient A visible online');
  await page.call('Network.enable');
  await page.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await page.call('Page.reload',{ignoreCache:true});
  await waitFor('document.body.innerText.includes("PWA_SYNTHETIC_PATIENT_A")','offline reload restores authenticated account and patient');
  await evaluate(`(async()=>{const d=await new Promise(res=>{const r=indexedDB.open('TopicoDatabase:account:${users[0].id}');r.onsuccess=()=>res(r.result);});try{await new Promise((res,rej)=>{const tx=d.transaction('pacientes','readwrite');tx.objectStore('pacientes').add(${JSON.stringify({id:pendingA,business_id:tenantA,dni:randomUUID().slice(0,8),nombres:'PWA_PENDING_A',apellidos:'TEST',categoria:'estudiante',activo:1,sync_status:'pending',creado_at:new Date().toISOString(),actualizado_at:new Date().toISOString()})});tx.oncomplete=res;tx.onerror=rej;});}finally{d.close();}})()`);
  await evaluate(`document.querySelector('button[title="Cerrar Sesión"]').click()`);
  await waitFor(`!document.body.innerText.includes("PWA_SYNTHETIC_PATIENT_A") && !document.querySelector('button[title="Cerrar Sesión"]')`,'offline logout hides account data');
  assert.equal((await evaluate(dbRead(users[0].id,pendingA)))?.sync_status,'pending','logout must preserve pending');
  process.stdout.write('PASS offline logout preserves pending A\n');
  await page.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await login(users[1]);
  assert.equal(await evaluate(dbRead(users[1].id,patientA)),null,'account B cannot read patient A from its cache');
  assert.equal(await evaluate(dbRead(users[1].id,pendingA)),null,'account B cannot read pending A');
  process.stdout.write('PASS account B cache excludes A and its pending work\n');
  await evaluate(`document.querySelector('button[title="Cerrar Sesión"]').click()`);
  await waitFor('location.pathname==="/login"','online logout to login');
  await login(users[0]);
  assert.ok(await evaluate(dbRead(users[0].id,pendingA)),'return to A must retain its queued row');
  process.stdout.write('PASS return to A recovers its preserved row\n');
  const privateCached=await evaluate(`(async()=>{for(const name of await caches.keys())for(const r of await (await caches.open(name)).keys()){const u=new URL(r.url);if(u.origin!==location.origin || ['/dashboard','/login','/api','/auth','/rest','/_next/data'].some(p=>u.pathname===p||u.pathname.startsWith(p+'/'))||u.searchParams.has('_rsc'))return true;}return false;})()`);
  assert.equal(privateCached,false,'Cache Storage must not retain private responses');
  process.stdout.write('PASS no authenticated HTML, RSC, Auth or API in Cache Storage\n');
  page.ws.close();
} catch (error) {
  process.stderr.write(`FAIL pwa-session-local: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  browser?.ws.close();
  for(const child of [chrome,next]) if(child && child.exitCode===null) {
    await new Promise(resolve=>{const timer=setTimeout(resolve,3000);child.once('exit',()=>{clearTimeout(timer);resolve();});child.kill();});
  }
  // Wait for already-issued local HTTP transactions before deleting fixtures.
  await sleep(300);
  if(restRequest){
    let cleaned=false;
    for(let attempt=0;attempt<3&&!cleaned;attempt++) {
      try {
        for(const table of ['movimientos_stock','atenciones','pacientes','medicamentos','programas_estudio','perfiles','instituciones']){
          const field=table==='instituciones'?'id':'business_id';
          await restRequest(`/rest/v1/${table}?${field}=in.(${tenantA},${tenantB})`,'DELETE');
        }
        const remaining=await restRequest(`/rest/v1/instituciones?select=id&id=in.(${tenantA},${tenantB})`);
        assert.equal(remaining.length,0,'synthetic tenants remain');
        cleaned=true;
      } catch { if(attempt<2)await sleep(300); }
    }
    if(!cleaned){process.exitCode=1;process.stderr.write('Cleanup failed: synthetic tenant fixtures\n');}
    for(const user of users){try{await restRequest(`/auth/v1/admin/users/${user.id}`,'DELETE');}catch{process.exitCode=1;process.stderr.write('Cleanup failed: synthetic auth user\n');}}
    if(cleaned)process.stdout.write('PASS synthetic fixture cleanup\n');
  }
}
