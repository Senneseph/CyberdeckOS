/**
 * CyberdeckOS — the privileged service layer.
 *
 * A background service that manages the Docker containers WebAX apps need for
 * their back-end services (postgres, ollama, minio, …). It stands up hardened,
 * sandboxed containers and keeps a registry so uninstalling an app cleans up
 * everything it brought up.
 */

export { buildRunArgs, generateSecret, isHardened, REQUIRED_HARDENING } from './hardening.js';
export type { ServiceDef, RunOptions } from './hardening.js';
export { Registry } from './registry.js';
export type { RegistryEntry } from './registry.js';
export { SERVICE_CATALOG, SERVICES_NEEDING_SECRETS, getService } from './catalog.js';
export { ServiceManager } from './service-manager.js';
export type { ServiceManagerOptions, StandUpResult, ServiceRequest } from './service-manager.js';
export { startServer } from './server.js';
export type { ServerOptions } from './server.js';
