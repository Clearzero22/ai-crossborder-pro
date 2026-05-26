# Bug Fixes Round 1

## Status: Done

## Completed: 2026-05-27

## Description

First round of critical bug fixes identified during code review.

## Fixes Applied

| Fix | File | Line | Change |
|-----|------|------|--------|
| `placeholderImagePath` undefined | `plugins/index.ts` | 504, 531 | Defined the constant |
| `activeTab126` typo | `useWorkflowState.ts` | 491 | Fixed to `activeTab` |
| HTTP redirect config | `browser-config.ts` | — | Fixed redirect handling |

## Verification

- `npm run build` passes after these fixes
- AI optimize node no longer throws runtime error

## Related

- Review: `dev-doc/reviews/2026-05-27-full-review.md`
- Remaining bugs: `dev-doc/features/active/code-review-bugs.md`
