
/**
 * ACIA 6551 - Asynchronous Communications Interface Adapter
 * 
 * Register Map (directly addressable):
 * $00 - Data Register (TX/RX)
 * $01 - Status Register (Read) / Programmed Reset (Write)
 * $02 - Command Register
 * $03 - Control Register
 * 
 * This implementation emulates the 6551 ACIA as used in Ben Eater's 6502 project
 * and is compatible with Microsoft BASIC's serial I/O requirements.
 */

export interface AciaState {
  // Registers
  dataRx: number;        // Receive Data Register
  dataTx: number;        // Transmit Data Register
  status: number;        // Status Register
  command: number;       // Command Register
  control: number;       // Control Register
  
  // Internal state
  rxBuffer: number[];    // Receive buffer (keyboard input)
  txBuffer: number[];    // Transmit buffer (terminal output)
  
  // Flags for visualization
  rxFull: boolean;       // Receive Data Register Full (RDRF)
  txEmpty: boolean;      // Transmit Data Register Empty (TDRE)
  overrun: boolean;      // Overrun error
  framingError: boolean; // Framing error
  parityError: boolean;  // Parity error
  irq: boolean;          // IRQ active
}

// Status Register Bits
const STATUS_IRQ      = 0x80;  // Bit 7: IRQ (active low in hardware, we use active high)
const STATUS_DSR      = 0x40;  // Bit 6: DSR (Data Set Ready)
const STATUS_DCD      = 0x20;  // Bit 5: DCD (Data Carrier Detect)
const STATUS_TDRE     = 0x10;  // Bit 4: Transmit Data Register Empty
const STATUS_RDRF     = 0x08;  // Bit 3: Receive Data Register Full
const STATUS_OVERRUN  = 0x04;  // Bit 2: Overrun Error
const STATUS_FRAMING  = 0x02;  // Bit 1: Framing Error
const STATUS_PARITY   = 0x01;  // Bit 0: Parity Error

// Command Register Bits
const CMD_PARITY_MODE = 0xE0;  // Bits 7-5: Parity Mode
const CMD_ECHO        = 0x10;  // Bit 4: Echo Mode
const CMD_TX_INT_CTRL = 0x0C;  // Bits 3-2: Transmit Interrupt Control
const CMD_RX_INT_DIS  = 0x02;  // Bit 1: Receiver Interrupt Disable
const CMD_DTR         = 0x01;  // Bit 0: Data Terminal Ready

// Control Register Bits
const CTRL_STOP_BITS  = 0x80;  // Bit 7: Stop Bit Number
const CTRL_WORD_LEN   = 0x60;  // Bits 6-5: Word Length
const CTRL_RX_CLK     = 0x10;  // Bit 4: Receiver Clock Source
const CTRL_BAUD_RATE  = 0x0F;  // Bits 3-0: Baud Rate Select

// Baud rate table (for display purposes)
export const BAUD_RATES: Record<number, number> = {
  0x0: 0,      // External clock
  0x1: 50,
  0x2: 75,
  0x3: 109.92,
  0x4: 134.58,
  0x5: 150,
  0x6: 300,
  0x7: 600,
  0x8: 1200,
  0x9: 1800,
  0xA: 2400,
  0xB: 3600,
  0xC: 4800,
  0xD: 7200,
  0xE: 9600,
  0xF: 19200,
};

// Word length table
export const WORD_LENGTHS: Record<number, number> = {
  0x00: 8,
  0x20: 7,
  0x40: 6,
  0x60: 5,
};

export class ACIA6551 {
  // Registers
  private dataRx = 0;
  private dataTx = 0;
  private status = STATUS_TDRE;  // TX empty on reset
  private command = 0;
  private control = 0;
  
  // Buffers
  private rxBuffer: number[] = [];
  private txBuffer: number[] = [];
  
  // TX buffer max size for visualization
  private static readonly TX_BUFFER_MAX = 4096;
  
  // Callback for when data is transmitted (for terminal display)
  public onTransmit?: (char: number) => void;
  
  // Callback for IRQ
  public onIrq?: (active: boolean) => void;

  public reset() {
    this.dataRx = 0;
    this.dataTx = 0;
    this.status = STATUS_TDRE | STATUS_DSR | STATUS_DCD;  // TX empty, DSR/DCD active (always connected)
    this.command = 0;
    this.control = 0;
    this.rxBuffer = [];
    this.txBuffer = [];
    this.updateIrq();
  }

  public read(reg: number): number {
    switch (reg & 0x03) {
      case 0x00: // Data Register (Read = Receive)
        return this.readData();
      case 0x01: // Status Register
        return this.readStatus();
      case 0x02: // Command Register
        return this.command;
      case 0x03: // Control Register
        return this.control;
      default:
        return 0;
    }
  }

  public write(reg: number, val: number) {
    switch (reg & 0x03) {
      case 0x00: // Data Register (Write = Transmit)
        this.writeData(val);
        break;
      case 0x01: // Programmed Reset (any write)
        this.programmedReset();
        break;
      case 0x02: // Command Register
        this.command = val;
        this.updateIrq();
        break;
      case 0x03: // Control Register
        this.control = val;
        break;
    }
  }

