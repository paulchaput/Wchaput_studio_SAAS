---
phase: 5
slug: generacion-de-pdfs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (installed in Phase 2) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run lib/pdf` |
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
| 5-01-W0 | 01 | 0 | QUOT-02, QUOT-04 | setup | Create `lib/pdf/CotizacionTemplate.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-01 | 01 | 1 | QUOT-01, QUOT-02, QUOT-03 | unit+type | `npx vitest run && npx tsc --noEmit 2>&1 \| head -20` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | QUOT-04, QUOT-05 | unit+manual | `npx vitest run lib/pdf` | ❌ W0 | ⬜ pending |
| 5-02-W0 | 02 | 0 | OC-02, OC-03 | setup | Create `lib/pdf/OrdenCompraTemplate.test.ts` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 2 | OC-01, OC-02, OC-03 | unit+type | `npx vitest run && npx tsc --noEmit 2>&1 \| head -20` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 2 | OC-01, OC-03 | manual | Download OC PDF from admin; verify 403 as accountant | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/pdf/CotizacionTemplate.test.ts` — data shape test for QUOT-02 (no costo/margen fields in props)
- [ ] `lib/pdf/OrdenCompraTemplate.test.ts` — data shape test for OC-02 (supplier-filtered line items shape)

*(Vitest already installed and configured — only new test files needed)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Quote PDF downloads with correct content | QUOT-01, QUOT-05 | Browser + PDF inspection | Click download button, open PDF, verify logo, client info, totals, 70/30 schedule appear; verify NO cost/margin data |
| Quote PDF editorial design | QUOT-04 | Visual | Confirm white background, monochrome, bottom-border-only rows |
| OC PDF downloads for supplier | OC-01 | Browser + PDF inspection | Click OC button for a supplier, verify only that supplier's line items with unit costs appear |
| OC inaccessible to accountant | OC-03 | Role auth check | Log in as accountant, navigate to OC route — verify 403/redirect |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
