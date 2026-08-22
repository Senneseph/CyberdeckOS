import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { buildRunArgs, generateSecret } from './hardening.js';
import { getService, SERVICES_NEEDING_SECRETS } from './catalog.js';
import { Registry, type RegistryEntry } from './registry.js';

/** A requested service (mirrors the manifest `services` declaration). */
export interface ServiceRequest {
  type: string;
  env?: Record<string, string>;
  memory?: string;
  cpus?: string;
}

const exec = promisify(execFile);

/**
 * Docker-backed service manager.
 *
 * Stands up / tears down hardened service containers. Uses the `docker` CLI via
 * `execFile` (argument array, no shell) to avoid injection.
 */

export interface ServiceManagerOptions {
  registry: Registry;
  dockerBin?: string;
  networkPrefix?: string;
  /** Block outbound internet from service containers (requires host root + iptables). */
  blockEgress?: boolean;
}

export interface StandUpResult extends RegistryEntry {
  hostPort: number;
}

export class ServiceManager {
  private readonly docker: string;
  private readonly networkPrefix: string;
  private readonly blockEgress: boolean;
  private readonly egressSubnets = new Set<string>();

  constructor(private readonly options: ServiceManagerOptions) {
    this.docker = options.dockerBin ?? 'docker';
    this.networkPrefix = options.networkPrefix ?? 'cyberdeck';
    this.blockEgress = options.blockEgress ?? false;
  }

  private async run(args: string[]): Promise<string> {
    const { stdout } = await exec(this.docker, args);
    return (stdout ?? '').trim();
  }

  /** Ensure the app's isolated network exists. */
  async ensureNetwork(appId: string): Promise<string> {
    const network = `${this.networkPrefix}-${appId}`;
    try {
      await this.run(['network', 'inspect', network]);
    } catch {
      // Regular bridge network so port publishing works; host isolation is
      // enforced by the container hardening flags (no host mounts/network/socket).
      await this.run(['network', 'create', network]);
      if (this.blockEgress) await this.applyEgressBlock(network);
    }
    return network;
  }

  /** Block outbound internet from the network's subnet (allows responses back). */
  private async applyEgressBlock(network: string): Promise<void> {
    try {
      const subnet = await this.run(['network', 'inspect', network, '--format', '{{(index .IPAM.Config 0).Subnet}}']);
      if (!subnet) return;
      await exec('iptables', ['-I', 'DOCKER-USER', '-s', subnet, '-m', 'conntrack', '--ctstate', 'ESTABLISHED,RELATED', '-j', 'RETURN']);
      await exec('iptables', ['-I', 'DOCKER-USER', '-s', subnet, '-j', 'DROP']);
      this.egressSubnets.add(subnet);
      process.stderr.write(`[egress] blocked outbound for ${subnet}\n`);
    } catch (e) {
      process.stderr.write(`[egress] iptables failed (requires root): ${e instanceof Error ? e.message : e}\n`);
    }
  }

  /** Chown each named volume to the service's UID (init container, runs as root). */
  private async ensureVolumeOwnership(uid: number, volumes: Array<{ name: string; path: string }>): Promise<void> {
    for (const v of volumes) {
      try {
        await this.run(['run', '--rm', '-v', `${v.name}:${v.path}`, 'alpine', 'chown', '-R', `${uid}:${uid}`, v.path]);
        const check = await this.run(['run', '--rm', '-v', `${v.name}:/data`, 'alpine', 'ls', '-ldn', '/data']);
        process.stderr.write(`[chown] ${v.name} -> ${uid}  verify: ${check.trim()}\n`);
      } catch (e) {
        process.stderr.write(`[chown] FAILED ${v.name}: ${e instanceof Error ? e.message : e}\n`);
      }
    }
  }

  /** Stand up a service for an app; returns the registry entry. */
  async standUp(appId: string, request: string | ServiceRequest): Promise<StandUpResult> {
    const req: ServiceRequest = typeof request === 'string' ? { type: request } : request;
    const def = getService(req.type);
    if (!def) throw new Error(`Unknown service: ${req.type}`);

    const network = await this.ensureNetwork(appId);
    const uid = this.options.registry.nextUid();
    const hostPort = this.options.registry.nextHostPort();
    const containerName = `cyberdeck-${appId}-${req.type}`;

    const secrets: Record<string, string> = {};
    for (const key of SERVICES_NEEDING_SECRETS[req.type] ?? []) {
      secrets[key] = generateSecret();
    }

    // Namespace volumes per instance so apps can't share data across apps.
    const volumes = (def.volumes ?? []).map((v) => ({
      name: `${containerName}-${v.name}`,
      path: v.path,
    }));
    if (volumes.length) {
      await this.ensureVolumeOwnership(uid, volumes);
    }

    const args = buildRunArgs(
      { ...def, env: { ...def.env, ...req.env } },
      { containerName, uid, hostPort, network, memoryLimit: req.memory, cpuLimit: req.cpus },
      secrets
    );
    await this.run(args);

    const entry: RegistryEntry = {
      id: `${appId}:${req.type}`,
      appId,
      service: req.type,
      containerName,
      image: def.image,
      hostPort,
      containerPort: def.port,
      uid,
      network,
      secrets,
      createdAt: new Date().toISOString(),
      status: 'running',
    };
    this.options.registry.add(entry);
    return entry;
  }

  /** Stop + remove a container and its registry entry. */
  async tearDown(id: string): Promise<void> {
    const entry = this.options.registry.get(id);
    if (!entry) return;
    try {
      await this.run(['rm', '-f', entry.containerName]);
    } catch {
      // already gone — continue
    }
    this.options.registry.remove(id);
  }

  /** Tear down everything for an app: containers, volumes, and its network. */
  async uninstallApp(appId: string): Promise<number> {
    let removed = 0;
    for (const entry of this.options.registry.forApp(appId)) {
      await this.tearDown(entry.id); // remove container first (releases the volume)
      const def = getService(entry.service);
      for (const v of def?.volumes ?? []) {
        try {
          await this.run(['volume', 'rm', `${entry.containerName}-${v.name}`]);
        } catch {
          // volume absent — ignore
        }
      }
      removed++;
    }
    try {
      await this.run(['network', 'rm', `${this.networkPrefix}-${appId}`]);
    } catch {
      // network in use elsewhere or absent — ignore
    }
    return removed;
  }

  /** Remove any egress rules this manager added (call on shutdown). */
  async cleanupEgressRules(): Promise<void> {
    for (const subnet of this.egressSubnets) {
      try {
        await exec('iptables', ['-D', 'DOCKER-USER', '-s', subnet, '-m', 'conntrack', '--ctstate', 'ESTABLISHED,RELATED', '-j', 'RETURN']);
        await exec('iptables', ['-D', 'DOCKER-USER', '-s', subnet, '-j', 'DROP']);
        this.egressSubnets.delete(subnet);
      } catch {
        // rule already gone
      }
    }
  }
}