  private readData(): number {
    const data = this.dataRx;
    
    // Clear RDRF flag
    this.status &= ~STATUS_RDRF;
    
    // Clear error flags on read
    this.status &= ~(STATUS_OVERRUN | STATUS_FRAMING | STATUS_PARITY);
    
    // Load next byte from buffer if available
    if (this.rxBuffer.length > 0) {
      this.dataRx = this.rxBuffer.shift()!;
      this.status |= STATUS_RDRF;
    }
    
    this.updateIrq();
    return data;
  }

  private readStatus(): number {
    const status = this.status;
    // Clear IRQ flag on status read (as per 6551 behavior)
    this.status &= ~STATUS_IRQ;
    return status;
  }

  private writeData(val: number) {
    this.dataTx = val & 0xFF;
    
    // Clear TDRE (transmit register now full)
    this.status &= ~STATUS_TDRE;
    
    // Add to TX buffer for visualization
    if (this.txBuffer.length < ACIA6551.TX_BUFFER_MAX) {
      this.txBuffer.push(this.dataTx);
    }
    
    // Call transmit callback (for terminal display)
    if (this.onTransmit) {
      this.onTransmit(this.dataTx);
    }
    
    // Simulate instant transmission (set TDRE back)
    // In real hardware this would take time based on baud rate
    this.status |= STATUS_TDRE;
    
    this.updateIrq();
  }

  private programmedReset() {
    // Programmed reset clears status bits but preserves control/command
    this.status = STATUS_TDRE | STATUS_DSR | STATUS_DCD;
    this.rxBuffer = [];
    this.updateIrq();
  }

  private updateIrq() {
    let irqActive = false;
    
    // Check RX interrupt (if enabled and data available)
    const rxIntEnabled = (this.command & CMD_RX_INT_DIS) === 0;
    const rxDataReady = (this.status & STATUS_RDRF) !== 0;
    if (rxIntEnabled && rxDataReady) {
      irqActive = true;
    }
    
    // Check TX interrupt (if enabled and TX empty)
    const txIntMode = (this.command & CMD_TX_INT_CTRL) >> 2;
    const txEmpty = (this.status & STATUS_TDRE) !== 0;
    if (txIntMode === 0x01 && txEmpty) {
      irqActive = true;
    }
    
    if (irqActive) {
      this.status |= STATUS_IRQ;
    } else {
      this.status &= ~STATUS_IRQ;
    }
    
    if (this.onIrq) {
      this.onIrq(irqActive);
    }
  }

  /**
   * Receive a character from the terminal (keyboard input)
   */
  public receiveChar(char: number) {
    char &= 0xFF;
    
    // Check if RDRF is already set (overrun condition)
    if (this.status & STATUS_RDRF) {
      // Buffer the character if possible
      if (this.rxBuffer.length < 256) {
        this.rxBuffer.push(char);
      } else {
        // Buffer full, set overrun
        this.status |= STATUS_OVERRUN;
      }
    } else {
      // Load directly into data register
      this.dataRx = char;
      this.status |= STATUS_RDRF;
    }
    
    this.updateIrq();
  }

  /**
   * Receive a string from the terminal
   */
  public receiveString(str: string) {
    for (const char of str) {
      this.receiveChar(char.charCodeAt(0));
    }
  }

  /**
   * Get current baud rate setting
   */
  public getBaudRate(): number {
    return BAUD_RATES[this.control & CTRL_BAUD_RATE] || 0;
  }

  /**
   * Get word length setting
   */
  public getWordLength(): number {
    return WORD_LENGTHS[this.control & CTRL_WORD_LEN] || 8;
  }

  /**
   * Get stop bits setting
   */
  public getStopBits(): number {
    return (this.control & CTRL_STOP_BITS) ? 2 : 1;
  }

  /**
   * Get parity setting
   */
  public getParity(): string {
    const parityMode = (this.command & CMD_PARITY_MODE) >> 5;
    switch (parityMode) {
      case 0: return 'ODD';
      case 1: return 'EVEN';
      case 2: return 'MARK';
      case 3: return 'SPACE';
      default: return 'NONE';
    }
  }

  /**
   * Check if echo mode is enabled
   */
  public isEchoEnabled(): boolean {
    return (this.command & CMD_ECHO) !== 0;
  }

  /**
   * Check if DTR is active
   */
  public isDtrActive(): boolean {
    return (this.command & CMD_DTR) !== 0;
  }

  /**
   * Get TX buffer for display
   */
  public getTxBuffer(): number[] {
    return [...this.txBuffer];
  }

  /**
   * Clear TX buffer
   */
  public clearTxBuffer() {
    this.txBuffer = [];
  }

  /**
   * Get state for visualization
   */
  public getState(): AciaState {
    return {
      dataRx: this.dataRx,
      dataTx: this.dataTx,
      status: this.status,
      command: this.command,
      control: this.control,
      rxBuffer: [...this.rxBuffer],
      txBuffer: [...this.txBuffer],
      rxFull: (this.status & STATUS_RDRF) !== 0,
      txEmpty: (this.status & STATUS_TDRE) !== 0,
      overrun: (this.status & STATUS_OVERRUN) !== 0,
      framingError: (this.status & STATUS_FRAMING) !== 0,
      parityError: (this.status & STATUS_PARITY) !== 0,
      irq: (this.status & STATUS_IRQ) !== 0,
    };
  }
}
