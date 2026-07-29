import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

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
    env: { ...process.env, PORT: String(port), DB_PATH: ':memory:', JIRA_TOKEN: '', JIRA_BASE_URL: '' },
    stdio: 'ignore'
  });
  try {
    await waitForServer();
    const health = await fetch(`${base}/api/health`).then(response => response.json());
    assert.equal(health.ok, true);
    assert.equal(health.storage.ok, true);

    const memberHeaders = { 'content-type': 'application/json', 'x-user-id': 'm1', 'x-user-role': 'Member' };
    await fetch(`${base}/api/state`, {
      method: 'PUT',
      headers: memberHeaders,
      body: JSON.stringify({ period: '2026-07', state: { m1: { score: 8 }, m2: { score: 10 } } })
    });
    const saved = await fetch(`${base}/api/state?period=2026-07`).then(response => response.json());
    assert.equal(saved.period.state.m1.score, 8);
    assert.equal(saved.period.state.m2, undefined);

    const denied = await fetch(`${base}/api/users`, { headers: memberHeaders });
    assert.equal(denied.status, 403);

    const adminHeaders = { 'content-type': 'application/json', 'x-user-id': 'a1', 'x-user-role': 'Admin' };
    const formula = await fetch(`${base}/api/formulas`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ version: 'test-v1', formula: { completion: 0.35 } })
    });
    assert.equal(formula.status, 200);
  } finally {
    child.kill();
  }
});
