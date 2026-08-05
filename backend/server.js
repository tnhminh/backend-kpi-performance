import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { URL } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { createPostgresStore } from './store-postgres.js';
import { createClient } from 'redis';
import { hashPassword, readCookie, signJwt, verifyJwt, verifyPassword } from './auth.js';

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
  syncIntervalMinutes: Number(process.env.JIRA_SYNC_INTERVAL_MINUTES || 0),
  databasePath: process.env.DB_PATH || undefined,
  appOrigins: (process.env.APP_ORIGIN || 'http://localhost:5175,http://127.0.0.1:5175').split(',').map(value => value.trim()).filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || randomBytes(32).toString('base64url'),
  jwtTtlSeconds: Number(process.env.JWT_TTL_SECONDS || 60 * 60 * 8),
  bootstrapEmail: String(process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  bootstrapPassword: String(process.env.ADMIN_PASSWORD || '')
};
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('JWT_SECRET is required in production');
const store = process.env.DB_DRIVER === 'postgres'
  ? await createPostgresStore(process.env.DATABASE_URL)
  : (await import('./store.js')).createStore(config.databasePath);
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
let redisReady = false;
let localSyncActive = false;
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

function send(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  const requestOrigin = res.req?.headers.origin;
  const allowedOrigin = config.appOrigins.includes(requestOrigin) ? requestOrigin : config.appOrigins[0];
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    ...extraHeaders
  });
  res.end(payload);
}

