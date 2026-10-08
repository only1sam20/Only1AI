import { readFileSync } from 'node:fs';
import { join, parse } from 'node:path';
import { findRepositoryEnvFile, loadApiEnvironment, postgresConnectionOptions, requireJwtSecret } from './environment';

jest.mock('node:fs', () => ({ readFileSync: jest.fn() }));

describe('API environment configuration', () => {
  const repository = join(parse(process.cwd()).root, 'only1ai-environment-fixture');
  const envFile = join(repository, '.env');
  const manifest = join(repository, 'package.json');
  const files = new Map<string, string>();
  const readFile = readFileSync as jest.MockedFunction<typeof readFileSync>;

  beforeEach(() => {
    files.clear();
    files.set(manifest, JSON.stringify({ name: 'only1ai', workspaces: ['apps/api', 'apps/web'] }));
    readFile.mockImplementation((path) => {
      const value = files.get(String(path));
      if (value === undefined) throw Object.assign(new Error('Fixture file not found'), { code: 'ENOENT' });
      return value;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['repository root', repository],
    ['API workspace', join(repository, 'apps', 'api')],
    ['source module', join(repository, 'apps', 'api', 'src', 'config')],
    ['compiled module', join(repository, 'apps', 'api', 'dist', 'config')],
  ])('resolves the same root .env from the %s', (_name, startDirectory) => {
    expect(findRepositoryEnvFile(startDirectory)).toBe(envFile);
  });

  it.each([repository, join(repository, 'apps', 'api')])('loads independently of npm cwd %s', (cwd) => {
    jest.spyOn(process, 'cwd').mockReturnValue(cwd);
    files.set(envFile, 'DATABASE_USER=postgres\nDATABASE_PASSWORD="fixture#password"\nJWT_SECRET=fixture-secret\n');
    const environment: NodeJS.ProcessEnv = {};

    expect(loadApiEnvironment({ startDirectory: join(repository, 'apps', 'api', 'src', 'config'), environment })).toBe(envFile);
    expect(environment).toEqual({
      DATABASE_USER: 'postgres', DATABASE_PASSWORD: 'fixture#password', JWT_SECRET: 'fixture-secret',
    });
  });

  it('preserves process-provided values, including explicit empty values', () => {
    files.set(envFile, 'DATABASE_USER=local-user\nDATABASE_PASSWORD=local-password\nNODE_ENV=development\nOPENAI_API_KEY=local-key\n');
    const environment: NodeJS.ProcessEnv = {
      DATABASE_USER: 'docker-user', DATABASE_PASSWORD: 'injected-password', NODE_ENV: 'production', OPENAI_API_KEY: '',
    };

    loadApiEnvironment({ startDirectory: repository, environment });
    expect(environment).toEqual({
      DATABASE_USER: 'docker-user', DATABASE_PASSWORD: 'injected-password', NODE_ENV: 'production', OPENAI_API_KEY: '',
    });
  });

  it('allows production startup without a repository .env', () => {
    const environment: NodeJS.ProcessEnv = { NODE_ENV: 'production', DATABASE_USER: 'deployed-user', JWT_SECRET: 'injected-secret' };
    expect(loadApiEnvironment({ startDirectory: repository, environment })).toBeUndefined();
    expect(environment.DATABASE_USER).toBe('deployed-user');
    expect(environment.JWT_SECRET).toBe('injected-secret');
  });

  it('allows a standalone deployed API without a repository manifest', () => {
    files.clear();
    const environment: NodeJS.ProcessEnv = { NODE_ENV: 'production', DATABASE_HOST: 'postgres' };
    expect(loadApiEnvironment({ startDirectory: join(repository, 'dist', 'config'), environment })).toBeUndefined();
    expect(environment).toEqual({ NODE_ENV: 'production', DATABASE_HOST: 'postgres' });
  });

  it('never searches for an API-workspace .env or logs its contents', () => {
    files.set(join(repository, 'apps', 'api', '.env'), 'DATABASE_USER=wrong-workspace-user');
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const environment: NodeJS.ProcessEnv = {};
    expect(loadApiEnvironment({ startDirectory: join(repository, 'apps', 'api'), environment })).toBeUndefined();
    expect(environment).toEqual({});
    expect(log).not.toHaveBeenCalled();
  });

  it('reports inaccessible env files without exposing their values', () => {
    readFile.mockImplementation((path) => {
      if (String(path) === manifest) return files.get(manifest)!;
      if (String(path) === envFile) throw Object.assign(new Error('sensitive fixture value'), { code: 'EACCES' });
      throw Object.assign(new Error('Fixture file not found'), { code: 'ENOENT' });
    });
    expect(() => loadApiEnvironment({ startDirectory: repository, environment: {} }))
      .toThrow('Cannot read the repository .env file. Check its file permissions.');
  });

  it('uses identical PostgreSQL options for Nest and migrations', () => {
    const environment: NodeJS.ProcessEnv = {
      DATABASE_HOST: 'localhost', DATABASE_PORT: '5433', DATABASE_USER: 'postgres',
      DATABASE_PASSWORD: 'fixture-password', DATABASE_NAME: 'only1ai',
    };
    expect(postgresConnectionOptions((name) => environment[name])).toEqual({
      type: 'postgres', host: 'localhost', port: 5433, username: 'postgres',
      password: 'fixture-password', database: 'only1ai', synchronize: false,
    });
  });

  it.each(['', 'abc', '5432.5', '0', '-1', '65536'])('rejects invalid database port %j before connecting', (port) => {
    expect(() => postgresConnectionOptions((name) => name === 'DATABASE_PORT' ? port : undefined))
      .toThrow('DATABASE_PORT must be an integer between 1 and 65535.');
  });

  it.each([undefined, '', '   '])('requires an explicitly configured JWT secret (%j)', (secret) => {
    expect(() => requireJwtSecret(() => secret)).toThrow('JWT_SECRET must be configured before starting the API.');
  });

  it('uses the same configured JWT secret without an insecure fallback', () => {
    expect(requireJwtSecret((name) => name === 'JWT_SECRET' ? 'configured-fixture-secret' : undefined)).toBe('configured-fixture-secret');
  });
});
