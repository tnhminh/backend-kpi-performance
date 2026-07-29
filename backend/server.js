import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { URL } from 'node:url';
import { createHash } from 'node:crypto';
import { createPostgresStore } from './store-postgres.js';
import { createClient } from 'redis';

function loadEnvFile() {
  const path = new URL('./.env', import.meta.url);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const config = {
  port: Number(process.env.PORT || 8787),
  baseUrl: (process.env.JIRA_BASE_URL || '').replace(/\/$/, ''),
  projectKey: process.env.JIRA_PROJECT_KEY || '',
  authType: process.env.JIRA_AUTH_TYPE || 'pat',
  token: process.env.JIRA_TOKEN || '',
  user: process.env.JIRA_USER || '',
  storyPointsField: process.env.JIRA_STORY_POINTS_FIELD || 'customfield_10016',
  deadlineField: process.env.JIRA_DEADLINE_FIELD || 'duedate',
  doneStatuses: (process.env.JIRA_DONE_STATUSES || 'Done,Closed,Resolved').split(',').map(x => x.trim()).filter(Boolean),
  maxResults: Number(process.env.SYNC_MAX_RESULTS || 100),
  maxIssues: Number(process.env.JIRA_SYNC_MAX_ISSUES || 1000),
  searchFields: process.env.JIRA_SEARCH_FIELDS || 'summary,assignee,status,priority,labels,issuetype,created,updated',
  defaultJql: process.env.JIRA_DEFAULT_JQL || 'ORDER BY created DESC',
  databasePath: process.env.DB_PATH || undefined
};
const store = process.env.DB_DRIVER === 'postgres'
  ? await createPostgresStore(process.env.DATABASE_URL)
  : (await import('./store.js')).createStore(config.databasePath);
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
let redisReady = false;
redis.on('error', error => console.error(`Redis error: ${error.message}`));
if (process.env.REDIS_URL) {
  try {
    await Promise.race([
      redis.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('connection timeout')), 750))
    ]);
    redisReady = true;
  } catch (error) { console.warn(`Redis unavailable: ${error.message}`); }
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,x-user-id,x-user-role,authorization'
  });
  res.end(payload);
}

function actorFrom(req) {
  const role = String(req.headers['x-user-role'] || 'Admin');
  return {
    id: String(req.headers['x-user-id'] || 'demo-admin'),
    role: ['Member', 'Leader', 'Admin'].includes(role) ? role : 'Member'
  };
}

function requireRole(actor, allowed) {
  if (!allowed.includes(actor.role)) {
    const error = new Error(`Vai trò ${actor.role} không có quyền thực hiện thao tác này`);
    error.status = 403;
    throw error;
  }
}

function resolvedJql(query) {
  const project = query.get('project') || config.projectKey;
  return query.get('jql') || (project ? `project = "${project}" ${config.defaultJql}` : config.defaultJql);
}

function authHeaders() {
  if (!config.token) return {};
  if (config.authType === 'basic') {
    return { authorization: `Basic ${Buffer.from(`${config.user}:${config.token}`).toString('base64')}` };
  }
  return { authorization: `Bearer ${config.token}` };
}

function ensureConfigured() {
  if (!config.baseUrl || !config.token) throw new Error('Thiếu JIRA_BASE_URL hoặc JIRA_TOKEN trong backend/.env');
}

async function jiraRequest(path, options = {}) {
  ensureConfigured();
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: { accept: 'application/json', ...authHeaders(), ...(options.headers || {}) }
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) {
    const detail = data.errorMessages?.join('; ') || data.message || `HTTP ${response.status}`;
    throw new Error(`Jira trả về lỗi: ${detail}`);
  }
  return data;
}

