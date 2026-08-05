import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const client = path.join(root, 'dist', 'client');
const server = path.join(root, 'dist', 'server');
const hosting = path.join(root, 'dist', '.openai');
const migrations = path.join(root, 'drizzle');
const staticFiles = [
  'index.html',
  'app.js',
  'mock-jira-data.js',
  'reconciliation.js',
  'users-admin.js',
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
  'evaluation-formulas.js',
  'delivery-scoring.js',
  'comparison-formula.js',
  'jira-storypoint-autofill.js',
  'local-api-fix.js',
  'auth-ui.js'
];

mkdirSync(client, { recursive: true });
mkdirSync(server, { recursive: true });
mkdirSync(hosting, { recursive: true });
for (const file of staticFiles) cpSync(path.join(root, file), path.join(client, file));
cpSync(path.join(root, '.openai', 'hosting.json'), path.join(hosting, 'hosting.json'));
cpSync(migrations, path.join(hosting, 'drizzle'), { recursive: true });

cpSync(path.join(root, 'sites-worker.js'), path.join(server, 'index.js'));

console.log(`Built ${staticFiles.length} frontend assets for Sites.`);
