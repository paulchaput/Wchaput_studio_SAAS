---
phase: 2
slug: proyectos-y-partidas
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (not yet installed) |
| **Config file** | `vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose lib/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-W0 | 01 | 0 | PART-03..07 | setup | `npm install -D vitest && npx vitest run lib/` | ❌ W0 | ⬜ pending |
| 2-01-01 | 01 | 1 | PART-03 | unit | `npx vitest run lib/calculations.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | PART-04 | unit | `npx vitest run lib/calculations.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | PART-05 | unit | `npx vitest run lib/calculations.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-04 | 01 | 1 | PART-06 | unit | `npx vitest run lib/calculations.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-05 | 01 | 1 | PART-07 | unit | `npx vitest run lib/calculations.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-06 | 01 | 1 | PART-09 | unit | `npx vitest run lib/formatters.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-07 | 01 | 1 | PROJ-07 | unit | `npx vitest run lib/formatters.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | PROJ-01 | manual | Submit form with empty required fields — verify error | ✅ | ⬜ pending |
| 2-02-02 | 02 | 2 | PROJ-02 | unit | `npx vitest run lib/calculations.test.ts` (PIPELINE_STAGES) | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 2 | PROJ-03 | manual | Click advance/revert on project detail — verify DB update | ✅ | ⬜ pending |
| 2-03-01 | 03 | 3 | PART-03..07 | unit | `npx vitest run lib/calculations.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 3 | UX-02 | manual | DevTools responsive mode at 375px width | ✅ | ⬜ pending |
| 2-03-03 | 03 | 3 | UX-05 | static | `grep -r "0\.16" components/ -- must return 0 results` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` installed: `npm install -D vitest`
- [ ] `vitest.config.ts` — config file at project root
- [ ] `lib/calculations.test.ts` — stubs for PART-03, PART-04, PART-05, PART-06, PART-07, PROJ-02
- [ ] `lib/formatters.test.ts` — stubs for PART-09, PROJ-07

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Create project form requires name + client | PROJ-01 | DOM interaction + DB write | Submit form with empty required fields, verify validation errors appear |
| Advance/revert 6-stage pipeline | PROJ-03 | DB state change + redirect | Click advance button on project detail, verify status updates in DB and UI |
| Mobile 375px layout renders | UX-02 | Visual/responsive | DevTools → responsive mode → 375px width — all content visible, no overflow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
