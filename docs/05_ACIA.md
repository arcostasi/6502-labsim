# ACIA: 6551 Asynchronous Communications Interface Adapter

## Overview
The **MOS 6551 ACIA** is the standard serial interface chip for the 6502 family. It handles RS-232 communication with a built-in baud rate generator, making it superior to the older 6850 which required an external clock.

## 1. Register Map
 The chip has 4 registers, mapped to 4 addresses.

| Offset | R/W | Name | Description |
| :---: | :---: | :--- | :--- |
| `$00` | R/W | **Data Register** | Read: Receive Data. Write: Transmit Data. |
| `$01` | R | **Status Register** | Status flags (IRQ, Parity, Overrun, Empty, Full). |
| `$01` | W | **Reset** | Writing any value performs a Master Reset. |
| `$02` | R/W | **Command Register** | Controls Parity, Echo, Tx/Rx Interrupts, DTR/RTS. |
| `$03` | R/W | **Control Register** | Controls Stop Bits, Word Length, Baud Rate Generator. |

---

## 2. Registers Breakdown

### Control Register (`$03`)
*   **D0-D3**: **Baud Rate**.
    *   `0000`: 16x External Clock
    *   `0001`: 50 baud ... `1110`: 9600 baud ... `1111`: 19200 baud.
*   **D4**: **Receiver Clock Source**. 0=Internal, 1=External.
*   **D5-D6**: **Word Length**.
    *   `00`: 8 Bits
    *   `01`: 7 Bits
    *   `10`: 6 Bits
    *   `11`: 5 Bits
*   **D7**: **Stop Bits**. 0=1 Stop Bit, 1=2 Stop Bits.

### Command Register (`$02`)
*   **D0**: **DTR** (Data Terminal Ready). 0=High (Disabled), 1=Low (Enabled).
*   **D1**: **Rx Interrupt**. 0=IRQ disabled.
*   **D2-D3**: **Tx Control**.
    *   `00`: RTS High, Tx IRQ disabled.
    *   `01`: RTS Low, Tx IRQ enabled.
    *   `10`: RTS Low, Tx IRQ disabled.
    *   `11`: RTS Low, Transmit Break.
*   **D4**: **Echo Mode**. 0=Normal, 1=Echo (Bits 2-3 must be 00).
*   **D5-D7**: **Parity**.
    *   `00x`: No Parity.
    *   `010`: Odd Parity.
    *   `011`: Even Parity.
    *   `100`: Mark Parity.
    *   `101`: Space Parity.

### Status Register (`$01`)
*   **D0**: **Parity Error**.
*   **D1**: **Framing Error**.
*   **D2**: **Overrun Error**.
*   **D3**: **Receiver Data Register Full**. (Set when byte received, cleared when Data Register read).
*   **D4**: **Transmitter Data Register Empty**. (Set when TDR empty, cleared when Data Register written).
*   **D5**: **DCD** (Data Carrier Detect).
*   **D6**: **DSR** (Data Set Ready).
*   **D7**: **IRQ**. (Logic 1 if interrupt pending).

---

## 3. Emulation Logic
1.  **Transmitter**:
    *   Write to Data Register (`$00`) puts byte in shift register.
    *   Status D4 (Empty) goes Low.
    *   After transmission, Status D4 goes High. If Tx IRQ enabled, pull IRQ line low.

2.  **Receiver**:
    *   When start bit detected, clock in bits at Baud Rate.
    *   When complete, move to Data Register (`$00`).
    *   Set Status D3 (Full). If Rx IRQ enabled, pull IRQ line low.
    *   Overrun: If D3 was already set, set Overrun Error.

3.  **Reset**:
    *   Writing to `$01` (Programmed Reset) preserves Control/Command bits but clears buffer status.
