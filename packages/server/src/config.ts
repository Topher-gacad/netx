export const config = {
  port: parseInt(process.env.NETX_PORT ?? '3001', 10),
  jwtSecret: process.env.NETX_JWT_SECRET ?? 'netx-dev-secret-change-in-production',
  jwtExpiresIn: '7d',
  dbPath: process.env.NETX_DB_PATH ?? './netx.db',
  corsOrigin: process.env.NETX_CORS_ORIGIN ?? 'http://localhost:3000',
  adminUsername: process.env.NETX_ADMIN_USER ?? 'admin',
  adminPassword: process.env.NETX_ADMIN_PASS ?? 'admin123',
  adminEmail: process.env.NETX_ADMIN_EMAIL ?? 'admin@netx.local',
};
