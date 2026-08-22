import { randomBytes } from 'node:crypto';

/**
 * CyberdeckOS container hardening.
 *
 * Every service CyberdeckOS stands up is sandboxed as hard as Docker allows:
 *   - a unique non-root UID
 *   - no Linux capabilities
 *   - no-new-privileges (blocks setuid/privilege escalation)
 *   - an isolated (non-host) network
 *   - PID / memory / CPU limits
 *   - a read-only root filesystem (tmpfs for /tmp)
 *   - the port bound to loopback only (the host OS is the only gateway)
 *
 * `buildRunArgs` is pure (no I/O) so the security contract is unit-testable.
 */

export interface ServiceDef {
  name: string;
  image: string;
  port: number;
  env?: Record<string, string>;
  volumes?: Array<{ name: string; path: string }>;
  tmpfs?: string[];
  command?: string[];
}

export interface RunOptions {
  containerName: string;
  uid: number;
  hostPort: number;
  network: string;
  memoryLimit?: string;
  cpuLimit?: string;
}

/** Build the `docker run` argument list for a hardened service container. */
export function buildRunArgs(def: ServiceDef, opts: RunOptions, env: Record<string, string> = {}): string[] {
  const args: string[] = [
    'run', '-d',
    '--name', opts.containerName,
    '--user', `${opts.uid}:${opts.uid}`,
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--network', opts.network,
    '--pids-limit', '128',
    '--memory', opts.memoryLimit ?? '512m',
    '--cpus', opts.cpuLimit ?? '1',
    '--read-only',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m,mode=1777',
    '--tmpfs', '/run:rw,nosuid,size=64m,mode=1777',
    '-p', `127.0.0.1:${opts.hostPort}:${def.port}`,
  ];
  for (const dir of def.tmpfs ?? []) {
    args.push('--tmpfs', `${dir}:rw,noexec,nosuid,size=64m,mode=1777`);
  }
  for (const v of def.volumes ?? []) {
    args.push('-v', `${v.name}:${v.path}`); // named volume, never a host bind
  }
  const mergedEnv = { ...def.env, ...env };
  for (const [key, value] of Object.entries(mergedEnv)) {
    args.push('-e', `${key}=${value}`);
  }
  args.push(def.image);
  for (const c of def.command ?? []) args.push(c);
  return args;
}

/** Generate a random secret (for service credentials). */
export function generateSecret(length = 24): string {
  return randomBytes(length).toString('base64url');
}

/** The security-relevant flags every container MUST carry (for verification). */
export const REQUIRED_HARDENING: ReadonlyArray<[string, string]> = [
  ['--user', '__UNIQUE_UID__'],
  ['--cap-drop', 'ALL'],
  ['--security-opt', 'no-new-privileges'],
  ['--network', '__ISOLATED__'],
  ['--read-only', ''],
];

/** Whether a `docker run` arg list carries the required hardening. */
export function isHardened(args: string[]): boolean {
  return (
    args.includes('--cap-drop') && args.includes('ALL') &&
    args.includes('--security-opt') && args.includes('no-new-privileges') &&
    args.includes('--read-only') &&
    args.includes('--user') &&
    args.includes('--network') &&
    args.some((a) => a.startsWith('127.0.0.1:'))
  );
}
