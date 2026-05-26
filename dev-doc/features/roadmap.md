# Feature Roadmap

## Status Guide

- Done = completed and verified
- In Progress = currently being worked on
- Planned = prioritized, not started
- Backlog = deferred

---

## P0 — Critical (1-2 weeks)

- [x] Full project code review → See `dev-doc/reviews/2026-05-27-full-review.md`
- [x] dev-doc documentation system → See `dev-doc/`
- [x] `placeholderImagePath` fix → `plugins/index.ts:504`
- [x] `activeTab126` fix → `useWorkflowState.ts:491`
- [ ] PostgreSQL→SQLite SQL translation fix → See `dev-doc/features/active/code-review-bugs.md`
- [ ] persist() error handling → See `dev-doc/features/active/code-review-bugs.md`
- [ ] Database connection pooling → See `dev-doc/adr/002-per-request-db.md`

## P1 — Developer Experience (2-4 weeks)

- [ ] Backend hot reload → See `dev-doc/features/planned/hot-reload.md`
- [ ] Structured logging system
- [ ] Request validation layer (Zod)
- [ ] Rate limiting on AI endpoints
- [ ] ESLint + Prettier setup
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Vitest unit test framework
- [ ] Route splitting (backend)
- [ ] Plugin file splitting (frontend)
- [ ] useWorkflowState hook splitting

## P2 — ERP Modules (4-8 weeks)

- [ ] Product management → See `dev-doc/features/planned/erp-product-mgmt.md`
- [ ] Purchase management
- [ ] Order management → See `dev-doc/features/planned/order-sync.md`
- [ ] Inventory management

Full ERP spec: `docs/待开发的ERP功能扩展.md`

## P3 — Extended Features (8-16 weeks)

- [ ] Multi-platform integration
- [ ] Advertising management
- [ ] CRM + Review management
- [ ] Data reporting dashboard
- [ ] Workflow branching/parallel execution
- [ ] Incremental auto-update → See `dev-doc/features/active/incremental-update.md`
- [ ] Real e-commerce plugins (replace 6 mocks)
- [ ] Electron crash reporting
