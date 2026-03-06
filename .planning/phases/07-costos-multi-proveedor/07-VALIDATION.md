---
phase: 7
slug: costos-multi-proveedor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (installed in Phase 2) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run lib/calculations.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/calculations.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-W0 | 01 | 0 | COST-02, COST-04, COST-05 | setup | Add tests to `lib/calculations.test.ts` | ❌ W0 | ⬜ pending |
| 7-01-01 | 01 | 1 | COST-01, COST-02 | unit | `npx vitest run lib/calculations.test.ts` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | COST-03, COST-04, COST-05 | unit+type | `npx vitest run lib/calculations.test.ts && npx tsc --noEmit 2>&1 \| head -20` | ❌ W0 | ⬜ pending |
| 7-02-01 | 02 | 2 | COST-01, COST-03 | type-check | `npx tsc --noEmit 2>&1 \| head -20` | ✅ | ⬜ pending |
| 7-02-02 | 02 | 2 | COST-05 | unit | `npx vitest run lib/calculations.test.ts` | ❌ W0 | ⬜ pending |
| 7-03-01 | 03 | 3 | COST-06 | manual | Generate OC PDF for Innovika — verify El Roble items absent | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/calculations.test.ts` — add test cases for:
  - `calcTotalCostoFromCosts([{costo:100},{costo:50}]) === 150`
  - `calcMargenFromPrecio(200, 100) === 0.5` and edge case `calcMargenFromPrecio(0, 100) === 0`
  - `calcSubtotalFromPrecio([{precio_venta:200,cantidad:2}]) === 400`
- [ ] Update or remove existing `calcSubtotal` tests when the function signature changes

*(No new test infrastructure needed — Vitest already configured)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OC PDF only shows items for selected supplier | COST-06 | PDF rendering + DB join | Generate OC for Innovika on a project with both Innovika and El Roble cost rows — verify El Roble line items are absent |
| Supplier cost rows UI renders correctly | COST-01 | DOM interaction | Add 2 supplier cost rows to a line item — verify total cost updates in real time |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
