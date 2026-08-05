# RBAC matrix

Backend authorization is authoritative. Hiding a frontend button is only UX and never a security boundary.

| Capability | Member | Leader | Admin |
|---|:---:|:---:|:---:|
| Login/logout/session | Yes | Yes | Yes |
| Read period state | Yes | Yes | Yes |
| Update own member state | Yes | — | — |
| Update team/member evaluation | No | Yes, scoped | Yes |
| Submit period | Yes | Yes | Yes |
| Approve period | No | Yes | Yes |
| Lock period/create snapshot | No | No | Yes |
| Read users | No | Yes | Yes |
| Create/update/reset user | No | No | Yes |
| Read audit/snapshot | No | Yes | Yes |
| Create formula version | No | No | Yes |
| Jira sync/history | No | Yes | Yes |
| Configure Jira runtime | Authenticated | Authenticated | Authenticated |
| Story Point autofill | No | No | Yes |

## Workflow transitions

| From | To | Minimum role |
|---|---|---|
| draft | submitted | Member |
| submitted | approved | Leader |
| approved | locked | Admin |
| locked | locked | Admin/read-only save semantics |

Invalid transitions return HTTP 409. Insufficient role returns HTTP 403.

## Review note

The current `/api/config` endpoint accepts any authenticated user. Before broad production rollout, decide whether Jira runtime configuration must be Admin-only and update code/tests/docs together.
