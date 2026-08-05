# KPI and Jira data dictionary

## Core KPI concepts

| Field | Source | Meaning |
|---|---|---|
| `period` | UI/API | Evaluation month in `YYYY-MM` |
| `status` | Backend workflow | draft/submitted/approved/locked |
| `scores[]` | Evaluator | Achieved score for each criterion |
| criterion max | Criteria config | Maximum/weight for a criterion |
| `base` | Calculated | `sum(achieved) / sum(max) * 10` |
| `bonus` | Calculated/config | Reward or penalty additions |
| `score` | Calculated | Final score, bounded by application rules |
| `grade` | Calculated | A+ through E |
| `coefficient` | Calculated | KPI coefficient from grade thresholds |
| `taskLinks` | Evaluator | Jira keys selected as evidence per criterion |

## Normalized Jira issue

| Field | Jira source | KPI use |
|---|---|---|
| `key` | issue key | Stable evidence ID |
| `title` | `summary` | Human-readable evidence |
| `url` | Jira base + key | Trace back to Jira |
| `member` | assignee display/name/email | Mapping fallback |
| `accountId` | assignee accountId/key/name | Preferred member mapping |
| `status` | status.name | Progress display |
| `done` | configured Done statuses | Completion metric |
| `storyPoints` | configured custom field | Effort metric |
| `deadline` | configured deadline/duedate | On-time metric |
| `resolvedAt` | resolutiondate | Deadline comparison |
| `issueType` | issuetype.name | Filtering/reporting |
| `priority` | priority.name | Filtering/reporting |
| `labels` | labels | Scope/filtering |
| `created`, `updated` | Jira timestamps | Period filtering/audit |

## Data quality rules

- Missing `accountId/member`: task cannot be reliably mapped.
- Missing/zero Story Point: excluded or shown as zero effort; warning is raised.
- Missing deadline: cannot prove on-time delivery; warning is raised.
- Unknown Done status: task may be counted as open; update `JIRA_DONE_STATUSES`.
- Duplicate issue key: database upsert keeps one latest record.

## Mapping priority

1. Exact internal member ID/account ID mapping.
2. Normalized assignee name fallback.
3. Unmapped warning; do not silently assign to another member.

## Source-of-truth note

Jira remains source of truth for issue facts. Backend database stores the latest synchronized representation. Locked KPI snapshots preserve the facts and formula used at lock time even if Jira changes later.
