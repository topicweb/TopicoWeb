#!/usr/bin/env node
/** Local-only privacy smoke test for real Chromium IndexedDB and CacheStorage. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(path.join(tmpdir(), 'topico-privacy-chrome-'));
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/test.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><meta charset="utf-8"><script type="module">
        import Dexie from '/dexie.mjs';
        import { createTopicoDatabase, openAccountCache, lockAccountCache, isAccountCacheOpen, db } from '/db.mjs';
        import { purgePrivateResponses } from '/privacy.mjs';
        window.bridge = {
          start: async id => { await openAccountCache(id); return isAccountCacheOpen(id); },
          lock: () => lockAccountCache(),
          count: async () => db.pacientes.count(),
          rows: async () => db.pacientes.toArray(),
          add: async row => db.pacientes.add(row),
          saveHandle: () => { window.oldPatients = db.pacientes; },
          oldHandleLocked: async () => { try { await window.oldPatients.count(); return false; } catch { return true; } },
          addLegacy: async row => { const old = createTopicoDatabase('TopicoDatabase'); await old.open(); try { await old.pacientes.add(row); } finally { old.close(); } },
          legacyRows: async () => { const old = new Dexie('TopicoDatabase'); try { await old.open(); return await old.table('pacientes').toArray(); } finally { old.close(); } },
          lockedThrows: () => { try { void db.pacientes; return false; } catch { return true; } },
          wrongAccountRejected: async id => { try { await openAccountCache(id); return false; } catch { return true; } },
          purge: async origin => purgePrivateResponses(window.caches, origin),
          hasCached: async (name, url) => (await caches.open(name)).match(url).then(Boolean),
          seedCache: async (name, url) => (await caches.open(name)).put(url, new Response('synthetic')),
          makeV1: async name => {
            const old = new Dexie(name);
            old.version(1).stores({
              instituciones:'id,nombre,activo,creado_at,sync_status',
              perfiles:'id,business_id,rol,email,sync_status,deleted_at,[business_id+activo]',
              programas_estudio:'id,business_id,nombre,sync_status,deleted_at,[business_id+activo]',
              pacientes:'id,business_id,dni,programa_id,fecha_nacimiento,telefono,sync_status,deleted_at,[business_id+activo]',
              medicamentos:'id,business_id,nombre,activo,tipo_medida,stock_actual,sync_status,deleted_at,[business_id+activo],[business_id+tipo_medida],[business_id+stock_actual]',
              atenciones:'id,business_id,paciente_id,perfil_id,fecha_atencion,creado_at,sync_status,deleted_at,[business_id+activo],[business_id+fecha_atencion]',
              movimientos_stock:'id,business_id,medicamento_id,atencion_id,tipo,tipo_medida,fecha_movimiento,fecha_vencimiento,creado_at,sync_status,deleted_at,[business_id+medicamento_id],[business_id+atencion_id],[medicamento_id+fecha_movimiento],[business_id+tipo+fecha_movimiento],[business_id+fecha_vencimiento]',
              sync_metadata:'deviceId,businessId,lastSync,[deviceId+businessId]'
            });
            await old.open(); await old.pacientes.add({id:'v1-pending', business_id:'synthetic', dni:'00000000', sync_status:'pending'}); old.close();
            const upgraded = createTopicoDatabase(name); await upgraded.open();
            try { const row = await upgraded.pacientes.get('v1-pending'); return row?.sync_status === 'pending'; } finally { upgraded.close(); }
          }
        };
      </script>`);
      return;
    }
    if (url.pathname === '/db.mjs') {
      let source = await readFile(path.join(root, 'src/core/db/dexie/db.ts'), 'utf8');
      source = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
      source = source.replace(/from ["']dexie["']/g, 'from "/dexie.mjs"')
        .replace(/from ["']@\/shared\/utils\/uuid["']/g, 'from "/uuid.mjs"');
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }); res.end(source); return;
    }
    if (url.pathname === '/privacy.mjs') {
      const source = await readFile(path.join(root, 'src/core/auth/privacy.ts'), 'utf8');
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
      res.end(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText); return;
    }
    if (url.pathname === '/uuid.mjs') {
      res.writeHead(200, { 'content-type': 'text/javascript' }); res.end('export function generateUUID(){ return crypto.randomUUID(); }'); return;
    }
    if (url.pathname === '/dexie.mjs') {
      res.writeHead(200, { 'content-type': 'text/javascript' });
      res.end(await readFile(path.join(root, 'node_modules/dexie/dist/dexie.mjs'))); return;
    }
    res.writeHead(404); res.end();
  } catch {
    res.writeHead(500); res.end('local harness error');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-dev-shm-usage', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });

let browserWs;
for (let i = 0; i < 100; i++) {
  try {
    const activePort = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0];
    const version = await fetch(`http://127.0.0.1:${activePort}/json/version`).then(r => r.json());
    browserWs = version.webSocketDebuggerUrl;
    break;
  } catch { await new Promise(r => setTimeout(r, 100)); }
}
if (!browserWs) {
  chrome.kill();
  server.close();
  throw new Error('Chrome DevTools endpoint did not start');
}

class CDP {
  constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.ready = new Promise((resolve, reject) => { this.ws.addEventListener('open', resolve, { once:true }); this.ws.addEventListener('error', reject, { once:true }); }); this.ws.addEventListener('message', e => { const m = JSON.parse(e.data); const p = this.pending.get(m.id); if (p) { this.pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } }); }
  async call(method, params={}) { await this.ready; const id=++this.id; return new Promise((resolve,reject)=>{ this.pending.set(id,{resolve,reject}); this.ws.send(JSON.stringify({id,method,params})); }); }
  close() { this.ws.close(); }
}
const browser = new CDP(browserWs);
async function newPage(query='') {
  const { targetId } = await browser.call('Target.createTarget', { url: `${origin}/test.html${query}` });
  let info;
  for (let i=0;i<100;i++) { info=await fetch(`http://127.0.0.1:${browserWs.match(/:(\d+)\//)[1]}/json/list`).then(r=>r.json()); const t=info.find(x=>x.id===targetId); if(t?.webSocketDebuggerUrl) return new Page(new CDP(t.webSocketDebuggerUrl)); await new Promise(r=>setTimeout(r,50)); }
  throw new Error('page target unavailable');
}
class Page {
  constructor(cdp) { this.cdp=cdp; }
  async eval(expression) {
    const r=await this.cdp.call('Runtime.evaluate',{expression:`(async()=>(${expression}))()`,awaitPromise:true,returnByValue:true});
    if(r.exceptionDetails) throw new Error('browser assertion evaluation failed');
    return r.result.value;
  }
  async ready() { for(let i=0;i<100;i++){ try{if(await this.eval('!!window.bridge'))return;}catch{} await new Promise(r=>setTimeout(r,50));} throw new Error('test page did not initialize'); }
  async navigate(url) {
    await this.cdp.call('Page.navigate',{url});
    for (let i=0;i<100;i++) {
      try { if (await this.eval(`location.href==='${url}' && !!window.bridge`)) return; } catch {}
      await new Promise(r=>setTimeout(r,50));
    }
    throw new Error('navigation did not initialize a fresh test page');
  }
  close(){this.cdp.close();}
}
const check = async (page, expression, label) => { assert.equal(await page.eval(expression), true, label); process.stdout.write(`PASS ${label}\n`); };

try {
  const accountA='11111111-1111-4111-8111-111111111111', accountB='22222222-2222-4222-8222-222222222222';
  const main=await newPage(); await main.ready();
  await main.eval(`window.bridge.start('${accountA}')`);
  await main.eval(`window.bridge.add({id:'a-pending',business_id:'synthetic-a',dni:'00000001',sync_status:'pending'})`);
  await main.eval(`window.bridge.add({id:'a-synced',business_id:'synthetic-a',dni:'00000002',sync_status:'synced'})`);
  await main.eval('window.bridge.saveHandle()');
  await main.eval('window.bridge.lock()');
  await check(main, `window.bridge.lockedThrows()`, 'proxy stays locked after cache lock');
  await check(main, `await window.bridge.oldHandleLocked()`, 'old table handles cannot reopen the locked cache');
  await check(main, `window.bridge.wrongAccountRejected('${accountB}')`, 'account switch is rejected in the same document');

  await main.eval(`window.bridge.seedCache('cross-origin','https://synthetic.invalid/auth/session')`);
  await main.eval(`window.bridge.seedCache('workbox-precache-test','${origin}/_next/static/chunk.js')`);
  await main.eval(`window.bridge.seedCache('unrelated-app','${origin}/unrelated.js')`);
  await main.eval(`window.bridge.seedCache('topico-private','${origin}/dashboard/private')`);
  await main.eval(`window.bridge.purge('${origin}')`);
  await check(main, `!(await window.bridge.hasCached('cross-origin','https://synthetic.invalid/auth/session')) && !(await window.bridge.hasCached('topico-private','${origin}/dashboard/private'))`, 'private and cross-origin cached responses are purged');
  await check(main, `await window.bridge.hasCached('workbox-precache-test','${origin}/_next/static/chunk.js') && await window.bridge.hasCached('unrelated-app','${origin}/unrelated.js')`, 'public assets and unrelated cache are retained');

  await main.navigate(`${origin}/test.html?account=b`);
  await main.eval(`window.bridge.start('${accountB}')`);
  await check(main, `(await window.bridge.count())===0`, 'reloaded account B starts with an empty cache');
  const pageA=await newPage('?account=a'); await pageA.ready(); await pageA.eval(`window.bridge.start('${accountA}')`);
  await check(pageA, `(await window.bridge.rows()).some(r=>r.id==='a-pending') && (await window.bridge.rows()).some(r=>r.id==='a-synced')`, 'account A pending and synced rows survive reload');
  const pageB=await newPage('?second-tab=b'); await pageB.ready(); await pageB.eval(`window.bridge.start('${accountB}')`);
  await pageB.eval(`window.bridge.add({id:'b-only',business_id:'synthetic-b',dni:'00000003',sync_status:'pending'})`);
  await check(pageA, `(await window.bridge.rows()).every(r=>r.id!=='b-only')`, 'two tabs keep account data isolated');

  await pageA.eval(`window.bridge.addLegacy({id:'legacy-pending',business_id:'synthetic-a',dni:'00000004',sync_status:'pending'})`);
  await check(pageA, `(await window.bridge.legacyRows()).some(r=>r.id==='legacy-pending')`, 'legacy TopicoDatabase remains intact');
  await check(pageA, `!(await window.bridge.rows()).some(r=>r.id==='legacy-pending')`, 'legacy rows are not adopted into account cache');
  await check(pageA, `await window.bridge.makeV1('synthetic-version-one')`, 'version 1 to 4 upgrade preserves pending rows');
  pageA.close(); pageB.close(); main.close();
  process.stdout.write('Privacy browser smoke completed with synthetic local data.\n');
} finally {
  browser.close();
  server.close();
  chrome.kill();
  // The unique profile is intentionally retained for forensic inspection; no unrelated path is removed.
}
