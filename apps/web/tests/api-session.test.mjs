import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { api, setAccessToken } from '../lib/api.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; setAccessToken(null); });

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

test('concurrent unauthorized workspace calls share one session refresh', async () => {
  let refreshCalls = 0;
  let releaseRefresh;
  const refreshPending = new Promise((resolve) => { releaseRefresh = resolve; });
  globalThis.fetch = async (url, init) => {
    if (url.endsWith('/auth/refresh')) {
      refreshCalls += 1;
      await refreshPending;
      return json({ accessToken: 'rotated-token' });
    }
    return init.headers.get('Authorization') === 'Bearer rotated-token' ? json({ loaded: true }) : json({ message: 'Expired' }, 401);
  };

  const requests = Promise.all(['/only1-cores', '/strategies', '/market-monitors', '/market-monitors/capabilities'].map((path) => api(path)));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(refreshCalls, 1);
  releaseRefresh();
  assert.deepEqual(await requests, Array(4).fill({ loaded: true }));
  assert.equal(refreshCalls, 1);
});

test('a delayed unauthorized response retries the already refreshed token', async () => {
  let refreshCalls = 0;
  let releaseLateRequest;
  const latePending = new Promise((resolve) => { releaseLateRequest = resolve; });
  globalThis.fetch = async (url, init) => {
    if (url.endsWith('/auth/refresh')) { refreshCalls += 1; return json({ accessToken: 'fresh-token' }); }
    if (init.headers.get('Authorization') === 'Bearer fresh-token') return json({ loaded: true });
    if (url.endsWith('/late')) await latePending;
    return json({ message: 'Expired' }, 401);
  };

  const lateRequest = api('/late');
  assert.deepEqual(await api('/early'), { loaded: true });
  releaseLateRequest();
  assert.deepEqual(await lateRequest, { loaded: true });
  assert.equal(refreshCalls, 1);
});

test('the refresh slot resets after a successful session rotation', async () => {
  let refreshCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith('/auth/refresh')) { refreshCalls += 1; return json({ accessToken: `fresh-${refreshCalls}` }); }
    return init.headers.get('Authorization') === `Bearer fresh-${refreshCalls}` && refreshCalls > 0 ? json({ loaded: true }) : json({ message: 'Expired' }, 401);
  };
  assert.deepEqual(await api('/first'), { loaded: true });
  setAccessToken('expired-again');
  assert.deepEqual(await api('/second'), { loaded: true });
  assert.equal(refreshCalls, 2);
});

test('the refresh slot resets after a rejected session or a network failure', async () => {
  let refreshCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith('/auth/refresh')) {
      refreshCalls += 1;
      if (refreshCalls === 1) return json({ message: 'Session expired' }, 401);
      if (refreshCalls === 2) throw new Error('Network unavailable');
      return json({ accessToken: 'recovered-token' });
    }
    return init.headers.get('Authorization') === 'Bearer recovered-token' ? json({ loaded: true }) : json({ message: 'Expired' }, 401);
  };
  await assert.rejects(api('/first'), { message: 'Expired', status: 401 });
  await assert.rejects(api('/second'), { message: 'Network unavailable' });
  assert.deepEqual(await api('/third'), { loaded: true });
  assert.equal(refreshCalls, 3);
});
