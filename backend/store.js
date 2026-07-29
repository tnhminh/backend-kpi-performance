import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultPath = resolve(dirname(fileURLToPath(import.meta.url)), 'data', 'backend-kpi.sqlite');

export function createStore(databasePath = process.env.DB_PATH || defaultPath) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Member','Leader','Admin')),
      team TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS evaluation_periods (
      period TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'draft',
      state_json TEXT NOT NULL DEFAULT '{}',
      formula_version_id INTEGER,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS formula_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      formula_json TEXT NOT NULL,
      checksum TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period TEXT,
      actor_id TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      before_json TEXT,
      after_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS jira_sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_key TEXT NOT NULL UNIQUE,
      jql TEXT NOT NULL,
      total INTEGER NOT NULL DEFAULT 0,
      mapped INTEGER NOT NULL DEFAULT 0,
      warnings_json TEXT NOT NULL DEFAULT '[]',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'running'
    );
  `);

  const json = value => JSON.stringify(value ?? null);
  const parse = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  return {
    db,
    close: () => db.close(),
    health: () => ({ ok: db.prepare('SELECT 1 ok').get().ok === 1, databasePath }),
    getPeriod(period) {
      const row = db.prepare('SELECT * FROM evaluation_periods WHERE period=?').get(period);
      return row ? { ...row, state: parse(row.state_json, {}) } : null;
    },
    savePeriod({ period, status = 'draft', state = {}, formulaVersionId = null, actor = {} }) {
      const before = this.getPeriod(period);
      db.prepare(`
        INSERT INTO evaluation_periods(period,status,state_json,formula_version_id,updated_by,updated_at)
        VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(period) DO UPDATE SET
          status=excluded.status,state_json=excluded.state_json,
          formula_version_id=COALESCE(excluded.formula_version_id,evaluation_periods.formula_version_id),
          updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP
      `).run(period, status, json(state), formulaVersionId, actor.id || null);
      const after = this.getPeriod(period);
      this.audit({ period, actor, action: before ? 'UPDATE_PERIOD' : 'CREATE_PERIOD', entityType: 'period', entityId: period, before, after });
      return after;
    },
    listUsers() {
      return db.prepare('SELECT id,display_name,role,team,active,created_at,updated_at FROM users ORDER BY display_name').all();
    },
    upsertUser(user) {
      db.prepare(`
        INSERT INTO users(id,display_name,role,team,active,updated_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,role=excluded.role,
          team=excluded.team,active=excluded.active,updated_at=CURRENT_TIMESTAMP
      `).run(user.id, user.displayName, user.role, user.team || null, user.active === false ? 0 : 1);
      return db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
    },
    audit({ period = null, actor = {}, action, entityType = null, entityId = null, before = null, after = null }) {
      db.prepare(`
        INSERT INTO audit_logs(period,actor_id,actor_role,action,entity_type,entity_id,before_json,after_json)
        VALUES(?,?,?,?,?,?,?,?)
      `).run(period, actor.id || null, actor.role || null, action, entityType, entityId, json(before), json(after));
    },
    listAudit(period, limit = 200) {
      const rows = period
        ? db.prepare('SELECT * FROM audit_logs WHERE period=? ORDER BY id DESC LIMIT ?').all(period, limit)
        : db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?').all(limit);
      return rows.map(row => ({ ...row, before: parse(row.before_json, null), after: parse(row.after_json, null) }));
    },
    createFormulaVersion({ version, formula, checksum, actor = {} }) {
      db.prepare(`
        INSERT OR IGNORE INTO formula_versions(version,formula_json,checksum,created_by)
        VALUES(?,?,?,?)
      `).run(version, json(formula), checksum, actor.id || null);
      return db.prepare('SELECT * FROM formula_versions WHERE version=?').get(version);
    },
    listFormulaVersions() {
      return db.prepare('SELECT * FROM formula_versions ORDER BY id DESC').all()
        .map(row => ({ ...row, formula: parse(row.formula_json, {}) }));
    },
    startJiraSync({ syncKey, jql, startedAt }) {
      db.prepare(`
        INSERT INTO jira_sync_runs(sync_key,jql,started_at,status)
        VALUES(?,?,?,'running')
        ON CONFLICT(sync_key) DO NOTHING
      `).run(syncKey, jql, startedAt);
      return db.prepare('SELECT * FROM jira_sync_runs WHERE sync_key=?').get(syncKey);
    },
    finishJiraSync({ syncKey, total, mapped = 0, warnings = [], status = 'completed' }) {
      db.prepare(`
        UPDATE jira_sync_runs SET total=?,mapped=?,warnings_json=?,status=?,completed_at=CURRENT_TIMESTAMP
        WHERE sync_key=?
      `).run(total, mapped, json(warnings), status, syncKey);
      return db.prepare('SELECT * FROM jira_sync_runs WHERE sync_key=?').get(syncKey);
    },
    listJiraSyncRuns(limit = 30) {
      return db.prepare('SELECT * FROM jira_sync_runs ORDER BY id DESC LIMIT ?').all(limit)
        .map(row => ({ ...row, warnings: parse(row.warnings_json, []) }));
    }
  };
}
