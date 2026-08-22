import { Registry } from './registry.js';
import { ServiceManager } from './service-manager.js';
import { startServer } from './server.js';

/**
 * CyberdeckOS entry point — start the privileged service manager.
 * Binds to loopback only; requires a bearer token (CYBERDECKOS_TOKEN).
 */
const token = process.env.CYBERDECKOS_TOKEN ?? '';
const host = '127.0.0.1';
const port = parseInt(process.env.CYBERDECKOS_PORT ?? '16999', 10);

const registry = new Registry();
const manager = new ServiceManager({ registry });

startServer({ registry, manager, token, host, port });
process.stderr.write(`CyberdeckOS listening on ${host}:${port} (token ${token ? 'set' : 'DISABLED'})\n`);
