import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Registry } from './registry.js';
import { ServiceManager } from './service-manager.js';
import { SERVICE_CATALOG } from './catalog.js';

/**
 * CyberdeckOS HTTP API — the single, locked-down gateway to the service
 * containers. Binds to loopback only and requires a bearer token.
 *
 *   POST   /services         { appId, service }   → stand up a service
 *   DELETE /services/:id                          → tear down a service
 *   DELETE /apps/:appId                           → uninstall an app (clean up all)
 *   GET    /services                              → list registry
 *   GET    /catalog                               → list known services
 *   GET    /health                                → health check
 */

export interface ServerOptions {
  registry: Registry;
  manager: ServiceManager;
  token?: string;
  host?: string;
  port?: number;
}

export function startServer(options: ServerOptions) {
  const token = options.token ?? '';
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 16999;

  const send = (res: ServerResponse, status: number, body: unknown): void => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    });
    res.end(JSON.stringify(body));
  };

  const readBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
    new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });

  const server = createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return send(res, 204, {});
    }

    // Auth: bearer token required for everything except /health.
    const auth = req.headers.authorization ?? '';
    const authorized = token === '' || auth === `Bearer ${token}`;

    const url = new URL(req.url ?? '/', `http://${host}`);

    try {
      if (url.pathname === '/health') {
        return send(res, 200, { ok: true });
      }
      if (!authorized) {
        return send(res, 401, { error: 'unauthorized' });
      }

      if (url.pathname === '/services' && req.method === 'GET') {
        return send(res, 200, { services: options.registry.list() });
      }
      if (url.pathname === '/catalog' && req.method === 'GET') {
        return send(res, 200, { catalog: Object.keys(SERVICE_CATALOG) });
      }
      if (url.pathname === '/services' && req.method === 'POST') {
        const body = await readBody(req);
        const appId = String(body.appId ?? '');
        const service = body.service as string | { type: string; env?: Record<string, string>; memory?: string; cpus?: string };
        if (!appId || !service) return send(res, 400, { error: 'appId and service required' });
        const entry = await options.manager.standUp(appId, service);
        return send(res, 201, { service: entry });
      }
      // Relay: forward an HTTP request to a running service (the app's only path in).
      if (url.pathname === '/proxy' && req.method === 'POST') {
        const body = await readBody(req);
        const appId = String(body.appId ?? '');
        const service = String(body.service ?? '');
        const path = String(body.path ?? '/');
        const method = String(body.method ?? 'GET').toUpperCase();
        const payload = body.body;
        const entry =
          options.registry.forApp(appId).find((e) => e.service === service) ??
          options.registry.forService(service)[0];
        if (!entry) return send(res, 404, { error: `service not running: ${service}` });
        const upstream = await fetch(`http://127.0.0.1:${entry.hostPort}${path}`, {
          method,
          headers: payload !== undefined ? { 'Content-Type': 'application/json' } : {},
          body: payload !== undefined ? JSON.stringify(payload) : undefined,
        });
        const text = await upstream.text();
        res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
        res.end(text);
        return;
      }
      const servicesMatch = url.pathname.match(/^\/services\/([^/]+)$/);
      if (servicesMatch && req.method === 'DELETE') {
        await options.manager.tearDown(decodeURIComponent(servicesMatch[1]));
        return send(res, 200, { ok: true });
      }
      const appsMatch = url.pathname.match(/^\/apps\/([^/]+)$/);
      if (appsMatch && req.method === 'DELETE') {
        const removed = await options.manager.uninstallApp(decodeURIComponent(appsMatch[1]));
        return send(res, 200, { removed });
      }

      return send(res, 404, { error: 'not found' });
    } catch (err) {
      return send(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.listen(port, host);
  return server;
}
