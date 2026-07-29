import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../backend/store.js';

test('SQLite store persists periods, formula versions, users and audit logs', () => {
  const store = createStore(':memory:');
  try {
    const actor = { id: 'admin-1', role: 'Admin' };
    const period = store.savePeriod({ period: '2026-07', status: 'draft', state: { m1: { score: 8 } }, actor });
    assert.equal(period.period, '2026-07');
    assert.equal(period.state.m1.score, 8);
    assert.equal(store.listAudit('2026-07').length, 1);

    store.upsertUser({ id: 'm1', displayName: 'Member One', role: 'Member', team: 'API' });
    assert.equal(store.listUsers()[0].role, 'Member');

    store.createFormulaVersion({ version: 'v1', formula: { completion: 0.35 }, checksum: 'abc', actor });
    assert.equal(store.listFormulaVersions()[0].formula.completion, 0.35);
  } finally {
    store.close();
  }
});

test('Jira sync runs are idempotent by sync key', () => {
  const store = createStore(':memory:');
  try {
    store.startJiraSync({ syncKey: 'same', jql: 'project = BE', startedAt: new Date().toISOString() });
    store.startJiraSync({ syncKey: 'same', jql: 'project = BE', startedAt: new Date().toISOString() });
    store.finishJiraSync({ syncKey: 'same', total: 10, warnings: [{ code: 'missing_deadline', count: 2 }] });
    const runs = store.listJiraSyncRuns();
    assert.equal(runs.length, 1);
    assert.equal(runs[0].total, 10);
    assert.equal(runs[0].warnings[0].count, 2);
  } finally {
    store.close();
  }
});
