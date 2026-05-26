# Development Roadmap

## Priority System

| Priority | Timeline | Description |
|----------|----------|-------------|
| **P0** | 1-2 weeks | Critical fixes that block normal usage |
| **P1** | 2-4 weeks | Important improvements for developer experience |
| **P2** | 4-8 weeks | New ERP modules (core business value) |
| **P3** | 8-16 weeks | Extended features and platform expansion |

## Status Legend

- Done = completed and verified
- In Progress = currently being worked on
- Planned = not started, prioritized
- Backlog = deferred, lower priority

---

## P0 — Critical Fixes

| Feature | Status | Effort | Details |
|---------|--------|--------|---------|
| Full code review | Done | 8h | Security + architecture + business logic (60 issues) |
| dev-doc documentation | Done | 4h | Complete developer documentation system |
| `placeholderImagePath` fix | Done | 15m | plugins/index.ts:504 |
| `activeTab126` fix | Done | 15m | useWorkflowState.ts:491 |
| PostgreSQL→SQLite SQL translation | Planned | 2h | database-service.ts $7::jsonb |
| persist() error handling | Planned | 2h | useWorkflowState.ts silent failures |
| Database connection pooling | Planned | 3h | Per-request create/destroy → singleton |

## P1 — Developer Experience

| Feature | Status | Effort | Details |
|---------|--------|--------|---------|
| Backend hot reload | Planned | 1h | `tsx watch` in dev:backend script |
| Structured logging | Planned | 3h | Replace console.log with structured logger |
| Request validation (Zod) | Planned | 4h | Validate all API request bodies |
| Rate limiting (AI endpoints) | Planned | 2h | Prevent API key abuse |
| Linting setup (ESLint + Prettier) | Planned | 2h | Consistent code style |
| CI/CD pipeline | Planned | 4h | GitHub Actions: lint, build, test |
| Unit test framework (Vitest) | Planned | 4h | WorkflowEngine, SQL helpers, API endpoints |
| Route splitting (backend) | Planned | 3h | api-server.ts 1505 lines → route files |
| Plugin file splitting | Planned | 3h | plugins/index.ts 1785 lines → per-plugin |
| useWorkflowState splitting | Planned | 3h | 643 lines → 5-6 focused hooks |

## P2 — ERP Core Modules

| Feature | Status | Effort | Details |
|---------|--------|--------|---------|
| Product management | Planned | 40h | CRUD, categories, attributes, images |
| Purchase management | Planned | 40h | Suppliers, PO tracking |
| Order management | Planned | 40h | Multi-platform order sync |
| Inventory management | Planned | 30h | Stock tracking, low-stock alerts |

See `docs/待开发的ERP功能扩展.md` for full ERP spec.

## P3 — Extended Features

| Feature | Status | Effort | Details |
|---------|--------|--------|---------|
| Multi-platform integration | Planned | 60h | Amazon, Shopify, eBay, TikTok Shop |
| Advertising management | Planned | 40h | PPC campaign tracking |
| CRM + Review management | Planned | 30h | Customer reviews, response automation |
| Data reporting dashboard | Planned | 30h | Sales analytics, KPI tracking |
| Workflow branching/parallel | Planned | 20h | Conditional execution, parallel steps |
| Incremental auto-update | Planned | 14h | Hot-update frontend + backend code |
| Real mock e-commerce plugins | Planned | 40h | Replace 6 mock nodes with real implementations |
| Electron crash reporting | Planned | 4h | Sentry or Crashpad integration |

---

## Technical Debt

| Item | Severity | Effort | Status |
|------|----------|--------|--------|
| Dual AI architecture (legacy + new) | HIGH | 8h | Planned |
| Zero API authentication | CRITICAL | 6h | Planned |
| No database migration system | MEDIUM | 4h | Planned |
| Missing PG init tables (settings, profiles) | MEDIUM | 1h | Planned |
| No code splitting (frontend) | LOW | 4h | Backlog |
| Test scripts not integrated | MEDIUM | 8h | Backlog |

---

## Estimated Total Effort

| Priority | Weeks | Notes |
|----------|-------|-------|
| P0 | 1-2 weeks | Critical path items |
| P1 | 2-4 weeks | Developer experience |
| P2 | 8-16 weeks | Core ERP modules |
| P3 | 16-32 weeks | Extended features |
| **Total** | **27-54 weeks** | Depending on team size |

---

## Links

- Feature details: `dev-doc/features/`
- ERP spec: `docs/待开发的ERP功能扩展.md`
- Bug list: `docs/待修复解决的问题/待修复解决问题.md`
- Architecture: `dev-doc/arch/`
- API reference: `dev-doc/reference/api-endpoints.md`
