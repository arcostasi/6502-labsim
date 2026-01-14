# Test Suites

This directory contains 6502 CPU test suites used by the **6502 Laboratory Simulator** Test Runner.
The source files (`.s` / `.asm`) are versioned here for reference. The compiled binaries (`.bin`) are **not** versioned — they must be assembled separately and placed in this directory, since Vite serves it as the public root.

---

## Attribution

### Klaus Dormann — 6502 Functional Test

**Files:** `6502_functional_test.s`, `6502_functional_test.lst`, `6502_functional_test.xex`

> Copyright (C) 2012–2020 Klaus Dormann
> License: GNU GPL v3

A comprehensive functional test covering all 6502 opcodes and addressing modes, with a focus on correct processor flag behavior.

- Repository: <https://github.com/Klaus2m5/6502_65C02_functional_tests>

---

### Bruce Clark — Decimal Mode Verification

**Files:** `6502_decimal_test.s`, `6502_decimal_test.lst`, `6502_decimal_test.xex`

> Written by Bruce Clark. This code is **public domain**.
> See: <http://www.6502.org/tutorials/decimal_mode.html>

Tests the BCD (Binary Coded Decimal) arithmetic behavior of the 6502 in decimal mode. Distributed as part of Klaus Dormann's functional test repository.

- Repository: <https://github.com/Klaus2m5/6502_65C02_functional_tests>

---

### Ivo van Poorten — Decimal Mode, Cycle Timing, and Misc Tests

**Files:** `6502DecimalMode.s`, `6502DecimalMode.lst`, `6502DecimalMode.xex`,
`cycles.s`, `cycles.lst`, `cycles.xex`,
`cpu_decimal.s`, `cpu_decimal.lst`, `cpu_decimal.xex`,
`cpu_las.s`, `cpu_las.lst`, `cpu_las.xex`

> Author: Ivo van Poorten
> Assembled with MADS (MAD-Assembler)

- `6502DecimalMode` — cross-check of decimal mode behavior based on data from the Visual6502 wiki.
- `cycles` — verifies the cycle count for each 6502 instruction.
- `cpu_decimal` — CRC-32 based decimal-mode validation.
- `cpu_las` — tests the undocumented `LAS` (LAR/LAE) instruction.

- GitHub: <https://github.com/ivop>

---

### Avery Lee — Altirra Acid800 Test Suite

**Files:** `avery.s`, `avery.lst`, `avery.xex`,
`avery2.s`, `avery2.lst`, `avery2.xex`,
`avery3.s`, `avery3.lst`, `avery3.xex`

> Copyright (C) 2010 Avery Lee, All Rights Reserved.
> License: MIT (permissive — see source headers)

Part of the **Altirra Acid800** test suite for the Atari 8-bit architecture, testing a wide range of CPU behaviors and edge cases.

- Altirra emulator: <https://www.virtualdub.org/altirra.html>

---

### Bird Computer — 6502 Processor Test Routine

**Files:** `bird6502.asm`, `bird6502.lst`, `bird6502.xex`

> Copyright (C) 2002 Bird Computer. All rights reserved.
> Modified for Mad-Assembler by Ivo van Poorten.

Tests basic 6502 operations in order from simplest to most complex, verifying branches, comparisons, and arithmetic instructions.

---

### 6502.org Community — AllSuiteA

**Files:** `AllSuiteA.asm`, `AllSuiteA.lst`, `AllSuiteA.xex`

A widely shared 6502 test suite from the **6502.org** community covering all major instruction groups. Success is indicated when address `$0210` equals `$FF`.

- Forum reference: <http://forum.6502.org/viewtopic.php?f=2&t=5325>

---

### TTL-6502 Test

**Files:** `ttl6502.asm`, `ttl6502.lst`, `ttl6502.xex`

A thorough 6502 test program adapted for use with MADS assembler. Tests a broad set of instructions and addressing modes.

---

### Wolfgang Lorenz — Lorenz CPU Test Suite (`lorenz/`)

**Files:** `lorenz/*.asm`, `lorenz/*.lst`, `lorenz/*.xex`

> Original author: Wolfgang Lorenz
> Adapted/ported for MADS assembler and non-Atari platforms by Ivo van Poorten and others.

The **Lorenz test suite** is the gold standard for testing undocumented (illegal) 6502 opcodes. Originally developed for the Commodore 64, it has been widely ported.
Each file covers a specific undocumented instruction and addressing mode combination.

| Prefix | Instruction |
|--------|-------------|
| `alrb` | ALR (LSR + AND) — Immediate |
| `ancb` | ANC (AND + set carry from bit 7) — Immediate |
| `aneb` | ANE (A & X & imm) — Immediate |
| `arrb` | ARR (AND + ROR) — Immediate |
| `dcp_*` | DCP (DEC + CMP) — all addressing modes |
| `isc_*` | ISC (INC + SBC) — all addressing modes |
| `las*` | LAS (AND SP) — Absolute,Y |
| `lax*` | LAX (LDA + LDX) — all addressing modes |
| `lxab` | LXA (OAL) — Immediate |
| `rla*` | RLA (ROL + AND) — all addressing modes |
| `rra*` | RRA (ROR + ADC) — all addressing modes |
| `sax_*` | SAX (AND A&X then store) — all addressing modes |
| `sbxb` | SBX (CMP & DEX) — Immediate |
| `sha*` | SHA (A & X & (high+1)) — Absolute,Y / (Indirect),Y |
| `shx*` | SHX — Absolute,Y |
| `shy*` | SHY — Absolute,X |
| `slo_*` | SLO (ASL + ORA) — all addressing modes |
| `sre_*` | SRE (LSR + EOR) — all addressing modes |
| `tas*` | TAS (Transfer A&X to SP then SHA) |
| `xaa*` | XAA (ANE variant) |

- Original suite: bundled with the [VICE emulator](https://sourceforge.net/projects/vice-emu/)
- Ivo van Poorten's adaptations: <https://github.com/ivop>

---

## Assembling the Binaries

The `.bin` files required by the Test Runner can be produced from the sources using **MADS** (MAD Assembler) for the Atari targets, or **ca65** for the standard tests.

Example for ca65:
```bash
ca65 6502_functional_test.ca65 -o 6502_functional_test.o
ld65 -t none -o 6502_functional_test.bin 6502_functional_test.o
```

Example for MADS:
```bash
mads -o:avery.bin avery.s
```

Place the resulting `.bin` files in this `tests/` directory. The Vite dev server (`npm run dev`) will serve them at the root URL (e.g., `/avery.bin`), as configured by `publicDir: 'tests'` in `vite.config.ts`.
