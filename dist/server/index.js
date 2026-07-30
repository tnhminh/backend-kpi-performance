const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type,x-user-id,x-user-role,authorization'
  }
});

const envText = (env, key, fallback = '') => String(env[key] || fallback).trim();

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS jira_issues (
      issue_key TEXT PRIMARY KEY,
      issue_json TEXT NOT NULL,
      last_synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS evaluation_periods (
      period TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'draft',
      state_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  ]);
}

function jiraHeaders(env) {
  const token = envText(env, 'JIRA_TOKEN');
  if (!token) return { accept: 'application/json' };
  if (envText(env, 'JIRA_AUTH_TYPE', 'pat').toLowerCase() === 'basic') {
    return {
      accept: 'application/json',
      authorization: `Basic ${btoa(`${envText(env, 'JIRA_USER')}:${token}`)}`
    };
  }
  return { accept: 'application/json', authorization: `Bearer ${token}` };
}

async function jiraRequest(env, path) {
  const baseUrl = envText(env, 'JIRA_BASE_URL').replace(/\/$/, '');
  if (!baseUrl || !envText(env, 'JIRA_TOKEN')) {
    throw new Error('Hosting chưa có JIRA_BASE_URL hoặc JIRA_TOKEN');
  }
  const response = await fetch(`${baseUrl}${path}`, { headers: jiraHeaders(env) });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok) {
    throw new Error(data.errorMessages?.join('; ') || data.message || `Jira HTTP ${response.status}`);
  }
  return data;
}

function normalizeIssue(env, issue) {
  const fields = issue.fields || {};
  const assignee = fields.assignee;
  const status = fields.status?.name || '';
  const doneStatuses = envText(env, 'JIRA_DONE_STATUSES', 'Done,Closed,Resolved')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  const storyPointsField = envText(env, 'JIRA_STORY_POINTS_FIELD', 'customfield_10016');
  const deadlineField = envText(env, 'JIRA_DEADLINE_FIELD', 'duedate');
  const baseUrl = envText(env, 'JIRA_BASE_URL').replace(/\/$/, '');
  return {
    key: issue.key,
    title: fields.summary || '',
    url: `${baseUrl}/browse/${issue.key}`,
    member: assignee?.displayName || assignee?.emailAddress || assignee?.name || null,
    accountId: assignee?.accountId || assignee?.key || assignee?.name || null,
    status,
    done: doneStatuses.includes(status.toLowerCase()),
    storyPoints: Number(fields[storyPointsField] || 0),
    deadline: fields[deadlineField] || fields.duedate || null,
    resolvedAt: fields.resolutiondate || null,
    issueType: fields.issuetype?.name || null,
    priority: fields.priority?.name || null,
    labels: Array.isArray(fields.labels) ? fields.labels : [],
    created: fields.created || null,
    updated: fields.updated || null
  };
}

async function syncJira(env, searchParams) {
  const maxIssues = Math.min(Number(searchParams.get('maxIssues') || envText(env, 'JIRA_SYNC_MAX_ISSUES', '1000')), 10000);
  const pageSize = Math.min(Number(searchParams.get('maxResults') || 100), 100);
  const project = envText(env, 'JIRA_PROJECT_KEY');
  const defaultJql = envText(env, 'JIRA_DEFAULT_JQL', 'ORDER BY created DESC');
  const jql = searchParams.get('jql') || (project ? `project = "${project}" ${defaultJql}` : defaultJql);
  const fields = [
    'summary', 'assignee', 'status', 'priority', 'labels', 'issuetype',
    'created', 'updated', 'resolutiondate', 'duedate',
    envText(env, 'JIRA_STORY_POINTS_FIELD', 'customfield_10016'),
    envText(env, 'JIRA_DEADLINE_FIELD', 'duedate')
  ].filter((value, index, all) => value && all.indexOf(value) === index).join(',');
  const issues = [];
  let startAt = 0;
  let total = 0;
  let pages = 0;

  while (issues.length < maxIssues) {
    const params = new URLSearchParams({
      jql,
      startAt: String(startAt),
      maxResults: String(Math.min(pageSize, maxIssues - issues.length)),
      fields
    });
    const page = await jiraRequest(env, `/rest/api/2/search?${params}`);
    const normalized = (page.issues || []).map(issue => normalizeIssue(env, issue));
    issues.push(...normalized);
    pages += 1;
    total = Number(page.total || issues.length);
    if (!normalized.length || startAt + normalized.length >= total) break;
    startAt += normalized.length;
  }

  const syncedAt = await persistIssues(env.DB, issues);
  return { issues, total, pages, syncedAt };
}

