import type { ServiceDef } from './hardening.js';

/**
 * The catalog of services CyberdeckOS knows how to stand up.
 * Apps request these by name (e.g. `"services": ["postgres"]` in their manifest).
 */
export const SERVICE_CATALOG: Record<string, ServiceDef> = {
  postgres: { name: 'postgres', image: 'postgres:16-alpine', port: 5432, volumes: [{ name: 'pgdata', path: '/var/lib/postgresql/data' }] },
  mysql: { name: 'mysql', image: 'mysql:8.0', port: 3306, volumes: [{ name: 'mysqldata', path: '/var/lib/mysql' }] },
  mariadb: { name: 'mariadb', image: 'mariadb:11', port: 3306, volumes: [{ name: 'mariadbdata', path: '/var/lib/mysql' }] },
  redis: { name: 'redis', image: 'redis:7-alpine', port: 6379, volumes: [{ name: 'redisdata', path: '/data' }] },
  ollama: { name: 'ollama', image: 'ollama/ollama:latest', port: 11434, volumes: [{ name: 'ollamadata', path: '/root/.ollama' }] },
  minio: { name: 'minio', image: 'minio/minio:latest', port: 9000, volumes: [{ name: 'miniodata', path: '/data' }] },
  mongo: { name: 'mongo', image: 'mongo:7', port: 27017, volumes: [{ name: 'mongodata', path: '/data/db' }] },
  rabbitmq: { name: 'rabbitmq', image: 'rabbitmq:3-alpine', port: 5672 },
  nginx: { name: 'nginx', image: 'nginx:1.25-alpine', port: 80, tmpfs: ['/var/cache/nginx'] },
  web: { name: 'web', image: 'python:3.12-slim', port: 8080, command: ['python', '-m', 'http.server', '8080'] },
};

/** Services that need a generated root password on first boot. */
export const SERVICES_NEEDING_SECRETS: Record<string, string[]> = {
  postgres: ['POSTGRES_PASSWORD'],
  mysql: ['MYSQL_ROOT_PASSWORD'],
  mariadb: ['MARIADB_ROOT_PASSWORD'],
  minio: ['MINIO_ROOT_PASSWORD'],
};

export function getService(name: string): ServiceDef | undefined {
  return SERVICE_CATALOG[name];
}
