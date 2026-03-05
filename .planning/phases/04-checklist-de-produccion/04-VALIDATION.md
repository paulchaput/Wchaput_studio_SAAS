---
phase: 4
slug: checklist-de-produccion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (installed in Phase 2) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run lib/checklist-tasks.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/checklist-tasks.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-W0 | 01 | 0 | CHEC-01, CHEC-04 | setup | Create `lib/checklist-tasks.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-01 | 01 | 1 | CHEC-01 | unit | `npx vitest run lib/checklist-tasks.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | CHEC-02, CHEC-05 | type-check | `npx tsc --noEmit 2>&1 \| head -20` | ✅ | ⬜ pending |
| 4-02-01 | 02 | 2 | CHEC-03, CHEC-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 2 | CHEC-03, CHEC-04 | manual | Open project detail, verify checklist renders grouped by phase | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/checklist-tasks.test.ts` — covers CHEC-01 (28 tasks, 7+6+9+8 distribution) and CHEC-04 (`calcPhaseProgress` counts)
- [ ] `lib/actions/checklist.test.ts` — covers CHEC-03 action validation (invalid status rejection)

*(Existing Vitest infrastructure already installed — only new test files needed)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 28 tasks seeded on project create | CHEC-01 | DB write check | Create a new project, open detail page — verify 28 tasks grouped in 4 phases |
| Admin can update task status | CHEC-02 | DOM interaction | Click status toggle on a task — verify instant save |
| Checklist hidden from accountant | CHEC-05 | Role-based UI | Log in as accountant — verify checklist section absent on project detail |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