async function bootstrapAdmin() {
  if (!config.bootstrapEmail || !config.bootstrapPassword) return;
  const existing = await store.findAuthUserByEmail(config.bootstrapEmail);
  if (existing) return;
  if (config.bootstrapPassword.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  const id = `admin-${createHash('sha256').update(config.bootstrapEmail).digest('hex').slice(0, 16)}`;
  await store.upsertUser({
    id,
    email: config.bootstrapEmail,
    displayName: 'System Admin',
    role: 'Admin',
    passwordHash: hashPassword(config.bootstrapPassword)
  });
  console.log(`Bootstrapped admin account: ${config.bootstrapEmail}`);
}

await bootstrapAdmin();

async function actorFrom(req) {
  const payload = verifyJwt(readCookie(req.headers.cookie, 'kpi_session'), config.jwtSecret);
  if (!payload?.sub) return null;
  const user = await store.findUserById(payload.sub);
  return user ? { id: user.id, role: user.role, email: user.email, name: user.display_name } : null;
}

function requireAuth(actor) {
  if (!actor) throw Object.assign(new Error('Bạn cần đăng nhập để tiếp tục'), { status: 401 });
  return actor;
}

function requireRole(actor, allowed) {
  requireAuth(actor);
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
  const maxAttempts = Math.max(1, Number(process.env.JIRA_RETRY_ATTEMPTS || 3));
  let response;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.JIRA_REQUEST_TIMEOUT_MS || 15000));
    try {
      response = await fetch(`${config.baseUrl}${path}`, {
        ...options,
        signal: options.signal || controller.signal,
        headers: { accept: 'application/json', ...authHeaders(), ...(options.headers || {}) }
      });
    } catch (error) {
      if (attempt >= maxAttempts) throw new Error(`Không thể kết nối Jira sau ${attempt} lần thử: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
      continue;
    } finally { clearTimeout(timeout); }
    if (response.ok || ![408, 429, 500, 502, 503, 504].includes(response.status) || attempt >= maxAttempts) break;
    const retryAfter = Number(response.headers.get('retry-after') || 0);
    await new Promise(resolve => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** (attempt - 1)));
  }
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

async function runScheduledSync() {
  if (!config.syncIntervalMinutes || !config.baseUrl || !config.token) return;
  const query = new URLSearchParams({ jql: config.defaultJql, maxIssues: String(config.maxIssues), maxResults: String(config.maxResults) });
  const startedAt = new Date().toISOString();
  const syncKey = createHash('sha256').update(`scheduled|${startedAt.slice(0, 16)}`).digest('hex');
  try {
    await store.startJiraSync({ syncKey, jql: resolvedJql(query), startedAt });
    const result = await syncIssues(query);
    const warnings = jiraQualityWarnings(result.issues);
    await store.upsertJiraIssues(result.issues, syncKey);
    await store.finishJiraSync({ syncKey, total: result.issues.length, warnings });
    console.log(`Scheduled Jira sync completed: ${result.issues.length} issues`);
  } catch (error) {
    await store.finishJiraSync({ syncKey, total: 0, warnings: [{ code: 'sync_failed', label: error.message, count: 1, keys: [] }] }).catch(() => {});
    console.error(`Scheduled Jira sync failed: ${error.message}`);
  }
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

function suggestedStoryPoints(issue, strategy = 'balanced') {
  const fixed = Number(strategy);
  if ([1, 2, 3, 5, 8].includes(fixed)) return fixed;
  const type = String(issue.issueType || '').toLowerCase();
  const title = String(issue.title || '').toLowerCase();
  if (type.includes('epic')) return 8;
  if (type.includes('story') || type.includes('feature')) return 5;
  if (type.includes('sub-task') || type.includes('subtask') || type.includes('support') || type.includes('maintain')) return 2;
  if (type.includes('bug') || type.includes('task')) return 3;
  if (/\b(epic|migration|refactor|integration)\b/.test(title)) return 5;
  if (/\b(doc|config|support|maintain)\b/.test(title)) return 2;
  return 3;
}

async function autofillStoryPoints(body, actor) {
  requireRole(actor, ['Admin']);
  const strategy = String(body.strategy || 'balanced');
  const issues = await store.listJiraIssues(10000);
  const missing = issues.filter(issue => !Number(issue.storyPoints));
  const updatedAt = new Date().toISOString();
  const updates = missing.map(issue => ({
    ...issue,
    storyPoints: suggestedStoryPoints(issue, strategy),
    storyPointSource: 'auto-fill',
    storyPointAutofilledAt: updatedAt
  }));
  if (!body.dryRun && updates.length) await store.updateJiraIssues(updates);
  return {
    ok: true,
    dryRun: Boolean(body.dryRun),
    strategy,
    total: issues.length,
    eligible: updates.length,
    updated: body.dryRun ? 0 : updates.length,
    skipped: issues.length - updates.length,
    sample: updates.slice(0, 8).map(issue => ({
      key: issue.key,
      issueType: issue.issueType,
      storyPoints: issue.storyPoints
    }))
  };
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host}`);
  const actor = await actorFrom(req);
  try {
    if (url.pathname === '/api/health') return send(res, 200, { ok: true, jiraConfigured: Boolean(config.baseUrl && config.token), projectKey: config.projectKey, storage: await store.health(), redis: { ok: redisReady } });
    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await readJson(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const user = email ? await store.findAuthUserByEmail(email) : null;
      if (!user || !verifyPassword(password, user.password_hash)) throw Object.assign(new Error('Email hoặc mật khẩu không đúng'), { status: 401 });
      const token = signJwt({ sub: user.id }, config.jwtSecret, config.jwtTtlSeconds);
      const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
      return send(res, 200, { user: { id: user.id, email: user.email, name: user.display_name, role: user.role } }, { 'set-cookie': `kpi_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${config.jwtTtlSeconds}${secure}` });
    }
    if (url.pathname === '/api/auth/logout' && req.method === 'POST') return send(res, 200, { ok: true }, { 'set-cookie': 'kpi_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
    if (url.pathname === '/api/auth/me' && req.method === 'GET') {
      requireAuth(actor);
      return send(res, 200, { user: { id: actor.id, email: actor.email, name: actor.name, role: actor.role } });
    }
    requireAuth(actor);
    if (url.pathname === '/api/state' && req.method === 'GET') {
      const period = url.searchParams.get('period');
      if (!period) return send(res, 400, { error: 'Thiếu period' });
      return send(res, 200, { period: await store.getPeriod(period) });
    }
    if (url.pathname === '/api/state' && (req.method === 'POST' || req.method === 'PUT')) {
      const body = await readJson(req);
      if (!body.period) return send(res, 400, { error: 'Thiếu period' });
      const existingPeriod = await store.getPeriod(body.period);
      const previousStatus = existingPeriod?.status || 'draft';
      const nextStatus = body.status || previousStatus;
      const allowedTransitions = { draft: ['draft', 'submitted'], submitted: ['submitted', 'approved'], approved: ['approved', 'locked'], locked: ['locked'] };
      if (!(allowedTransitions[previousStatus] || []).includes(nextStatus)) return send(res, 409, { error: `Không thể chuyển trạng thái từ ${previousStatus} sang ${nextStatus}` });
      if (nextStatus === 'submitted') requireRole(actor, ['Member', 'Leader', 'Admin']);
      if (nextStatus === 'approved') requireRole(actor, ['Leader', 'Admin']);
      if (nextStatus === 'locked') requireRole(actor, ['Admin']);
      if (previousStatus === 'locked' && nextStatus === 'locked' && actor.role !== 'Admin') requireRole(actor, ['Admin']);
      let nextState = body.state || {};
      if (actor.role === 'Member') {
        const current = (await store.getPeriod(body.period))?.state || {};
        nextState = { ...current, [actor.id]: nextState[actor.id] || current[actor.id] || {} };
      }
      const period = await store.savePeriod({ ...body, status: nextStatus, state: nextState, actor });
      let snapshot = null;
      if (nextStatus === 'locked' && previousStatus !== 'locked') {
        const snapshotPayload = body.snapshot || { period: body.period, status: 'locked', state: nextState, formula: body.formula || null, createdAt: new Date().toISOString() };
        const checksum = createHash('sha256').update(JSON.stringify(snapshotPayload)).digest('hex');
        snapshot = await store.createSnapshot({ period: body.period, snapshot: snapshotPayload, checksum, actor });
      }
      return send(res, 200, { period, snapshot });
    }
    if (url.pathname === '/api/users' && req.method === 'GET') {
      requireRole(actor, ['Leader', 'Admin']);
      return send(res, 200, { users: await store.listUsers() });
    }
    if (url.pathname === '/api/users' && req.method === 'POST') {
      requireRole(actor, ['Admin']);
      const body = await readJson(req);
      if (!body.id || !body.email || !body.displayName || !body.role) return send(res, 400, { error: 'Thiếu id, email, displayName hoặc role' });
      if (body.password && String(body.password).length < 12) return send(res, 400, { error: 'Mật khẩu phải có ít nhất 12 ký tự' });
      return send(res, 200, { user: await store.upsertUser({ ...body, passwordHash: body.password ? hashPassword(String(body.password)) : undefined }) });
    }
    const userPasswordMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/password$/);
    if (userPasswordMatch && req.method === 'POST') {
      requireRole(actor, ['Admin']);
      const body = await readJson(req);
      if (String(body.password || '').length < 12) return send(res, 400, { error: 'Mật khẩu phải có ít nhất 12 ký tự' });
      return send(res, 200, { user: await store.updateUserPassword(decodeURIComponent(userPasswordMatch[1]), hashPassword(String(body.password))) });
    }
    const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && req.method === 'PATCH') {
      requireRole(actor, ['Admin']);
      const body = await readJson(req);
      const existing = await store.findUserById(decodeURIComponent(userMatch[1]));
      if (!existing) return send(res, 404, { error: 'Không tìm thấy user' });
      return send(res, 200, { user: await store.upsertUser({ ...existing, id: existing.id, displayName: body.displayName || existing.name || existing.display_name, role: body.role || existing.role, team: body.team ?? existing.team, active: body.active !== undefined ? body.active : existing.active }) });
    }
    if (url.pathname === '/api/audit' && req.method === 'GET') {
      requireRole(actor, ['Leader', 'Admin']);
      return send(res, 200, { logs: await store.listAudit(url.searchParams.get('period'), Math.min(Number(url.searchParams.get('limit') || 200), 1000)) });
    }
    if (url.pathname === '/api/snapshots' && req.method === 'GET') {
      requireRole(actor, ['Leader', 'Admin']);
      const period = url.searchParams.get('period');
      if (!period) return send(res, 400, { error: 'Thiếu period' });
      return send(res, 200, { snapshot: await store.getSnapshot(period) });
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
    if (url.pathname === '/api/jira/stored-issues') return send(res, 200, { issues: await store.listJiraIssues(Math.min(Number(url.searchParams.get('limit') || 10000), 10000)) });
    if (url.pathname === '/api/jira/autofill-story-points' && req.method === 'POST') {
      return send(res, 200, await autofillStoryPoints(await readJson(req), actor));
    }
    if (url.pathname === '/api/jira/sync-runs') {
      requireRole(actor, ['Leader', 'Admin']);
      return send(res, 200, { runs: await store.listJiraSyncRuns(Math.min(Number(url.searchParams.get('limit') || 30), 200)) });
    }
    if (url.pathname === '/api/sync') {
      requireRole(actor, ['Leader', 'Admin']);
      if (localSyncActive) throw Object.assign(new Error('Một lượt đồng bộ tương tự đang chạy'), { status: 409 });
      localSyncActive = true;
      const jql = resolvedJql(url.searchParams);
      const startedAt = new Date().toISOString();
      const syncKey = createHash('sha256').update(`${jql}|${startedAt.slice(0, 16)}`).digest('hex');
      const lockKey = `kpi:sync:${syncKey}`;
      if (redisReady) {
        const lock = await redis.set(lockKey, '1', { NX: true, EX: 900 });
        if (lock !== 'OK') { localSyncActive = false; throw Object.assign(new Error('Một lượt đồng bộ tương tự đang chạy'), { status: 409 }); }
      }
      try {
        await store.startJiraSync({ syncKey, jql, startedAt });
        const result = await syncIssues(url.searchParams);
        const warnings = jiraQualityWarnings(result.issues);
        await store.upsertJiraIssues(result.issues, syncKey);
        await store.finishJiraSync({ syncKey, total: result.issues.length, warnings });
        return send(res, 200, { syncKey, syncedAt: new Date().toISOString(), ...result, warnings, doneStatuses: config.doneStatuses });
      } finally {
        if (redisReady) await redis.del(lockKey);
        localSyncActive = false;
      }
    }
    return send(res, 404, { error: 'Not found' });
  } catch (error) {
    return send(res, error.status || 500, { ok: false, error: error.message });
  }
}

http.createServer(handle).listen(config.port, () => {
  console.log(`Backend KPI Jira connector listening on http://localhost:${config.port}`);
  if (config.syncIntervalMinutes > 0) {
    const intervalMs = config.syncIntervalMinutes * 60 * 1000;
    setTimeout(() => void runScheduledSync(), 1000);
    setInterval(() => void runScheduledSync(), intervalMs);
    console.log(`Scheduled Jira sync enabled every ${config.syncIntervalMinutes} minute(s)`);
  }
});

const shutdown = async signal => {
  console.log(`Shutting down on ${signal}`);
  try { if (redisReady) await redis.quit(); } catch {}
  try { await store.close?.(); } catch {}
  process.exit(0);
};
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
