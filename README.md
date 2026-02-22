# 6502 Laboratory Simulator

A fully interactive visual simulator of a **MOS 6502** computer, inspired by the [Ben Eater](https://eater.net/6502) breadboard kit.

Features a built-in 2-pass assembler, real-time bus visualization, emulation of multiple classic peripherals (VIA 6522, ACIA 6551, TIA/RIOT, MC6845 CRTC), an Atari 2600 mode, a comprehensive test runner for 6502 validation suites, and optional AI-assisted assembly code generation via Gemini.

---

## Features

### CPU & Assembler

- **Full MOS 6502 emulation** — all 56 standard opcodes across all 13 addressing modes, accurate cycle counting, decimal (BCD) mode, hardware interrupts (NMI / IRQ / RESET), and known hardware quirks (page-crossing penalty, indirect-JMP bug, read-modify-write dummy writes).
- **Undocumented (illegal) opcodes** — ALR, ANC, ANE, ARR, DCP, ISC, LAS, LAX, LXA, RLA, RRA, SAX, SBX, SHA, SHX, SHY, SLO, SRE, TAS, XAA.
- **Built-in 2-pass assembler** — supports standard mnemonics, labels, `.ORG`, `.BYTE`, decimal / hexadecimal / binary literals, and Ben Eater–style syntax. Errors are highlighted inline in the editor.
- **Active-line highlighting** — the editor tracks the current PC and highlights the executing instruction in real time.

### Bus & Clock

- **Live bus visualization** — 16-bit address bus and 8-bit data bus shown as individual LED arrays with hex readout. R/W signal displayed with color coding.
- **Variable clock speed** — step-by-step, slow, medium, fast, and maximum (run as fast as the browser allows). Cycle counter included.
- **Pan & zoom canvas** — the PCB layout is on an infinite scrollable canvas; drag to pan, scroll to zoom, or use the on-screen controls.

### Peripherals

| Peripheral | Address | Description |
|---|---|---|
| **RAM** | `$0000–$3FFF` | 16 KB of general-purpose RAM |
| **CRTC Video RAM** | `$4000–$47FF` | 2 KB dedicated to the MC6845 |
| **MC6845 CRTC** | `$4800–$4801` | CRT controller (address/data registers) |
| **ACIA 6551** | `$5000–$5003` | Asynchronous serial interface |
| **VIA 6522** | `$6000–$600F` | Versatile interface adapter |
| **ROM** | `$8000–$FFFF` | 32 KB ROM / cartridge space |

#### VIA 6522
Port A controls the HD44780 LCD (E / RW / RS signals). Port B drives 8 LEDs.
DDRA and DDRB are fully emulated. Both ports are visualized as physical breakout boards with LED indicators.

#### HD44780 LCD
2-line × 16-character LCD display driven by the VIA. Accurately emulates the 4-bit / 8-bit initialization sequence, instruction/data register selection, and cursor movement.

#### ACIA 6551
Serial terminal with separate TX and RX FIFO buffers. Supports sending characters from the UI to the CPU and displaying CPU output in a scrollable terminal. IRQ line is emulated.

#### TIA + RIOT (Atari 2600 mode)
Load a `.bin` cartridge to switch into **Atari 2600 mode**:
- Full-resolution NTSC (262 scanlines) and PAL (312 scanlines) frame rendering on an HTML5 canvas at 60 fps.
- All TIA objects: two players (sprite), two missiles, one ball, and the playfield (PF0/PF1/PF2).
- HMOVE, VBLANK, WSYNC, collision detection, and color/difficulty/select/reset console switches.
- Two-player joystick input (keyboard-mapped).
- RIOT 6532 RAM (128 B) and interval timer fully emulated.
- **TIA audio** — channels 0/1 (AUDC/AUDF/AUDV) rendered via the Web Audio API in real time, including all 16 AUDC waveform modes.
- **Piano keyboard** — play musical notes (C4–B4 + accidentals) directly into TIA audio channel 0; shows the corresponding AUDC/AUDF/AUDV register writes live.

#### MC6845 CRTC
Character-cell CRT controller (used in the BBC Micro, Amstrad CPC, etc.):
- Renders a text-mode display driven by VRAM at `$4000`.
- Three selectable phosphor colors: **P1 Green**, **P3 Amber**, **P4 White**.
- Configurable character clock frequency (MHz).
- Full 18-register editor (R0–R17).
- Built-in keyboard input: type text directly into VRAM.
- Standalone mode (configurable without a running program).

### ROM & Cartridge Loading

- **EEPROM ROM**: load any raw `.bin` file into `$8000–$FFFF` (32 KB max). The CPU resets and starts from the new reset vector.
- **Atari 2600 cartridge**: auto-detected; switches the bus to Atari address-decoding mode (TIA + RIOT).

### Assembly Examples

Ten ready-to-run programs are included out of the box:

| Example | Description |
|---|---|
| **LCD Hello World** | Ben Eater–style LCD demo via VIA 6522 |
| **Serial Hello World** | Send `Hello World` to the ACIA 6551 terminal |
| **Serial Echo** | Echo every character received back to the terminal |
| **Simple Calculator** | Add two digits entered via serial |
| **Binary Counter** | Count 0–255 on VIA Port B LEDs |
| **Fibonacci Sequence** | Compute Fibonacci numbers, print to serial |
| **Memory Test** | Write and read back RAM patterns |
| **Stack Operations** | Demonstrate push/pop and subroutine calls |
| **LED Blink** | Blink all eight VIA Port B LEDs |
| **Knight Rider** | Classic LED chaser effect |

### Test Runner

A built-in batch test runner (accessible via the **Test Runner** button) loads and executes 6502 validation binaries headlessly:

- 60+ test cases grouped by category: Functional, Decimal, Suite, Avery, Timing, Illegal Opcodes (Lorenz).
- Each test reports: **pass** (PC reached the success address), **fail** (wrong outcome), **timeout** (cycle limit exceeded), elapsed time, and total cycle count.
- Supports Klaus Dormann's functional test, Bruce Clark's decimal test, Avery Lee's Altirra suite, the Lorenz illegal-opcode suite, and more.
- See [tests/README.md](tests/README.md) for full attribution and instructions on assembling the binaries.

### AI Code Generation (Optional)

The editor includes an AI prompt bar powered by the **Google Gemini API**. Type a natural-language description and press **GEN** to generate 6502 assembly automatically. Requires a valid `GEMINI_API_KEY` in `.env.local`.

---

## Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite 7](https://vitejs.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Google GenAI SDK](https://github.com/google-gemini/generative-ai-js) (optional)
- [Lucide React](https://lucide.dev) (icons)

---

## Project Structure

```
6502-labsim/
├── components/          # React UI components
│   ├── visualizers/     # Per-chip breakout boards (CPU, VIA, TIA, ACIA, CRTC …)
│   └── ui/              # Reusable primitives (Led, Switch, RegisterDisplay …)
├── services/            # Emulation core
│   ├── cpu6502.ts       # MOS 6502 CPU
│   ├── assembler.ts     # 2-pass assembler
│   ├── bus.ts           # System bus & memory map
│   ├── via.ts           # VIA 6522
│   ├── acia.ts          # ACIA 6551
│   ├── tia.ts           # TIA (Atari 2600)
│   ├── tiaRegisters.ts  # TIA register definitions
│   ├── riot.ts          # RIOT 6532
│   ├── crtc6845.ts      # MC6845 CRTC
│   ├── geminiService.ts # AI code generation
│   └── computer.ts      # Top-level machine orchestration
├── hooks/
│   ├── useComputer.ts   # Main simulation state & controls
│   └── usePanZoom.ts    # Canvas pan/zoom interaction
├── docs/                # Technical documentation per chip
├── tests/               # 6502 test sources (.s/.asm) and listings
│   └── lorenz/          # Lorenz illegal-opcode suite
├── examples.ts          # Built-in assembly examples
├── types.ts             # Shared TypeScript types & memory constants
├── App.tsx              # Root application component
└── index.tsx            # React entry point
```

---

## Requirements

- **Node.js 20+** (18 minimum)
- A modern browser (Chrome / Edge / Firefox — Web Audio API required for TIA audio)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. (Optional) Configure Gemini AI

Copy `.env.example` to `.env.local` and fill in your API key:

```bash
cp .env.example .env.local
```

```dotenv
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-pro
```

The AI prompt bar is hidden / non-functional when no key is present.

### 3. Start the dev server

```bash
npm run dev
# → http://localhost:3000
```

---

## Build

```bash
# Production bundle
npm run build

# Preview the production build locally
npm run preview
```

Output is written to `dist/`. Chunks are split on: React/ReactDOM, Google GenAI SDK, and Lucide icons.

---

## Tests

The **Test Runner** (in-app button) expects compiled `.bin` files placed in the `tests/` directory. Vite serves this directory as the public root during development.

Test sources (`.s` / `.asm`) are versioned. Binaries are **not** — compile them yourself:

```bash
# Example: Klaus Dormann functional test (ca65)
cl65 -t none -o tests/6502_functional_test.bin tests/6502_functional_test.ca65

# Example: Avery / Lorenz suites (MADS)
mads -o:tests/avery.bin tests/avery.s
mads -o:tests/lorenz/alrb.bin tests/lorenz/alrb.asm
```

See [tests/README.md](tests/README.md) for full attribution, licensing information for each test suite, and detailed assembly instructions.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT © 2026 Anderson Costa. See [LICENSE](LICENSE).