function normalizeIssue(issue) {
  const fields = issue.fields || {};
  const assignee = fields.assignee;
  const status = fields.status?.name || '';
  const storyPoints = fields[config.storyPointsField];
  return {
    key: issue.key,
    title: fields.summary || '',
    url: `${config.baseUrl}/browse/${issue.key}`,
    member: assignee?.displayName || assignee?.emailAddress || assignee?.name || null,
    accountId: assignee?.accountId || assignee?.key || assignee?.name || null,
    status,
    done: config.doneStatuses.some(x => x.toLowerCase() === status.toLowerCase()),
    storyPoints: Number(storyPoints || 0),
    deadline: fields[config.deadlineField] || fields.duedate || null,
    resolvedAt: fields.resolutiondate || null,
    issueType: fields.issuetype?.name || null
    ,priority: fields.priority?.name || null
    ,labels: Array.isArray(fields.labels) ? fields.labels : []
    ,created: fields.created || null
    ,updated: fields.updated || null
  };
}

async function searchIssues(query) {
  const jql = resolvedJql(query);
  const startAt = Number(query.get('startAt') || 0);
  const maxResults = Math.min(Number(query.get('maxResults') || config.maxResults), 1000);
  const fields = [...new Set(`${config.searchFields},${config.storyPointsField},${config.deadlineField},duedate,resolutiondate`.split(',').map(x => x.trim()).filter(Boolean))].join(',');
  const params = new URLSearchParams({ jql, startAt: String(startAt), maxResults: String(maxResults), fields });
  const data = await jiraRequest(`/rest/api/2/search?${params}`);
  return { startAt: data.startAt || 0, maxResults: data.maxResults || maxResults, total: data.total || 0, issues: (data.issues || []).map(normalizeIssue) };
}

function jiraQualityWarnings(issues) {
  const rules = [
    ['missing_assignee', 'Task chưa có assignee', issue => !issue.accountId],
    ['missing_story_points', 'Task chưa có Story Point', issue => !Number(issue.storyPoints)],
    ['missing_deadline', 'Task chưa có deadline', issue => !issue.deadline],
    ['missing_labels', 'Task chưa có label', issue => !(issue.labels || []).length]
  ];
  return rules.map(([code, label, match]) => {
    const keys = issues.filter(match).map(issue => issue.key);
    return { code, label, count: keys.length, keys: keys.slice(0, 50) };
  }).filter(rule => rule.count);
}

