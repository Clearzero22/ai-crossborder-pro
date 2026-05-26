# Code Review Bug Fixes

## Status: In Progress

## Description

Fix critical and high-severity bugs identified in the 2026-05-27 full code review.

## Scope

See `dev-doc/reviews/2026-05-27-full-review.md` for the complete issue list.

## Bugs to Fix

### Already Fixed

| # | Bug | File:Line | Fix |
|---|-----|-----------|-----|
| 1 | `placeholderImagePath` undefined (build failure) | `plugins/index.ts:504,531` | Define the constant |
| 2 | `activeTab126` typo (runtime error) | `useWorkflowState.ts:491` | Fix to `activeTab` |

### Pending

| # | Bug | Severity | File:Line | Fix |
|---|-----|----------|-----------|-----|
| 3 | PostgreSQL syntax in SQLite mode (`$7::jsonb`) | CRITICAL | `database-service.ts:72` | Update `sql-helpers.ts` regex |
| 4 | persist() swallows errors silently | CRITICAL | `useWorkflowState.ts:346,491,570` | Add try/catch + user notification |
| 5 | Per-request DB create/destroy | HIGH | `api-server.ts` (25+ routes) | Singleton DB instance |

## Related

- Review: `dev-doc/reviews/2026-05-27-full-review.md`
- Bug list: `docs/待修复解决的问题/待修复解决问题.md`
- Roadmap: `dev-doc/features/roadmap.md`