async function persistIssues(db, issues) {
  const syncedAt = new Date().toISOString();
  for (let offset = 0; offset < issues.length; offset += 50) {
    await db.batch(issues.slice(offset, offset + 50).map(issue => db.prepare(`
      INSERT INTO jira_issues(issue_key, issue_json, last_synced_at)
      VALUES(?, ?, ?)
      ON CONFLICT(issue_key) DO UPDATE SET
        issue_json=excluded.issue_json,
        last_synced_at=excluded.last_synced_at
    `).bind(issue.key, JSON.stringify(issue), syncedAt)));
  }
  return syncedAt;
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

async function autofillStoryPoints(db, body) {
  const result = await db.prepare(
    'SELECT issue_key,issue_json FROM jira_issues ORDER BY last_synced_at DESC LIMIT 10000'
  ).all();
  const issues = (result.results || []).map(row => JSON.parse(row.issue_json));
  const strategy = String(body.strategy || 'balanced');
  const updatedAt = new Date().toISOString();
  const updates = issues.filter(issue => !Number(issue.storyPoints)).map(issue => ({
    ...issue,
    storyPoints: suggestedStoryPoints(issue, strategy),
    storyPointSource: 'auto-fill',
    storyPointAutofilledAt: updatedAt
  }));
  if (!body.dryRun) {
    for (let offset = 0; offset < updates.length; offset += 50) {
      await db.batch(updates.slice(offset, offset + 50).map(issue => db.prepare(
        'UPDATE jira_issues SET issue_json=?,last_synced_at=? WHERE issue_key=?'
      ).bind(JSON.stringify(issue), updatedAt, issue.key)));
    }
  }
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

async function handleApi(request, env, url) {
  if (!env.DB) return json({ error: 'Hosting chưa được gắn database DB' }, 503);
  await ensureSchema(env.DB);

  if (url.pathname === '/api/health') {
    return json({
      ok: true,
      storage: { ok: true, database: 'D1' },
      jiraConfigured: Boolean(envText(env, 'JIRA_BASE_URL') && envText(env, 'JIRA_TOKEN')),
      projectKey: envText(env, 'JIRA_PROJECT_KEY')
    });
  }
  if (url.pathname === '/api/jira/test') {
    return json({ ok: true, jira: await jiraRequest(env, '/rest/api/2/myself') });
  }
  if (url.pathname === '/api/jira/stored-issues') {
    const limit = Math.min(Number(url.searchParams.get('limit') || 10000), 10000);
    const result = await env.DB.prepare(
      'SELECT issue_json FROM jira_issues ORDER BY last_synced_at DESC LIMIT ?'
    ).bind(limit).all();
    return json({ issues: (result.results || []).map(row => JSON.parse(row.issue_json)) });
  }
  if (url.pathname === '/api/jira/autofill-story-points' && request.method === 'POST') {
    if (request.headers.get('x-user-role') !== 'Admin') return json({ error: 'Chỉ Admin được auto-fill Story Point' }, 403);
    return json(await autofillStoryPoints(env.DB, await request.json()));
  }
  if (url.pathname === '/api/sync') {
    const result = await syncJira(env, url.searchParams);
    return json({ ...result, count: result.issues.length });
  }
  if (url.pathname === '/api/jira/import' && request.method === 'POST') {
    const body = await request.json();
    const issues = Array.isArray(body.issues) ? body.issues.filter(issue => issue?.key) : [];
    if (!issues.length) return json({ error: 'Không có task hợp lệ để import' }, 400);
    const syncedAt = await persistIssues(env.DB, issues.slice(0, 10000));
    return json({ ok: true, count: Math.min(issues.length, 10000), syncedAt });
  }
  if (url.pathname === '/api/state' && request.method === 'GET') {
    const period = url.searchParams.get('period');
    if (!period) return json({ error: 'Thiếu period' }, 400);
    const row = await env.DB.prepare(
      'SELECT period,status,state_json,updated_at FROM evaluation_periods WHERE period=?'
    ).bind(period).first();
    return json({ period: row ? { ...row, state: JSON.parse(row.state_json || '{}') } : null });
  }
  if (url.pathname === '/api/state' && ['POST', 'PUT'].includes(request.method)) {
    const body = await request.json();
    if (!body.period) return json({ error: 'Thiếu period' }, 400);
    await env.DB.prepare(`
      INSERT INTO evaluation_periods(period,status,state_json,updated_at)
      VALUES(?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(period) DO UPDATE SET
        status=excluded.status,
        state_json=excluded.state_json,
        updated_at=CURRENT_TIMESTAMP
    `).bind(body.period, body.status || 'draft', JSON.stringify(body.state || {})).run();
    return json({ ok: true, period: body.period });
  }
  if (url.pathname === '/api/config' && request.method === 'POST') {
    return json({
      ok: true,
      jiraConfigured: Boolean(envText(env, 'JIRA_BASE_URL') && envText(env, 'JIRA_TOKEN')),
      projectKey: envText(env, 'JIRA_PROJECT_KEY'),
      tokenStoredInHosting: Boolean(envText(env, 'JIRA_TOKEN'))
    });
  }
  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return json({}, 204);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
      }
    }
    if (url.pathname === '/' || url.pathname === '') {
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
    }
    return env.ASSETS.fetch(request);
  }
};
