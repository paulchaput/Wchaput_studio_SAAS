---
phase: 3
slug: pagos-y-proveedores
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 3 — Validation Strategy

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
| 3-01-W0 | 01 | 0 | PAY-02, PAY-04 | setup | Add tests to `lib/calculations.test.ts` | ✅ (extend) | ⬜ pending |
| 3-01-01 | 01 | 1 | PROV-01, PROV-02, PROV-03 | manual | Supplier list loads with Innovika + El Roble | ✅ | ⬜ pending |
| 3-01-02 | 01 | 1 | PROV-04 | unit | `npx vitest run lib/calculations.test.ts` | Wave 0 | ⬜ pending |
| 3-02-01 | 02 | 2 | PAY-01, PAY-02, PAY-03 | unit+manual | `npx vitest run lib/calculations.test.ts` | Wave 0 | ⬜ pending |
| 3-03-01 | 03 | 3 | PAY-04, PAY-05 | unit+manual | `npx vitest run lib/calculations.test.ts` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New `describe('payment calculations')` block in `lib/calculations.test.ts` covering:
  - `calcAnticipo(granTotal)` = granTotal * 0.70
  - `calcSaldo(granTotal)` = granTotal * 0.30
  - `calcTotalPagadoCliente(payments[])` sums amounts
  - `calcSaldoPendienteCliente(granTotal, paid)` = granTotal - paid
  - `calcTotalPagadoProveedor(payments[])` sums amounts
  - `calcSaldoProveedor(owed, paid)` = owed - paid

*(Existing test file and Vitest infrastructure already installed — only new test cases needed)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supplier list shows Innovika + El Roble | PROV-02 | DB seed check | Open /proveedores — verify both rows appear |
| Client payment anticipo/saldo registers | PAY-01, PAY-03 | DB write + UI | Register payment on project, verify balance updates |
| Supplier payment registers with double revalidate | PAY-04 | DB write + two pages | Register supplier payment, verify both project detail and supplier detail pages update |
| `tipo` field uses `finiquito` not `saldo` | PAY-02 | Schema constraint | Attempt insert — must succeed (not 422) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
