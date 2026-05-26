# ADR-001: No Router Library (State-Based Navigation)

## Status: Accepted

## Context

The frontend application uses a client-side navigation system without any router library (no react-router, no wouter, no reach-router). Navigation is managed via a `navActiveId` state variable in the central `useWorkflowState` hook, with a simple `switch` statement in `App.tsx`.

## Decision

Continue using state-based navigation. Do not introduce a router library.

## Reasons

1. **Simplicity:** The app has only 12 pages and no URL-based routing requirements (it runs inside Electron)
2. **No deep linking needed:** Electron apps don't have URLs that users bookmark or share
3. **No browser history needed:** Users navigate via sidebar, not browser back/forward
4. **Single-page feel:** The workflow editor is the primary view; other pages are secondary
5. **Bundle size:** Avoid adding a router dependency for minimal benefit

## Consequences

### Positive
- Zero dependency overhead
- Simple to understand and maintain
- No route configuration complexity
- No URL parsing edge cases

### Negative
- Cannot deep-link to specific pages
- No browser back/forward support
- No route-based code splitting (all pages load upfront)
- No URL query parameters for state

### Migration Path (if needed)
If deep linking or URL state becomes necessary:
```typescript
// Replace navActiveId switch with react-router
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Wrap App in <BrowserRouter>
// Replace switch with <Route path="/workflow" element={<WorkflowPage />} />
```
Estimated effort: 2-4 hours.
