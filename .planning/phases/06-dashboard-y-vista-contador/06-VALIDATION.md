---
phase: 6
slug: dashboard-y-vista-contador
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (installed in Phase 2) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-W0 | 01 | 0 | DASH-01..03 | setup | Create `lib/queries/dashboard.test.ts` | ❌ W0 | ⬜ pending |
| 6-01-01 | 01 | 1 | DASH-01, DASH-02, DASH-03 | unit | `npx vitest run lib/queries/dashboard.test.ts` | ❌ W0 | ⬜ pending |
| 6-01-02 | 01 | 1 | DASH-01..03 | type-check | `npx tsc --noEmit 2>&1 \| head -20` | ✅ | ⬜ pending |
| 6-02-01 | 02 | 2 | DASH-04, DASH-05 | unit | `npx vitest run lib/queries/dashboard.test.ts` | ❌ W0 | ⬜ pending |
| 6-02-02 | 02 | 2 | DASH-04, DASH-05 | type-check | `npx tsc --noEmit 2>&1 \| head -20` | ✅ | ⬜ pending |
| 6-03-W0 | 03 | 0 | CONT-01..03 | setup | Create `lib/queries/accountant.test.ts` | ❌ W0 | ⬜ pending |
| 6-03-01 | 03 | 3 | CONT-01, CONT-02, CONT-03 | unit | `npx vitest run lib/queries/accountant.test.ts` | ❌ W0 | ⬜ pending |
| 6-03-02 | 03 | 3 | CONT-04 | manual | Log in as accountant — verify no mutation controls | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/queries/dashboard.test.ts` — pure function tests for DASH-01 through DASH-05 aggregation logic (mock data arrays, no Supabase calls)
- [ ] `lib/queries/accountant.test.ts` — pure function tests for CONT-01, CONT-02, CONT-03

*(Vitest already installed — only new test files needed)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recharts bar chart renders | DASH-04 | Browser DOM required | Open admin dashboard — verify monthly revenue/cost/profit bars appear |
| 30-day cash flow list renders | DASH-05 | Live data | Verify projection table shows upcoming payments |
| Accountant has no mutation controls | CONT-04 | Visual/role | Log in as accountant — confirm no create/edit/delete buttons anywhere |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
