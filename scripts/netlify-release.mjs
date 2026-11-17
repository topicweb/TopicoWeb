// Explicit operations against the already connected TopicoWeb site. No secrets logged.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const cli = path.resolve('node_modules/netlify-cli/bin/run.js');
const siteId = 'e474b58b-2137-42de-88e4-8a477efeecd1';
const run = args => {
  try {
    return JSON.parse(execFileSync(process.execPath, [cli, ...args], {
      encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }));
  } catch { throw new Error(`Netlify command failed: ${args[0]} ${args[1] ?? ''}; private response not logged`); }
};
const api = (operation, data) => run(['api', operation, '--data', JSON.stringify(data)]);
const mode = process.argv[2] ?? 'inspect';
if (mode === 'inspect') {
  const s = api('getSite', {site_id: siteId});
  console.log(JSON.stringify({id:s.id,name:s.name,url:s.ssl_url,account_id:s.account_id,
    command:s.build_settings?.cmd,publish:s.build_settings?.dir,repo:s.build_settings?.repo_url,
    branch:s.build_settings?.repo_branch,stop_builds:s.build_settings?.stop_builds,
    published_deploy:s.published_deploy?.id,published_commit:s.published_deploy?.commit_ref}));
  const env = run(['env:list','--context','production','--json']);
  const fs = await import('node:fs');
  const source = fs.readFileSync('.env.local','utf8');
  const local = Object.fromEntries(source.split(/\r?\n/).flatMap(line => {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    return m ? [[m[1],m[2].trim().replace(/^(['"])(.*)\1$/,'$2')]] : [];
  }));
  console.log(JSON.stringify({variables:Object.keys(env),checks:
    ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'].map(name => ({
      name,present:Boolean(env[name]),matchesLocal:env[name]===local[name],
    }))}));
  const functionsEnv = run(['env:list','--context','production','--scope','functions','--json']);
  const buildEnv = run(['env:list','--context','production','--scope','builds','--json']);
  console.log(JSON.stringify({node_version:env.NODE_VERSION,scopes:
    ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'].map(name => ({
      name,functions:Boolean(functionsEnv[name]),builds:Boolean(buildEnv[name]),
    }))}));
} else if (mode === 'deploys') {
  const ds=api('listSiteDeploys',{site_id:siteId,per_page:5});
  console.log(JSON.stringify(ds.map(d=>({id:d.id,state:d.state,commit:d.commit_ref,url:d.deploy_ssl_url,
    published_at:d.published_at,error:d.error_message,context:d.context}))));
} else if (mode === 'trigger') {
  console.log(JSON.stringify(run(['deploy','--trigger','--json'])));
} else if (mode === 'deploy') {
  const id=process.argv[3];
  if (!/^[a-f0-9]{24}$/.test(id ?? '')) throw new Error('Invalid deploy ID');
  const d=api('getDeploy',{deploy_id:id});
  console.log(JSON.stringify({id:d.id,state:d.state,commit:d.commit_ref,url:d.deploy_ssl_url,
    published_at:d.published_at,error:d.error_message,context:d.context,branch:d.branch}));
} else { throw new Error('Unknown operation'); }