async function syncIssues(query) {
  const limit = Math.min(Number(query.get('maxIssues') || config.maxIssues), 10000);
  const pageSize = Math.min(Number(query.get('maxResults') || config.maxResults), 1000);
  let startAt = Number(query.get('startAt') || 0);
  let total = 0;
  let pages = 0;
  const issues = [];
  while (issues.length < limit) {
    const pageQuery = new URLSearchParams(query);
    pageQuery.set('startAt', String(startAt));
    pageQuery.set('maxResults', String(Math.min(pageSize, limit - issues.length)));
    const page = await searchIssues(pageQuery);
    pages += 1;
    total = page.total;
    issues.push(...page.issues);
    if (!page.issues.length || startAt + page.issues.length >= total) break;
    startAt += page.issues.length;
  }
  return { startAt: Number(query.get('startAt') || 0), maxResults: pageSize, maxIssues: limit, pages, total, issues: issues.slice(0, limit) };
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host}`);
  const actor = actorFrom(req);
  try {
    if (url.pathname === '/api/health') return send(res, 200, { ok: true, jiraConfigured: Boolean(config.baseUrl && config.token), projectKey: config.projectKey, storage: await store.health(), redis: { ok: redisReady } });
    if (url.pathname === '/api/state' && req.method === 'GET') {
      const period = url.searchParams.get('period');
      if (!period) return send(res, 400, { error: 'Thiếu period' });
      return send(res, 200, { period: await store.getPeriod(period) });
    }
    if (url.pathname === '/api/state' && (req.method === 'POST' || req.method === 'PUT')) {
      const body = await readJson(req);
      if (!body.period) return send(res, 400, { error: 'Thiếu period' });
      let nextState = body.state || {};
      if (actor.role === 'Member') {
        const current = (await store.getPeriod(body.period))?.state || {};
        nextState = { ...current, [actor.id]: nextState[actor.id] || current[actor.id] || {} };
      }
      return send(res, 200, { period: await store.savePeriod({ ...body, state: nextState, actor }) });
    }
    if (url.pathname === '/api/users' && req.method === 'GET') {
      requireRole(actor, ['Leader', 'Admin']);
      return send(res, 200, { users: await store.listUsers() });
    }
    if (url.pathname === '/api/users' && req.method === 'POST') {
      requireRole(actor, ['Admin']);
      return send(res, 200, { user: await store.upsertUser(await readJson(req)) });
    }
    if (url.pathname === '/api/audit' && req.method === 'GET') {
      requireRole(actor, ['Leader', 'Admin']);
      return send(res, 200, { logs: await store.listAudit(url.searchParams.get('period'), Math.min(Number(url.searchParams.get('limit') || 200), 1000)) });
    }
    if (url.pathname === '/api/formulas' && req.method === 'GET') {
      return send(res, 200, { versions: await store.listFormulaVersions() });
    }
    if (url.pathname === '/api/formulas' && req.method === 'POST') {
      requireRole(actor, ['Admin']);
      const body = await readJson(req);
      const checksum = createHash('sha256').update(JSON.stringify(body.formula || {})).digest('hex');
      const version = body.version || `formula-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
      return send(res, 200, { formula: await store.createFormulaVersion({ version, formula: body.formula || {}, checksum, actor }) });
    }
    if (url.pathname === '/api/config' && req.method === 'POST') {
      const body = await readJson(req);
      if (body.baseUrl) config.baseUrl = String(body.baseUrl).replace(/\/$/, '');
      if (body.projectKey !== undefined) config.projectKey = String(body.projectKey || '');
      if (body.token) config.token = String(body.token);
      if (body.authType) config.authType = String(body.authType);
      return send(res, 200, { ok: true, jiraConfigured: Boolean(config.baseUrl && config.token), projectKey: config.projectKey, tokenStoredInMemory: Boolean(config.token) });
    }
    if (url.pathname === '/api/jira/test') return send(res, 200, { ok: true, jira: await jiraRequest('/rest/api/2/myself') });
    if (url.pathname === '/api/jira/issues') return send(res, 200, await searchIssues(url.searchParams));
    if (url.pathname === '/api/jira/sync-runs') {
      requireRole(actor, ['Leader', 'Admin']);
      return send(res, 200, { runs: await store.listJiraSyncRuns(Math.min(Number(url.searchParams.get('limit') || 30), 200)) });
    }
    if (url.pathname === '/api/sync') {
      requireRole(actor, ['Leader', 'Admin']);
      const jql = resolvedJql(url.searchParams);
      const startedAt = new Date().toISOString();
      const syncKey = createHash('sha256').update(`${jql}|${startedAt.slice(0, 16)}`).digest('hex');
      const lockKey = `kpi:sync:${syncKey}`;
      if (redisReady) {
        const lock = await redis.set(lockKey, '1', { NX: true, EX: 900 });
        if (lock !== 'OK') throw Object.assign(new Error('Một lượt đồng bộ tương tự đang chạy'), { status: 409 });
      }
      try {
        await store.startJiraSync({ syncKey, jql, startedAt });
        const result = await syncIssues(url.searchParams);
        const warnings = jiraQualityWarnings(result.issues);
        await store.finishJiraSync({ syncKey, total: result.issues.length, warnings });
        return send(res, 200, { syncKey, syncedAt: new Date().toISOString(), ...result, warnings, doneStatuses: config.doneStatuses });
      } finally {
        if (redisReady) await redis.del(lockKey);
      }
    }
    return send(res, 404, { error: 'Not found' });
  } catch (error) {
    return send(res, error.status || 500, { ok: false, error: error.message });
  }
}

http.createServer(handle).listen(config.port, () => {
  console.log(`Backend KPI Jira connector listening on http://localhost:${config.port}`);
});

const shutdown = async signal => {
  console.log(`Shutting down on ${signal}`);
  try { if (redisReady) await redis.quit(); } catch {}
  try { await store.close?.(); } catch {}
  process.exit(0);
};
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
