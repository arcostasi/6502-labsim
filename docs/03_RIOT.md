# RIOT: 6532 RAM, I/O, Timer

## Overview
The **MOS 6532 RAM-I/O-Timer (RIOT)** provides the Atari 2600 with working memory, I/O ports for controllers, and a programmable timer. It combines three functions into one chip.

## 1. Memory Map (Atari 2600 context)
In the Atari 2600, the RIOT is mapped as follows:
*   **RAM (128 Bytes)**: `$0080 - $00FF` (Zero Page).
*   **I/O & Timer**: `$0280 - $0297`.

## 2. RAM
*   **Size**: 128 Bytes.
*   **Location**: The 6502 Stack (`$0100-$01FF`) is **not** physically present in the RIOT. However, since the 6507 only has 13 address lines, the RIOT RAM at `$0080` is often mirrored or effectively used for stack operations if the stack pointer wraps bits.
*   *Note*: The 2600 technically has no memory at `$0100`. The Stack Pointer initializes to `$FD`, effectively putting the stack in the RIOT RAM at `$00FD` down to `$0080`.

## 3. I/O Ports
Two 8-bit bidirectional ports (Port A and Port B).

| Register | Address | R/W | Description |
| :--- | :--- | :--- | :--- |
| **SWCHA** | `$0280` | R/W | **Port A Data**. Connects to Joystick Controllers. |
| **SWACNT** | `$0281` | R/W | **Port A Data Direction Register (DDR)**. 0=Input, 1=Output. |
| **SWCHB** | `$0282` | R/W | **Port B Data**. Connects to Console Switches (Reset, Select, B/W, Difficulty). |
| **SWBCNT** | `$0283` | R/W | **Port B Data Direction Register (DDR)**. |

### Port A (Joystick) mappings
*   **High Nibble**: Left Player (P0).
*   **Low Nibble**: Right Player (P1).
*   Bits: Right, Left, Down, Up (Active Low typically).

### Port B (Console) mappings
*   **D0**: Reset Game.
*   **D1**: Select Game.
*   **D3**: Color / B&W Switch.
*   **D6**: Left Difficulty (0=B / 1=A).
*   **D7**: Right Difficulty.

---

## 4. Interval Timer
The RIOT contains an 8-bit countdown timer (`INTIM`) that can be set to distinct clock intervals (prescalers) by writing to specific addresses.

### Timer Write Addresses (Setting the Timer)
Writing *any value* to these addresses sets the timer value and the prescaler interval.

| Address | Register | Interval (Cycles) | Description |
| :--- | :--- | :--- | :--- |
| `$0294` | **TIM1T** | 1 | Decrements every 1 CPU cycle. |
| `$0295` | **TIM8T** | 8 | Decrements every 8 CPU cycles. |
| `$0296` | **TIM64T** | 64 | Decrements every 64 CPU cycles. |
| `$0297` | **TIM1024T** | 1024 | Decrements every 1024 CPU cycles. |

### Timer Read Register
| Address | Register | Description |
| :--- | :--- | :--- |
| `$0284` | **INTIM** | **Read Timer Count**. Returns the current value of the timer. |

### Timer Behavior
1.  **Write**: Writing value `N` to a `TIMxxT` register loads the counter with `N` and resets the prescaler.
2.  **Countdown**: The timer decrements by 1 every `Interval` CPU cycles.
3.  **Underflow**: When the timer transitions from `00` to `FF`, an interrupt flag is set (masked/enabled by flags). In 2600, interrupts are not connected, but standard RIOT behavior applies.
4.  **Post-Underflow**: After reaching 0, the timer continues to count down at **1T (1 cycle)** rate regardless of the previous interval settings, allowing the CPU to measure how long ago the timer expired (indicated by negative values / high bit set if interpreted as such).

### INSTAT (Interrupt Status)
*   Address: `$0285`.
*   Reads the interrupt status (D7=Interrupt occurred).
