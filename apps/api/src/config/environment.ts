import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseEnv } from 'node:util';

type EnvironmentReader = (name: string) => string | undefined;

/** Resolve from the API's location, not npm's workspace-dependent cwd. */
export function findRepositoryEnvFile(startDirectory = __dirname): string | undefined {
  let directory = resolve(startDirectory);

  for (;;) {
    try {
      const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as {
        name?: string;
        workspaces?: unknown;
      };
      if (manifest.name === 'only1ai' && Array.isArray(manifest.workspaces)) {
        return join(directory, '.env');
      }
    } catch {
      // A deployed API can legitimately have no repository manifest or .env.
    }

    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

/** Existing process variables (including Docker secrets) always take precedence. */
export function loadApiEnvironment(options: {
  startDirectory?: string;
  environment?: NodeJS.ProcessEnv;
} = {}): string | undefined {
  const environment = options.environment ?? process.env;
  const envFile = findRepositoryEnvFile(options.startDirectory);
  if (!envFile) return undefined;

  let contents: string;
  try {
    contents = readFileSync(envFile, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new Error('Cannot read the repository .env file. Check its file permissions.');
  }

  for (const [name, value] of Object.entries(parseEnv(contents))) {
    if (environment[name] === undefined) environment[name] = value;
  }
  return envFile;
}

/** Shared by Nest and the migration CLI so they always connect the same way. */
export function postgresConnectionOptions(read: EnvironmentReader) {
  const rawPort = read('DATABASE_PORT') ?? '5432';
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('DATABASE_PORT must be an integer between 1 and 65535.');
  }

  return {
    type: 'postgres' as const,
    host: read('DATABASE_HOST') ?? 'localhost',
    port,
    username: read('DATABASE_USER') ?? 'only1ai',
    password: read('DATABASE_PASSWORD'),
    database: read('DATABASE_NAME') ?? 'only1ai',
    synchronize: false,
  };
}

export function requireJwtSecret(read: EnvironmentReader): string {
  const secret = read('JWT_SECRET');
  if (!secret?.trim()) {
    throw new Error('JWT_SECRET must be configured before starting the API.');
  }
  return secret;
}
