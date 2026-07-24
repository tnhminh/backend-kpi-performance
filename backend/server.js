import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { URL } from 'node:url';

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
  defaultJql: process.env.JIRA_DEFAULT_JQL || 'ORDER BY created DESC'
};

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(payload);
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
  };
}

async function searchIssues(query) {
  const project = query.get('project') || config.projectKey;
  const jql = query.get('jql') || (project ? `project = "${project}" ${config.defaultJql}` : config.defaultJql);
  const startAt = Number(query.get('startAt') || 0);
  const maxResults = Math.min(Number(query.get('maxResults') || config.maxResults), 1000);
  const params = new URLSearchParams({ jql, startAt: String(startAt), maxResults: String(maxResults), fields: `summary,assignee,status,${config.storyPointsField},${config.deadlineField},duedate,resolutiondate,issuetype` });
  const data = await jiraRequest(`/rest/api/2/search?${params}`);
  return { startAt: data.startAt || 0, maxResults: data.maxResults || maxResults, total: data.total || 0, issues: (data.issues || []).map(normalizeIssue) };
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/health') return send(res, 200, { ok: true, jiraConfigured: Boolean(config.baseUrl && config.token), projectKey: config.projectKey });
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
    if (url.pathname === '/api/sync') {
      const result = await searchIssues(url.searchParams);
      return send(res, 200, { syncedAt: new Date().toISOString(), ...result, doneStatuses: config.doneStatuses });
    }
    return send(res, 404, { error: 'Not found' });
  } catch (error) {
    return send(res, 500, { ok: false, error: error.message });
  }
}

http.createServer(handle).listen(config.port, () => {
  console.log(`Backend KPI Jira connector listening on http://localhost:${config.port}`);
});
