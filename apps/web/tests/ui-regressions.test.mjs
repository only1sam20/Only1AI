import assert from 'node:assert/strict';
import { test } from 'node:test';
import { componentHarness, deferred, findElement, settle } from './component-harness.mjs';
import { safeReturnPath } from '../lib/auth-navigation.ts';
import { hasStrongPassword, passwordChecks } from '../lib/password-policy.ts';

test('email verification consumes the one-time token only once during Strict Mode effect replay', async () => {
  const pending = deferred();
  let calls = 0;
  const harness = componentHarness('../app/(auth)/verify-email/page.tsx', 'default', {
    search: '?token=one-time-token',
    modules: { '../../../lib/api': { verifyEmail: (token) => { calls += 1; assert.equal(token, 'one-time-token'); return pending.promise; } } },
  });
  harness.render();
  const setup = harness.effect();
  setup()();
  const cleanup = setup();
  assert.equal(calls, 1);
  pending.resolve();
  await settle();
  assert.equal(harness.state[0], 'verified');
  cleanup();
});

test('verification does not overwrite an unmounted page and does not bypass an invalid token', async () => {
  const pending = deferred();
  const harness = componentHarness('../app/(auth)/verify-email/page.tsx', 'default', {
    search: '?token=invalid', modules: { '../../../lib/api': { verifyEmail: () => pending.promise } },
  });
  harness.render();
  harness.effect()()();
  pending.reject(new Error('Invalid verification token'));
  await settle();
  assert.equal(harness.state[0], 'verifying');
  assert.equal(harness.writes.length, 0);

  const mounted = componentHarness('../app/(auth)/verify-email/page.tsx', 'default', {
    search: '?token=invalid', modules: { '../../../lib/api': { verifyEmail: async () => { throw new Error('Invalid verification token'); } } },
  });
  mounted.render();
  mounted.effect()();
  await settle();
  assert.equal(mounted.state[0], 'error');
});

test('an incomplete verification link never sends a verification request', () => {
  let called = false;
  const harness = componentHarness('../app/(auth)/verify-email/page.tsx', 'default', {
    modules: { '../../../lib/api': { verifyEmail: () => { called = true; } } },
  });
  harness.render();
  harness.effect()();
  assert.equal(called, false);
  assert.equal(harness.state[0], 'error');
});

test('profile saves submit only editable fields, not server metadata or onboarding preferences', async () => {
  const profile = { displayName: 'Ada', timezone: 'Africa/Lagos', bio: 'Research', preferredTrade: 'forex', preferredStrategy: 'smc', customStrategy: null, updatedAt: '2026-10-19T00:00:00Z' };
  const user = { id: 'user-1', email: 'ada@example.com', emailVerifiedAt: '2026-10-19', profile };
  let payload;
  const pending = deferred();
  const harness = componentHarness('../components/profile-manager.tsx', 'ProfileManager', {
    initialState: [user, profile, '', false, false],
    modules: { '../lib/api': { api: async (path, init) => { assert.equal(path, '/users/me/profile'); payload = JSON.parse(init.body); return pending.promise; } } },
  });
  const form = findElement(harness.render(), (node) => node.type === 'form');
  const submit = form.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(payload, { displayName: 'Ada', timezone: 'Africa/Lagos', bio: 'Research' });
  const fieldset = findElement(harness.render(), (node) => node.type === 'fieldset');
  assert.equal(fieldset.props.disabled, true, 'prevent edits from being overwritten by the pending save');
  pending.resolve({ ...profile, updatedAt: '2026-10-19T01:00:00Z' });
  await submit;
  assert.match(harness.state[2], /saved/);
});

test('a cleaned-up profile load cannot overwrite the current Strict Mode load', async () => {
  const obsolete = deferred();
  const current = deferred();
  let calls = 0;
  const harness = componentHarness('../components/profile-manager.tsx', 'ProfileManager', {
    modules: { '../lib/api': { api: () => (++calls === 1 ? obsolete.promise : current.promise) } },
  });
  harness.render();
  const setup = harness.effect();
  setup()();
  setup();
  current.resolve({ email: 'current@example.com', profile: { displayName: 'Current' } });
  await settle();
  obsolete.resolve({ email: 'obsolete@example.com', profile: { displayName: 'Obsolete' } });
  await settle();
  assert.equal(harness.state[1].displayName, 'Current');
});

const strategy = (id) => ({ id, name: id, only1CoreId: 'core-1', status: 'draft', timeframe: '15min', rules: [{ category: 'trend', condition: 'bullish', priority: 70, value: { threshold: 3 } }] });

test('saving an edited strategy preserves rule values and survives React clearing event.currentTarget', async () => {
  const pending = deferred();
  const editing = strategy('strategy-1');
  let payload;
  const harness = componentHarness('../components/strategy-builder.tsx', 'StrategyBuilder', {
    initialState: [[{ id: 'core-1', name: 'Core' }], [editing], editing.rules, editing, '', false, false, null],
    modules: { '../lib/api': { api: async (_path, init) => { payload = JSON.parse(init.body); return pending.promise; } } },
  });
  const form = findElement(harness.render(), (node) => node.type === 'form');
  let resets = 0;
  const event = { preventDefault() {}, currentTarget: { fields: { only1CoreId: 'core-1', name: 'Renamed', description: '', timeframe: '15min' }, reset() { resets += 1; } } };
  const submit = form.props.onSubmit(event);
  event.currentTarget = null;
  assert.deepEqual(payload.rules[0].value, { threshold: 3 });
  assert.equal(findElement(harness.render(), (node) => node.type === 'fieldset').props.disabled, true);
  pending.resolve({ ...editing, name: 'Renamed' });
  await submit;
  assert.equal(resets, 1);
  assert.match(harness.state[4], /updated/);
  assert.equal(harness.state[1][0].name, 'Renamed');
});

