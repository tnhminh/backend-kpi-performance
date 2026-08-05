import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { hashPassword } from '../backend/auth.js';

const port = 18879;
const base = `http://127.0.0.1:${port}`;

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Backend test server did not start');
}

test('backend state API enforces role scope and exposes durable services', async () => {
  const child = spawn(process.execPath, ['backend/server.js'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, PORT: String(port), DB_PATH: ':memory:', JIRA_TOKEN: '', JIRA_BASE_URL: '', JWT_SECRET: 'test-jwt-secret', ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'test-password-123' },
    stdio: 'ignore'
  });
  try {
    await waitForServer();
    const health = await fetch(`${base}/api/health`).then(response => response.json());
    assert.equal(health.ok, true);
    assert.equal(health.storage.ok, true);

    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@example.com', password: 'test-password-123' }) });
    assert.equal(login.status, 200);
    const adminCookie = login.headers.get('set-cookie').split(';')[0];
    const adminHeaders = { 'content-type': 'application/json', cookie: adminCookie };
    await fetch(`${base}/api/users`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ id: 'm1', email: 'member@example.com', displayName: 'Member One', role: 'Member', password: 'member-password-123' }) });
    const memberLogin = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'member@example.com', password: 'member-password-123' }) });
    assert.equal(memberLogin.status, 200);
    const memberHeaders = { 'content-type': 'application/json', cookie: memberLogin.headers.get('set-cookie').split(';')[0] };
    await fetch(`${base}/api/state`, {
      method: 'PUT',
      headers: memberHeaders,
      body: JSON.stringify({ period: '2026-07', state: { m1: { score: 8 }, m2: { score: 10 } } })
    });
    const saved = await fetch(`${base}/api/state?period=2026-07`, { headers: memberHeaders }).then(response => response.json());
    assert.equal(saved.period.state.m1.score, 8);
    assert.equal(saved.period.state.m2, undefined);

    const denied = await fetch(`${base}/api/users`, { headers: memberHeaders });
    assert.equal(denied.status, 403);

    const formula = await fetch(`${base}/api/formulas`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ version: 'test-v1', formula: { completion: 0.35 } })
    });
    assert.equal(formula.status, 200);
    const submitted = await fetch(`${base}/api/state`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ period: '2026-07', status: 'submitted', state: { m1: { score: 8 } } }) });
    assert.equal(submitted.status, 200);
    const approved = await fetch(`${base}/api/state`, { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ period: '2026-07', status: 'approved', state: { m1: { score: 8 } } }) });
    assert.equal(approved.status, 200);
    const locked = await fetch(`${base}/api/state`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ period: '2026-07', status: 'locked', state: { m1: { score: 8 } }, formula: { version: 'test-v1' } })
    });
    assert.equal(locked.status, 200);
    const snapshot = await fetch(`${base}/api/snapshots?period=2026-07`, { headers: adminHeaders }).then(response => response.json());
    assert.equal(snapshot.snapshot.snapshot.status, 'locked');
  } finally {
    child.kill();
  }
});
