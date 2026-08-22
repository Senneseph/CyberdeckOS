// CyberdeckOS smoke test. Run after `npm run build`.
// Pure hardening + registry tests, plus a real-Docker round-trip (skipped if no docker).

import {
  buildRunArgs, isHardened, generateSecret, Registry, ServiceManager,
} from '../../dist/index.js';
import { execFileSync } from 'node:child_process';

let failed = 0;
function assert(cond, msg) {
  if (cond) console.log('  ok:', msg);
  else { console.error('  FAIL:', msg); failed++; }
}

// --- pure hardening ---
{
  const args = buildRunArgs(
    { name: 'postgres', image: 'postgres:16-alpine', port: 5432, env: { X: '1' }, volumes: [{ name: 'pgdata', path: '/var/lib/postgresql/data' }] },
    { containerName: 'c', uid: 20001, hostPort: 15432, network: 'net' },
    { POSTGRES_PASSWORD: 'secret' }
  );
  assert(args.includes('--cap-drop') && args.includes('ALL'), 'cap-drop ALL');
  assert(args.includes('--security-opt') && args.includes('no-new-privileges'), 'no-new-privileges');
  assert(args.includes('--read-only'), 'read-only rootfs');
  assert(args.includes('--user') && args.includes('20001:20001'), 'unique non-root uid');
  assert(args.some((a) => a.startsWith('127.0.0.1:')), 'loopback-only port bind');
  assert(args.includes('-v') && args.includes('pgdata:/var/lib/postgresql/data'), 'named volume (not host bind)');
  assert(args.includes('POSTGRES_PASSWORD=secret'), 'env passed');
  assert(isHardened(args), 'isHardened true');
  assert(!args.includes('--privileged'), 'no privileged mode');
  const netIdx = args.indexOf('--network');
  assert(netIdx >= 0 && args[netIdx + 1] !== 'host', 'no host network');
  assert(generateSecret(16).length >= 16, 'generateSecret length');
}

// --- registry ---
{
  const r = new Registry();
  r.add({ id: 'a:pg', appId: 'a', service: 'postgres', containerName: 'c', image: 'postgres', hostPort: 15432, containerPort: 5432, uid: 20001, network: 'n', secrets: {}, createdAt: '', status: 'running' });
  r.add({ id: 'a:redis', appId: 'a', service: 'redis', containerName: 'c2', image: 'redis', hostPort: 15433, containerPort: 6379, uid: 20002, network: 'n', secrets: {}, createdAt: '', status: 'running' });
  assert(r.forApp('a').length === 2, 'registry forApp');
  assert(r.forService('postgres').length === 1, 'registry forService');
  assert(r.nextHostPort(15432) === 15434, 'registry nextHostPort skips used');
  assert(r.nextUid(20001) === 20003, 'registry nextUid skips used');
  r.remove('a:pg');
  assert(r.list().length === 1, 'registry remove');
  assert(Registry.fromJSON(r.toJSON()).list().length === 1, 'registry serialize roundtrip');
}

// --- real docker integration (stand up + tear down redis) ---
{
  let dockerOk = true;
  try { execFileSync('docker', ['info'], { stdio: 'ignore' }); } catch { dockerOk = false; }
  if (!dockerOk) {
    console.log('  skip: docker not available');
  } else {
    const registry = new Registry();
    const manager = new ServiceManager({ registry });
    const appId = 'cyberdeckos-test-' + Date.now();
    try {
      const entry = await manager.standUp(appId, 'redis');
      assert(entry.status === 'running' && entry.containerPort === 6379, 'standUp redis');
      assert(registry.forApp(appId).length === 1, 'registry records app');

      const inspect = execFileSync('docker', ['inspect', '--format', '{{.State.Running}}|{{.HostConfig.ReadonlyRootfs}}|{{.HostConfig.CapDrop}}|{{.HostConfig.NetworkMode}}|{{.Config.User}}', entry.containerName]).toString().trim();
      const [running, readonly, capdrop, network, user] = inspect.split('|');
      assert(running === 'true', 'container running');
      assert(readonly === 'true', 'readonly rootfs applied at runtime');
      assert(capdrop.includes('ALL'), 'cap-drop ALL applied at runtime');
      assert(network !== 'host' && network !== 'default', 'isolated network at runtime');
      assert(user.startsWith('200') && user.includes(':'), 'non-root uid at runtime');

      const removed = await manager.uninstallApp(appId);
      assert(removed === 1, 'uninstallApp removes 1');
      assert(registry.list().length === 0, 'registry empty after uninstall');
      let gone = false;
      try { execFileSync('docker', ['inspect', entry.containerName], { stdio: 'ignore' }); } catch { gone = true; }
      assert(gone, 'container actually removed after uninstall');
      let volGone = false;
      try { execFileSync('docker', ['volume', 'inspect', `${entry.containerName}-redisdata`], { stdio: 'ignore' }); } catch { volGone = true; }
      assert(volGone, 'volume actually removed after uninstall');
    } catch (e) {
      try { await manager.uninstallApp(appId); } catch { /* ignore */ }
      console.error('  FAIL: integration', e.message);
      failed++;
    }
  }
}

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nCyberdeckOS smoke test passed.');
