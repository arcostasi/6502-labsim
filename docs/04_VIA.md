# VIA: 6522 Versatile Interface Adapter

## Overview
The **MOS 6522 VIA** is a powerful I/O controller providing parallel I/O, timers, and a shift register. While not used in the standard Atari 2600, it is a staple of 6502-based computing (VIC-20, Apple III, Disk Drives).

## 1. Register Map
The VIA has 16 internal registers, typically addressed offsets `$00` to `$0F`.

| Offset | Name | Description |
| :---: | :--- | :--- |
| `$00` | **ORB** | Output Register B. (Handshake dependent on PCR). |
| `$01` | **ORA** | Output Register A. (Handshake dependent on PCR). |
| `$02` | **DDRB** | Data Direction Register B. (0=Input, 1=Output). |
| `$03` | **DDRA** | Data Direction Register A. |
| `$04` | **T1C-L** | Timer 1 Counter Low (Read/Write). |
| `$05` | **T1C-H** | Timer 1 Counter High (Read/Write - triggers count). |
| `$06` | **T1L-L** | Timer 1 Latches Low. |
| `$07` | **T1L-H** | Timer 1 Latches High. |
| `$08` | **T2C-L** | Timer 2 Counter Low. |
| `$09` | **T2C-H** | Timer 2 Counter High. |
| `$0A` | **SR** | Shift Register (Serial I/O). |
| `$0B` | **ACR** | Auxiliary Control Register. (Timer modes, Shift modes). |
| `$0C` | **PCR** | Peripheral Control Register. (Handshake lines CA1/2, CB1/2). |
| `$0D` | **IFR** | Interrupt Flag Register. (Read clears flag often). |
| `$0E` | **IER** | Interrupt Enable Register. (Set/Clear bits). |
| `$0F` | **ORA-NH** | Output Register A (No Handshake). |

---

## 2. Timers

### Timer 1 (T1)
16-bit timer with two modes controlled by **ACR** (Bit 6, 7).
*   **One-Shot Mode**: Counts down from Latch value to 0, generates interrupt, then stops/continues (technically continues for phase reference).
*   **Free-Running Mode**: Counts down to 0, generates interrupt, reloads from Latch, and continues. Used for regular ticks or square wave generation (PB7 output).

**T1 Operations**:
*   Write `T1L-L`: Loads low latch.
*   Write `T1L-H`: Loads high latch, transfers low latch to low counter, **clears T1 interrupt**, and **starts counting**.
*   Read `T1C-L`: Reads low counter, **clears T1 interrupt bit** (in IFR).

### Timer 2 (T2)
16-bit timer. Simpler than T1.
*   **One-Shot Mode**: Countdown.
*   **Pulse Counting Mode**: Counts pulses on PB6.

---

## 3. Interrupts (IER & IFR)
*   **IFR (Flags)**: Shows which events occurred. Top bit (bit 7) is the logical OR of all enabled interrupts and their flags.
*   **IER (Enable)**: Masks interrupts.
    *   **Writing**: If D7=1, bits 0-6 set interrupts to enable. If D7=0, bits 0-6 clear enable (disable).

**Bit Mapping**:
*   D0: CA2
*   D1: CA1
*   D2: Shift Register
*   D3: CB2
*   D4: CB1
*   D5: Timer 2
*   D6: Timer 1
*   D7: IRQ (IFR only) / Set-Clear (IER only)

---

## 4. Shift Register (SR)
8-bit serial I/O. Controlled by **ACR** bits 2-4.
*   **Modes**: Disabled, Shift In (External Clock), Shift In (T2 rate), Shift In (System Clock), Shift Out (various clocks).
*   Useful for custom serial protocols or sound generation.

---

## 5. Handshake Lines (CA/CB)
*   **CA1/CB1**: Interrupt inputs (Edge detection controlled by PCR).
*   **CA2/CB2**: Can be Input (Interrupt) or Output (Handshake/Manual).
*   **PCR**: Configures edge sensitivity (Positive/Negative) and output modes.

**Emulation Tip**: Accurately emulating the "Read Handshake" is vital. Reading `ORA` (reg `$01`) usually clears interrupts associated with Port A. Reading `ORA-NH` (`$0F`) does **not**.
