# Full Code Review — 2026-05-27

## Summary

Full code review covering security, architecture, business logic, and frontend quality. **60 issues found** across 4 severity levels.

---

## Severity Distribution

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 11 | 3 fixed, 8 open |
| HIGH | 18 | 0 fixed, 18 open |
| MEDIUM | 21 | 0 fixed, 21 open |
| LOW | 10 | 0 fixed, 10 open |

---

## CRITICAL Issues

### Security (5 CRITICAL)

1. **Zero authentication** on all 30+ API endpoints — any LAN device can access everything
   - File: `api-server.ts`
   - Impact: Data leakage, unauthorized operations, credential exposure

2. **Command injection in browser-config.ts** — user-controlled paths passed to shell
   - File: `packages/backend/src/core/browser-config.ts:495-518`
   - Impact: Remote code execution

3. **Arbitrary file read via /api/gemini/upload** — `filePath` parameter not validated
   - File: `api-server.ts:686`
   - Impact: Read any file on the filesystem

4. **Hardcoded database password** — `crawler_pass` in source code
   - File: `packages/backend/src/core/database-service.ts:12`
   - Impact: Default credential exposure

5. **forceDevUpdateConfig in production** — allows testing update endpoints
   - File: `packages/electron/electron/updater.ts`
   - Impact: Update mechanism tampering

### Build/Compile (3 CRITICAL)

6. **`placeholderImagePath` undefined** — causes build failure (TS2304)
   - File: `packages/frontend/src/plugins/index.ts:504,531`
   - Impact: `npm run build` fails

7. **`activeTab126` typo** — references non-existent state key
   - File: `packages/frontend/src/hooks/useWorkflowState.ts:491`
   - Impact: Runtime error during AI optimize execution

8. **PostgreSQL syntax in SQLite mode** — `$7::jsonb` not properly translated
   - File: `packages/backend/src/core/database-service.ts:72`
   - Impact: Database write operations fail in SQLite mode

### Business Logic (3 CRITICAL)

9. **persist() swallows errors silently** — database write failures invisible to user
   - File: `useWorkflowState.ts:346,491,570`
   - Impact: Data loss without notification

10. **WorkflowEngine linear-only execution** — no branching, no parallel, no loops
    - File: `packages/frontend/src/engine/WorkflowEngine.ts`
    - Impact: Limited workflow capabilities

11. **6 e-commerce plugins return mock data** — open-shopify, extract-info, fill-info, upload-images, publish, send-email
    - File: `packages/frontend/src/plugins/index.ts`
    - Impact: Core product listing workflow is non-functional

---

## HIGH Issues

### Architecture (7 HIGH)

12. `api-server.ts` is 1505 lines — needs route splitting
13. `plugins/index.ts` is 1785 lines — needs per-plugin files
14. `useWorkflowState.ts` is 643 lines god hook — needs splitting into 5-6 hooks
15. Dual AI architecture confusion — legacy `AiVisionService` vs new `ai-providers/`
16. No error tracking (no Sentry, no structured logging)
17. No request validation framework (manual JSON checks)
18. No rate limiting on AI endpoints

### Security (4 HIGH)

19. API keys returned via unauthenticated endpoints (GET /api/settings/ai-keys)
20. No CORS origin restriction in production
21. No CSRF protection
22. Debug details leaked in error responses

### Business Logic (4 HIGH)

23. Stale closure bugs in useWorkflowState — lines 346, 491, 570
24. WorkflowEngine step index corruption on node error
25. No transaction support for batch DB writes
26. No retry logic for failed AI API calls

### Performance (3 HIGH)

27. Per-request DB create/destroy (25+ routes)
28. No browser instance pooling (Playwright)
29. No response caching

---

## MEDIUM Issues

- Frontend: no loading states on API calls (3)
- Frontend: no error boundaries (1)
- Frontend: large bundle (no code splitting) (1)
- Backend: SQL translation edge cases in sql-helpers.ts (3)
- Backend: missing PostgreSQL init tables (settings, profiles) (1)
- Backend: no database migration system (1)
- Backend: test scripts not integrated (25+ standalone scripts) (1)
- Backend: no WebSocket support for real-time updates (1)
- Electron: extraResources not updated by auto-update (1)
- Electron: no crash reporting (1)
- Electron: no logging to file (1)
- General: no CI/CD pipeline (1)
- General: no linting config (ESLint/Prettier) (1)
- General: inconsistent error response format (1)

---

## LOW Issues

- Missing JSDoc on public APIs
- Inconsistent naming conventions (camelCase vs snake_case in DB)
- No .editorconfig
- No CONTRIBUTING.md
- No changelog
- Unused imports in some files
- Console.log statements in production code
- No TypeScript strict null checks in all files
- Missing loading spinners
- Inconsistent button styling

---

## Fixed Issues

| # | Issue | Fix Date |
|---|-------|----------|
| 6 | `placeholderImagePath` undefined | 2026-05-27 |
| 7 | `activeTab126` typo | 2026-05-27 |
| 5 | HTTP redirect configuration | 2026-05-27 |

---

## Related Documents

- `docs/待修复解决的问题/待修复解决问题.md` — 27 business logic bugs
- `dev-doc/arch/` — Architecture documentation
- `dev-doc/features/roadmap.md` — Fix prioritization