test('out-of-order strategy edit responses keep the most recently selected strategy and rule values', async () => {
  const first = deferred();
  const second = deferred();
  const firstStrategy = strategy('first');
  const secondStrategy = strategy('second');
  const harness = componentHarness('../components/strategy-builder.tsx', 'StrategyBuilder', {
    initialState: [[{ id: 'core-1', name: 'Core' }], [firstStrategy, secondStrategy], [], null, '', false, false, null],
    modules: { '../lib/api': { api: (path) => path.endsWith('/first') ? first.promise : second.promise } },
  });
  const tree = harness.render();
  const articles = findElement(tree, (node) => node.props?.className === 'core-list').props.children;
  const firstButton = findElement(articles[0], (node) => node.type === 'button' && node.props.children === 'Edit rules');
  const secondButton = findElement(articles[1], (node) => node.type === 'button' && node.props.children === 'Edit rules');
  const firstEdit = firstButton.props.onClick();
  const secondEdit = secondButton.props.onClick();
  second.resolve(secondStrategy);
  await secondEdit;
  first.resolve(firstStrategy);
  await firstEdit;
  assert.equal(harness.state[3].id, 'second');
  assert.deepEqual(harness.state[2][0].value, { threshold: 3 });
});

test('a pending strategy save blocks editing or toggling another strategy', async () => {
  const pending = deferred();
  const editing = strategy('first');
  const other = strategy('second');
  const calls = [];
  const harness = componentHarness('../components/strategy-builder.tsx', 'StrategyBuilder', {
    initialState: [[{ id: 'core-1', name: 'Core' }], [editing, other], editing.rules, editing, '', false, false, null],
    modules: { '../lib/api': { api: (path, init) => { calls.push({ path, method: init?.method }); return pending.promise; } } },
  });
  const form = findElement(harness.render(), (node) => node.type === 'form');
  const submit = form.props.onSubmit({ preventDefault() {}, currentTarget: { fields: { name: 'Saved first', timeframe: '15min', description: '' }, reset() {} } });
  const list = findElement(harness.render(), (node) => node.props?.className === 'core-list');
  const editButton = findElement(list.props.children[1], (node) => node.type === 'button' && node.props.children === 'Edit rules');
  const toggleButton = findElement(list.props.children[1], (node) => node.type === 'button' && node.props.children === 'Mark active');
  assert.equal(editButton.props.disabled, true);
  assert.equal(toggleButton.props.disabled, true);
  // Exercise handler guards as well as the disabled button presentation.
  await editButton.props.onClick();
  await toggleButton.props.onClick();
  assert.deepEqual(calls, [{ path: '/strategies/first', method: 'PATCH' }]);
  assert.equal(harness.state[3].id, 'first');
  pending.resolve({ ...editing, name: 'Saved first' });
  await submit;
  assert.equal(harness.state[3], null);
  assert.equal(harness.state[1][1].id, 'second');
});

test('the mobile brand does not render an anchor inside another anchor', () => {
  const harness = componentHarness('../components/app-shell.tsx', 'AppShell');
  function check(node, insideAnchor = false) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((child) => check(child, insideAnchor)); return; }
    if (typeof node.type === 'function') { check(node.type(node.props), insideAnchor); return; }
    if (node.type === 'a') assert.equal(insideAnchor, false, 'nested anchors cause invalid markup and hydration errors');
    check(node.props?.children, insideAnchor || node.type === 'a');
  }
  check(harness.render());
});

test('post-login navigation only accepts same-origin root-relative paths', () => {
  assert.equal(safeReturnPath('/analysis?view=saved#latest'), '/analysis?view=saved#latest');
  for (const path of [null, 'https://evil.example', '//evil.example', '/\\evil.example', '/\n/evil.example', 'javascript:alert(1)', 'analysis']) {
    assert.equal(safeReturnPath(path), '/mission-control', `unsafe returnTo: ${JSON.stringify(path)}`);
  }
});

test('new passwords accept exactly 72 ASCII bytes and reject 73 without truncation', () => {
  assert.equal(hasStrongPassword(`Aa1!${'x'.repeat(68)}`), true);
  assert.equal(hasStrongPassword(`Aa1!${'x'.repeat(69)}`), false);
});

test('new password byte limits account for multi-byte Unicode characters', () => {
  assert.equal(hasStrongPassword(`Aa1!${'é'.repeat(34)}`), true);
  assert.equal(hasStrongPassword(`Aa1!${'é'.repeat(34)}x`), false);
  assert.equal(hasStrongPassword(`Aa1!${'🙂'.repeat(17)}`), true);
  assert.equal(hasStrongPassword(`Aa1!${'🙂'.repeat(17)}x`), false);
  assert.equal(hasStrongPassword('Aa1!🙂'), false, 'five Unicode characters are fewer than the six-character minimum');
});

test('new passwords still require uppercase, lowercase, numbers, and special characters', () => {
  assert.equal(hasStrongPassword('Aa1!xx'), true);
  for (const password of ['aa1!xx', 'AA1!XX', 'Aaa!xx', 'Aa12xx', 'Aa1 xx']) assert.equal(hasStrongPassword(password), false);
  assert.equal(passwordChecks('Aa1!xx').every((check) => check.passed), true);
});
