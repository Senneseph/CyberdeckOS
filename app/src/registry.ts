/**
 * CyberdeckOS service registry.
 *
 * Tracks every service CyberdeckOS stands up, so that uninstalling an app can
 * tear down and clean up everything it brought up.
 */

export interface RegistryEntry {
  id: string;
  appId: string;
  service: string;
  containerName: string;
  image: string;
  hostPort: number;
  containerPort: number;
  uid: number;
  network: string;
  secrets: Record<string, string>;
  createdAt: string;
  status: 'running' | 'stopped' | 'error';
}

export class Registry {
  private entries = new Map<string, RegistryEntry>();

  add(entry: RegistryEntry): void {
    this.entries.set(entry.id, entry);
  }

  get(id: string): RegistryEntry | undefined {
    return this.entries.get(id);
  }

  remove(id: string): void {
    this.entries.delete(id);
  }

  list(): RegistryEntry[] {
    return [...this.entries.values()];
  }

  /** All entries for a given app. */
  forApp(appId: string): RegistryEntry[] {
    return this.list().filter((e) => e.appId === appId);
  }

  /** All entries for a given service. */
  forService(service: string): RegistryEntry[] {
    return this.list().filter((e) => e.service === service);
  }

  /** Next available host port (avoid collisions with existing entries). */
  nextHostPort(start = 15432): number {
    const used = new Set(this.list().map((e) => e.hostPort));
    let port = start;
    while (used.has(port)) port++;
    return port;
  }

  /** Next unique non-root UID (avoid collisions; high range to skip system users). */
  nextUid(start = 20000): number {
    const used = new Set(this.list().map((e) => e.uid));
    let uid = start;
    while (used.has(uid)) uid++;
    return uid;
  }

  toJSON(): RegistryEntry[] {
    return this.list();
  }

  static fromJSON(entries: RegistryEntry[]): Registry {
    const r = new Registry();
    for (const e of entries) r.add(e);
    return r;
  }
}
