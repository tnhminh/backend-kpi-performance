import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const client = path.join(root, 'dist', 'client');
const server = path.join(root, 'dist', 'server');
const hosting = path.join(root, 'dist', '.openai');
const staticFiles = [
  'index.html',
  'app.js',
  'styles.css',
  'tour-fix.js',
  'tour-fix.css',
  'production-fixes.js',
  'jira-mapping.js',
  'jira-fields.js',
  'motion-effects.js',
  'production-suite.js',
  'jira-filters.js',
  'jira-task-filters.js',
  'evaluation-tasks.js',
  'evaluation-formulas.js'
];

mkdirSync(client, { recursive: true });
mkdirSync(server, { recursive: true });
mkdirSync(hosting, { recursive: true });
for (const file of staticFiles) cpSync(path.join(root, file), path.join(client, file));
cpSync(path.join(root, '.openai', 'hosting.json'), path.join(hosting, 'hosting.json'));

writeFileSync(path.join(server, 'index.js'), `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "") {
      return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    }
    return env.ASSETS.fetch(request);
  }
};
`);

console.log(`Built ${staticFiles.length} frontend assets for Sites.`);
