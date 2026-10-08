import * as assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { INestApplication, Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AuthEmailService } from '../src/modules/auth/auth-email.service';
import { User } from '../src/modules/users/entities/user.entity';

/** Real PostgreSQL + HTTP checks. Only this run's fixture users are removed. */
async function main(): Promise<void> {
  const runId = randomUUID();
  const emails = [`only1ai-smoke-${runId}@example.invalid`, `only1ai-owner-${runId}@example.invalid`];
  const password = `Test1!${randomBytes(20).toString('hex')}`;
  const verificationTokens = new Map<string, string>();
  const resetTokens = new Map<string, string>();
  let app: INestApplication | undefined;
  let source: DataSource | undefined;
  let stage = 'application startup';
  let checks = 0;
  Logger.overrideLogger(false);

  try {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthEmailService)
      .useValue({
        sendEmailVerification: async (email: string, token: string) => { verificationTokens.set(email, token); },
        sendPasswordReset: async (email: string, token: string) => { resetTokens.set(email, token); },
      })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    source = app.get(DataSource);
    const base = await app.getUrl();
    let token: string | undefined;
    let refreshCookie = '';

    async function request(path: string, method = 'GET', body?: unknown, status: number | number[] = 200, authenticated = true, cookie?: string) {
      const response = await fetch(`${base}/api/v1${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(20_000),
      });
      if (Array.isArray(status)) assert.ok(status.includes(response.status), `${method} ${path} returned ${response.status}`);
      else assert.equal(response.status, status, `${method} ${path} returned an unexpected status`);
      checks += 1;
      const value = response.status === 204 ? undefined : await response.json();
      return { value, status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '' };
    }

    stage = 'registration, verification and login';
    await request('/auth/register', 'POST', {
      email: emails[0], password: 'weak', traderName: 'Local Smoke Trader', preferredTrade: 'forex', preferredStrategy: 'smc',
    }, 400, false);
    for (const email of emails) {
      await request('/auth/register', 'POST', {
        email, password, traderName: 'Local Smoke Trader', preferredTrade: 'forex', preferredStrategy: 'smc',
      }, 202, false);
      const verification = verificationTokens.get(email);
      assert.ok(verification, 'Mocked delivery must receive a verification token');
      await request('/auth/verify-email', 'POST', { token: verification }, 204, false);
      await request('/auth/verify-email', 'POST', { token: verification }, 401, false);
    }
    const login = await request('/auth/login', 'POST', { email: emails[0], password }, 201, false);
    token = login.value.accessToken;
    refreshCookie = login.cookie;
    assert.ok(token && refreshCookie, 'Login must return both access and refresh credentials');
    await request('/users/me');
    await request('/dashboard/mission-control');

    stage = 'malformed resource identifiers';
    await request('/only1-cores/not-a-uuid', 'GET', undefined, 400);
    await request('/only1-cores/not-a-uuid', 'PATCH', { name: 'Invalid Core' }, 400);
    await request('/strategies/not-a-uuid', 'GET', undefined, 400);
    await request('/strategies/not-a-uuid', 'PATCH', { name: 'Invalid Strategy' }, 400);
    await request('/market-monitors/not-a-uuid', 'PATCH', { timeframe: '15min' }, 400);
    await request('/market-monitors/not-a-uuid/candles', 'GET', undefined, 400);
    await request('/analyses/from-assessment/not-a-uuid', 'POST', undefined, 400);
    await request('/notifications/not-a-uuid/read', 'PATCH', undefined, 400);

    stage = 'Only1Core creation and update validation';
    const core = (await request('/only1-cores', 'POST', { name: 'Smoke Core', description: 'Initial description' }, 201)).value;
    const clearedCore = (await request(`/only1-cores/${core.id}`, 'PATCH', { description: null })).value;
    assert.equal(clearedCore.description, null);
    await request(`/only1-cores/${core.id}`, 'PATCH', { name: null }, 400);
    await request(`/only1-cores/${core.id}`, 'PATCH', { status: null }, 400);

    stage = 'strategy updates and preserved confluence evidence';
    const strategy = (await request('/strategies', 'POST', {
      only1CoreId: core.id, name: 'Original Study', timeframe: '15m',
      rules: [{ category: 'session', condition: 'London', priority: 80 }],
    }, 201)).value;
    await request('/confluence-assessments', 'POST', {
      strategyId: strategy.id, observations: [{ category: '   ', condition: 'London' }],
    }, 400);
    const assessment = (await request('/confluence-assessments', 'POST', {
      strategyId: strategy.id, observations: [{ category: 'session', condition: 'London' }],
    }, 201)).value;
    assert.equal(assessment.score, 100);
    assert.equal(assessment.strategySnapshot.name, 'Original Study');
    const updated = (await request(`/strategies/${strategy.id}`, 'PATCH', { name: 'Edited Study', timeframe: null })).value;
    assert.equal(updated.name, 'Edited Study');
    assert.equal(updated.timeframe, null);
    assert.equal(updated.rules.length, 1, 'A metadata-only edit must preserve rules');
    await request(`/strategies/${strategy.id}`, 'PATCH', { rules: null }, 400);
    const analysis = (await request(`/analyses/from-assessment/${assessment.id}`, 'POST', undefined, 201)).value;
    assert.equal(analysis.title, 'Original Study confluence review');
    assert.equal(analysis.evidence.matchedRules.length, 1);
    await request('/analyses?limit=20');

    stage = 'market configuration and cross-user ownership';
    const monitor = (await request('/market-monitors', 'POST', {
      only1CoreId: core.id, strategyId: strategy.id, symbol: 'EUR/USD', marketType: 'forex', timeframe: '15m',
    }, 201)).value;
    assert.equal(monitor.timeframe, '15min');
    await request(`/market-monitors/${monitor.id}`, 'PATCH', { timeframe: null }, 400);
    await request(`/market-monitors/${monitor.id}`, 'PATCH', { status: null }, 400);
    await request('/market-monitors/capabilities');
    const secondLogin = await request('/auth/login', 'POST', { email: emails[1], password }, 201, false);
    const firstToken = token;
    token = secondLogin.value.accessToken;
    await request(`/strategies/${strategy.id}`, 'GET', undefined, 404);
    await request(`/market-monitors/${monitor.id}/candles`, 'GET', undefined, 404);
    await request(`/analyses/from-assessment/${assessment.id}`, 'POST', undefined, 404);
    token = firstToken;

    stage = 'refresh rotation and logout';
    await request('/auth/refresh', 'POST', undefined, 401, false);
    await request('/auth/refresh', 'POST', undefined, 401, false, 'only1ai_refresh=malformed');
    const rotations = await Promise.all([
      request('/auth/refresh', 'POST', undefined, [201, 401], false, refreshCookie),
      request('/auth/refresh', 'POST', undefined, [201, 401], false, refreshCookie),
    ]);
    assert.deepEqual(rotations.map((result) => result.status).sort(), [201, 401], 'Only one concurrent refresh may consume the cookie');
    const refreshed = rotations.find((result) => result.status === 201)!;
    assert.ok(refreshed.value.accessToken && refreshed.cookie);
    await request('/auth/refresh', 'POST', undefined, 401, false, refreshCookie);
    token = refreshed.value.accessToken;
    await request('/users/me');
    await request('/auth/logout', 'POST', undefined, 204, false, refreshed.cookie);
    await request('/auth/refresh', 'POST', undefined, 401, false, refreshed.cookie);

    stage = 'password recovery';
    await request('/auth/password-reset/request', 'POST', { email: emails[0] }, 202, false);
    const resetToken = resetTokens.get(emails[0]);
    assert.ok(resetToken);
    const nextPassword = `Next1!${randomBytes(20).toString('hex')}`;
    await request('/auth/password-reset/confirm', 'POST', { token: resetToken, password: nextPassword }, 204, false);
    await request('/auth/password-reset/confirm', 'POST', { token: resetToken, password: nextPassword }, 401, false);
    await request('/auth/login', 'POST', { email: emails[0], password }, 401, false);
    await request('/auth/login', 'POST', { email: emails[0], password: nextPassword }, 201, false);
    console.log(`PASS: ${checks} real PostgreSQL/HTTP checks; email delivery mocked; no paid provider calls.`);
  } catch (error) {
    console.error(`FAIL: database smoke stage "${stage}" (${error instanceof Error ? error.name : 'unknown error'}).`);
    if (error instanceof assert.AssertionError) console.error(error.message);
    process.exitCode = 1;
  } finally {
    try {
      if (source?.isInitialized) {
        for (const email of emails) await source.getRepository(User).delete({ email });
        console.log('Removed only this run\'s fixture accounts and their cascaded records.');
      }
    } catch {
      console.error('Fixture cleanup failed; existing user data was not targeted.');
      process.exitCode = 1;
    }
    await app?.close();
  }
}

void main();
