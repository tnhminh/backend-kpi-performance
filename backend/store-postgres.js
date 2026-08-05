import pg from 'pg';

const { Pool } = pg;

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Member','Leader','Admin')),
  email TEXT UNIQUE,
  password_hash TEXT,
  team TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS evaluation_periods (
  period TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'draft',
  state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  formula_version_id BIGINT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS formula_versions (
  id BIGSERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  formula_json JSONB NOT NULL,
  checksum TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS period_snapshots (
  period TEXT PRIMARY KEY,
  snapshot_json JSONB NOT NULL,
  checksum TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  period TEXT,
  actor_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS jira_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  sync_key TEXT NOT NULL UNIQUE,
  jql TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  mapped INTEGER NOT NULL DEFAULT 0,
  warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
);
CREATE TABLE IF NOT EXISTS jira_issues (
  issue_key TEXT PRIMARY KEY,
  member TEXT,
  account_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  status TEXT,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  story_points NUMERIC NOT NULL DEFAULT 0,
  deadline TEXT,
  issue_type TEXT,
  priority TEXT,
  labels_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  issue_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_key TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_period_created_idx ON audit_logs(period, created_at DESC);
CREATE INDEX IF NOT EXISTS jira_sync_runs_created_idx ON jira_sync_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS jira_issues_last_sync_idx ON jira_issues(last_sync_key);
`;

const parse = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

export async function createPostgresStore(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is required when DB_DRIVER=postgres');
  const pool = new Pool({ connectionString, max: Number(process.env.DB_POOL_MAX || 10), ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  await pool.query(schema);
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT; ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT; CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email) WHERE email IS NOT NULL;');
  const queryOne = async (text, values = []) => (await pool.query(text, values)).rows[0] || null;
  const queryAll = async (text, values = []) => (await pool.query(text, values)).rows;
  const json = value => value === undefined ? null : JSON.stringify(value);

  return {
    pool,
    close: () => pool.end(),
    health: async () => ({ ok: Boolean((await queryOne('SELECT 1 AS ok')).ok), database: 'postgresql' }),
    getPeriod: async period => {
      const row = await queryOne('SELECT * FROM evaluation_periods WHERE period=$1', [period]);
      return row ? { ...row, state: parse(row.state_json, {}) } : null;
    },
    savePeriod: async ({ period, status = 'draft', state = {}, formulaVersionId = null, actor = {} }) => {
      const previous = await queryOne('SELECT * FROM evaluation_periods WHERE period=$1', [period]);
      const before = previous ? { ...previous, state: parse(previous.state_json, {}) } : null;
      await pool.query(`INSERT INTO evaluation_periods(period,status,state_json,formula_version_id,updated_by)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(period) DO UPDATE SET status=EXCLUDED.status,state_json=EXCLUDED.state_json,
        formula_version_id=COALESCE(EXCLUDED.formula_version_id,evaluation_periods.formula_version_id),updated_by=EXCLUDED.updated_by,updated_at=NOW()`,
        [period, status, json(state), formulaVersionId, actor.id || null]);
      const after = await queryOne('SELECT * FROM evaluation_periods WHERE period=$1', [period]);
      await queryOne(`INSERT INTO audit_logs(period,actor_id,actor_role,action,entity_type,entity_id,before_json,after_json)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [period, actor.id || null, actor.role || null, before ? 'UPDATE_PERIOD' : 'CREATE_PERIOD', 'period', period, json(before), json(after)]);
      return { ...after, state: parse(after.state_json, {}) };
    },
    listUsers: () => queryAll('SELECT id,display_name,role,email,team,active,created_at,updated_at FROM users ORDER BY display_name'),
    upsertUser: async user => queryOne(`INSERT INTO users(id,display_name,role,email,password_hash,team,active) VALUES($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT(id) DO UPDATE SET display_name=EXCLUDED.display_name,role=EXCLUDED.role,email=COALESCE(EXCLUDED.email,users.email),password_hash=COALESCE(EXCLUDED.password_hash,users.password_hash),team=EXCLUDED.team,active=EXCLUDED.active,updated_at=NOW()
      RETURNING id,display_name,role,email,team,active,created_at,updated_at`, [user.id, user.displayName, user.role, user.email?.toLowerCase() || null, user.passwordHash || null, user.team || null, user.active !== false]),
    findAuthUserByEmail: email => queryOne('SELECT * FROM users WHERE lower(email)=lower($1) AND active=TRUE', [email]),
    findUserById: id => queryOne('SELECT id,display_name,role,email,team,active,created_at,updated_at FROM users WHERE id=$1 AND active=TRUE', [id]),
    updateUserPassword: async (id, passwordHash) => { await pool.query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2', [passwordHash, id]); return queryOne('SELECT id,display_name,role,email,team,active,created_at,updated_at FROM users WHERE id=$1', [id]); },
    setUserActive: async (id, active) => queryOne('UPDATE users SET active=$1,updated_at=NOW() WHERE id=$2 RETURNING id,display_name,role,email,team,active,created_at,updated_at', [Boolean(active), id]),
    audit: ({ period = null, actor = {}, action, entityType = null, entityId = null, before = null, after = null }) => queryOne(`INSERT INTO audit_logs(period,actor_id,actor_role,action,entity_type,entity_id,before_json,after_json)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [period, actor.id || null, actor.role || null, action, entityType, entityId, json(before), json(after)]),
    listAudit: async (period, limit = 200) => {
      const rows = period ? await queryAll('SELECT * FROM audit_logs WHERE period=$1 ORDER BY id DESC LIMIT $2', [period, limit]) : await queryAll('SELECT * FROM audit_logs ORDER BY id DESC LIMIT $1', [limit]);
      return rows.map(row => ({ ...row, before: parse(row.before_json, null), after: parse(row.after_json, null) }));
    },
    createFormulaVersion: async ({ version, formula, checksum, actor = {} }) => {
      await pool.query(`INSERT INTO formula_versions(version,formula_json,checksum,created_by) VALUES($1,$2,$3,$4) ON CONFLICT(version) DO NOTHING`, [version, json(formula), checksum, actor.id || null]);
      const row = await queryOne('SELECT * FROM formula_versions WHERE version=$1', [version]);
      return { ...row, formula: parse(row.formula_json, {}) };
    },
    listFormulaVersions: async () => (await queryAll('SELECT * FROM formula_versions ORDER BY id DESC')).map(row => ({ ...row, formula: parse(row.formula_json, {}) })),
    createSnapshot: async ({ period, snapshot, checksum, actor = {} }) => { await pool.query('INSERT INTO period_snapshots(period,snapshot_json,checksum,created_by) VALUES($1,$2,$3,$4) ON CONFLICT(period) DO NOTHING', [period, json(snapshot), checksum, actor.id || null]); const row = await queryOne('SELECT * FROM period_snapshots WHERE period=$1', [period]); return row ? { ...row, snapshot: parse(row.snapshot_json, {}) } : null; },
    getSnapshot: async period => { const row = await queryOne('SELECT * FROM period_snapshots WHERE period=$1', [period]); return row ? { ...row, snapshot: parse(row.snapshot_json, {}) } : null; },
    startJiraSync: async ({ syncKey, jql, startedAt }) => { await pool.query(`INSERT INTO jira_sync_runs(sync_key,jql,started_at,status) VALUES($1,$2,$3,'running') ON CONFLICT(sync_key) DO NOTHING`, [syncKey, jql, startedAt]); return queryOne('SELECT * FROM jira_sync_runs WHERE sync_key=$1', [syncKey]); },
    finishJiraSync: async ({ syncKey, total, mapped = 0, warnings = [], status = 'completed' }) => { await pool.query(`UPDATE jira_sync_runs SET total=$1,mapped=$2,warnings_json=$3,status=$4,completed_at=NOW() WHERE sync_key=$5`, [total, mapped, json(warnings), status, syncKey]); return queryOne('SELECT * FROM jira_sync_runs WHERE sync_key=$1', [syncKey]); },
    listJiraSyncRuns: async (limit = 30) => (await queryAll('SELECT * FROM jira_sync_runs ORDER BY id DESC LIMIT $1', [limit])).map(row => ({ ...row, warnings: parse(row.warnings_json, []) })),
    upsertJiraIssues: async (issues, syncKey, syncedAt = new Date().toISOString()) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const issue of issues || []) {
          await client.query(`INSERT INTO jira_issues(issue_key,member,account_id,title,status,done,story_points,deadline,issue_type,priority,labels_json,issue_json,last_sync_key,last_synced_at)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            ON CONFLICT(issue_key) DO UPDATE SET member=EXCLUDED.member,account_id=EXCLUDED.account_id,title=EXCLUDED.title,status=EXCLUDED.status,done=EXCLUDED.done,story_points=EXCLUDED.story_points,deadline=EXCLUDED.deadline,issue_type=EXCLUDED.issue_type,priority=EXCLUDED.priority,labels_json=EXCLUDED.labels_json,issue_json=EXCLUDED.issue_json,last_sync_key=EXCLUDED.last_sync_key,last_synced_at=EXCLUDED.last_synced_at,updated_at=NOW()`,
            [issue.key, issue.member || null, issue.accountId || null, issue.title || '', issue.status || null, Boolean(issue.done), Number(issue.storyPoints || 0), issue.deadline || null, issue.issueType || null, issue.priority || null, json(issue.labels || []), json(issue), syncKey, syncedAt]);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
      return issues?.length || 0;
    },
    listJiraIssues: async (limit = 10000) => {
      const latest = await queryOne("SELECT sync_key FROM jira_sync_runs WHERE status='completed' ORDER BY completed_at DESC NULLS LAST, id DESC LIMIT 1");
      if (!latest) return [];
      return (await queryAll('SELECT issue_json FROM jira_issues WHERE last_sync_key=$1 ORDER BY issue_key LIMIT $2', [latest.sync_key, limit])).map(row => parse(row.issue_json, {}));
    },
    updateJiraIssues: async issues => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const issue of issues || []) {
          await client.query(
            'UPDATE jira_issues SET story_points=$1,issue_json=$2,updated_at=NOW() WHERE issue_key=$3',
            [Number(issue.storyPoints || 0), json(issue), issue.key]
          );
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      return issues?.length || 0;
    }
  };
}
