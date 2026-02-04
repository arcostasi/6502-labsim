# TIA: Television Interface Adapter

## Overview
The **TIA** is the heart of the Atari 2600. Unlike modern GPUs that have a framebuffer, the TIA generates the video signal **one scanline at a time**, in real-time, strictly following the register values set by the CPU. This architecture forces the programmer to "Race the Beam"—updating registers just before the electron beam on the TV creates the pixel.

## 1. Timing & Resolution

*   **Master Clock**: 3.58 MHz (NTSC).
*   **Color Clock**: Master Clock.
*   **CPU Clock**: Master Clock / 3 (1.19 MHz).
*   **Horizontal Line**: 228 Color Clocks = 76 CPU Cycles.

### Horizontal Line Breakdown
| Region | Color Clocks | CPU Cycles | Description |
| :--- | :---: | :---: | :--- |
| **HBLANK** | 68 | 22.6 | Horizontal Blanking. Beam off, returning to left. |
| **Visible** | 160 | 53.3 | Visible screen area. |
| **Total** | 228 | 76 | Total time for one scanline. |

### Vertical Frame (NTSC)
| Region | Scanlines | Description |
| :--- | :---: | :--- |
| **VSYNC** | 3 | Vertical Sync signal. |
| **VBLANK** | 37 | Vertical Blanking (Game logic processing time). |
| **Visible** | 192 | Active display area (Kernal). |
| **Overscan** | 30 | Bottom overscan using VBLANK. |
| **Total** | ~262 | Standard NTSC frame. |

---

## 2. Graphics Objects

The TIA manages 5 movable objects and a background playfield:

1.  **Playfield (PF0, PF1, PF2)**: Asymmetrical background.
    *   **PF0**: 4 bits (Upper nibble used: `4..7`). Drawn left to right.
    *   **PF1**: 8 bits. Drawn right to left (Bit 7 first).
    *   **PF2**: 8 bits. Drawn left to right.
    *   *Note*: The Playfield is drawn twice per line (Left half, Right half).

2.  **Players (P0, P1)**:
    *   8-bit bitmap sprites.
    *   Can be replicated (1, 2, or 3 copies) and sized (1x, 2x, 4x) using `NUSIZx`.
    *   Colors defined by `COLUP0` / `COLUP1`.

3.  **Missiles (M0, M1)**:
    *   1-bit object associated with each player.
    *   Share color with their player.
    *   Size scalable (1, 2, 4, 8 clocks).

4.  **Ball (BL)**:
    *   1-bit object.
    *   Takes color of Playfield (`COLUPF`).
    *   Size scalable.

---

## 3. Horizontal Positioning (The "Strobe" Concept)
The TIA has **no X-coordinate registers**. Positioning is done by **strobing a Reset Register (`RESPx`)** at the exact moment the beam is at the desired position.

*   `RESP0`, `RESP1`: Reset Player Position.
*   `RESM0`, `RESM1`: Reset Missile Position.
*   `RESBL`: Reset Ball Position.

**Fine Tuning (`HMOVE`)**:
Since the CPU cycle is 3 color clocks long, `RESPx` acts coarsely (every 3 pixels). To center sprites precisely, you use **HMOVE**.
1.  Write a value (-8 to +7) to `HMP0`, `HMP1`, `HMM0`, `HMM1`, `HMBL`.
2.  Strobe `HMOVE`. This shifts *all* objects based on their `HMxx` value.
3.  Each shift consumes cycles during HBLANK (causing the "HMOVE Comb" black bars on the left).

---

## 4. Key Registers

### Synchronization
*   **WSYNC** (`$02`): **Wait for Sync**. Halts the CPU (pulls RDY low) until the start of the next HBLANK (Clock 0 of next line). Essential for timing code.
*   **VSYNC** (`$00`): Vertical Sync control (D1).
*   **VBLANK** (`$01`): Vertical Blank control (D1), Input latch enable (D7), Ground dumps (D6).

### Graphics Control
*   **NUSIZ0/1** (`$04/$05`): Number and Size of players/missiles.
    *   D0-D2: Player Copies/Size (1 copy, 2 copies close/med/wide, 3 copies close/med, 2x size, 4x size).
    *   D4-D5: Missile Size (1, 2, 4, 8 clocks).
*   **COLUP0/1** (`$06/$07`): Color - Player 0/1.
*   **COLUPF** (`$08`): Color - Playfield/Ball.
*   **COLUBK** (`$09`): Color - Background.
*   **CTRLPF** (`$0A`): Playfield Control (Reflection, Score mode, Ball size, Priority).

### Graphics Bitmaps
*   **GRP0/1** (`$1B/$1C`): Graphics Player 0/1 (8-bit pattern).
*   **ENAM0/1** (`$1D/$1E`): Enable Missile 0/1 (1-bit D1).
*   **ENABL** (`$1F`): Enable Ball (1-bit D1).

### Inputs (Read Only)
*   **INPT0-INPT5**: Paddle inputs / Fire buttons. (Dumped to ground via VBLANK D7 during capacitor discharge).
*   **CXT**...: Collision Latches. R/O. Check if two objects overlapped.

---

## 5. Audio
Two independent channels (0 and 1).
*   **AUDC0/1** (`$15/$16`): Control (Tone types, Noise type - 4-bit).
*   **AUDF0/1** (`$17/$18`): Frequency (5-bit divider).
*   **AUDV0/1** (`$19/$1A`): Volume (4-bit).

---

## 6. Emulation Notes
1.  **HMOVE Timing**: `HMOVE` extends HBLANK by 8 color clocks.
2.  **Strobes**: Writing to `RESPx` resets an internal counter for that object. The object draws when the counter wraps.
3.  **Delay**: Player graphics (`GRP0`) are often delayed by `VDELP0` to allow updating both players during a single line kernel.
4.  **Collision**: Hardware matrix detects overlaps. Read from `CX...` registers. Cleared by `CXCLR`.
