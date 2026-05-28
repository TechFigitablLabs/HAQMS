const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.POSTGRESQL_URL,
  ];

  return candidates.find(Boolean);
}

const databaseUrl = resolveDatabaseUrl();

if (!databaseUrl) {
  console.error('FATAL: DATABASE_URL environment variable is required');
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;

const prismaCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const migrateResult = spawnSync(prismaCommand, ['prisma', 'migrate', 'deploy'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: process.env,
});

if (migrateResult.status !== 0) {
  process.exit(migrateResult.status || 1);
}

require('../src/index.js');