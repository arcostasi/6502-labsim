
import { LcdState } from '../types';

export interface ViaState {
  portA: number;
  portB: number;
  ddrA: number;
  ddrB: number;
}

export class VIA6522 {
  public portA = 0;
  public portB = 0;
  public ddrA = 0;
  public ddrB = 0;
  
  // LCD HD44780 state
  public lcd: LcdState = {
    lines: ["                ", "                "],
    cursor: { x: 0, y: 0 },
    backlight: true
  };

  public reset() {
    this.portA = 0;
    this.portB = 0;
    this.ddrA = 0;
    this.ddrB = 0;
    this.lcd = {
      lines: ["                ", "                "],
      cursor: { x: 0, y: 0 },
      backlight: true
    };
  }

  public read(reg: number): number {
    switch (reg) {
      case 0x00: return this.portB;
      case 0x01: return this.portA;
      case 0x02: return this.ddrB;
      case 0x03: return this.ddrA;
      default: return 0;
    }
  }

  public write(reg: number, val: number) {
    switch (reg) {
      case 0x00:
        this.portB = val;
        break;
      case 0x01:
        const oldPortA = this.portA;
        this.portA = val;
        this.checkLcdControl(oldPortA, val);
        break;
      case 0x02:
        this.ddrB = val;
        break;
      case 0x03:
        this.ddrA = val;
        break;
    }
  }

  private checkLcdControl(oldA: number, newA: number) {
    const oldE = (oldA & 0x01) === 0x01;
    const newE = (newA & 0x01) === 0x01;
    // Falling edge of E triggers command
    if (oldE && !newE) {
      this.executeLcdCommand();
    }
  }

  private executeLcdCommand() {
    const rs = (this.portA & 0x04) !== 0;
    const data = this.portB;

    if (!rs) {
      // Instruction mode
      if (data === 0x01) {
        // Clear Display
        this.lcd.lines = ["                ", "                "];
        this.lcd.cursor = { x: 0, y: 0 };
      } else if ((data & 0x80) !== 0) {
        // Set DDRAM Address
        const addr = data & 0x7F;
        if (addr < 0x10) {
          this.lcd.cursor = { x: addr, y: 0 };
        } else if (addr >= 0x40 && addr < 0x50) {
          this.lcd.cursor = { x: addr - 0x40, y: 1 };
        }
      } else if ((data & 0xC0) === 0x40) {
        // Set CGRAM Address - not implemented
      } else if ((data & 0xF8) === 0x38) {
        // Function Set: 8-bit, 2-line - initialization
      } else if ((data & 0xFC) === 0x0C) {
        // Display On/Off Control
      } else if ((data & 0xFC) === 0x04) {
        // Entry Mode Set
      } else if (data === 0x02) {
        // Return Home
        this.lcd.cursor = { x: 0, y: 0 };
      }
    } else {
      // Data mode - write character
      const char = data >= 32 && data <= 126 ? String.fromCharCode(data) : ' ';
      const { x, y } = this.lcd.cursor;
      
      const lineChars = this.lcd.lines[y].split('');
      if (x < 16) {
        lineChars[x] = char;
        this.lcd.lines[y] = lineChars.join('');
      }
      
      // Advance cursor
      let newX = x + 1;
      let newY = y;
      if (newX >= 16) {
        newX = 0;
        newY = (y + 1) % 2;
      }
      this.lcd.cursor = { x: newX, y: newY };
    }
  }

  public getState(): ViaState {
    return {
      portA: this.portA,
      portB: this.portB,
      ddrA: this.ddrA,
      ddrB: this.ddrB
    };
  }

  public getLcdState(): LcdState {
    return {
      lines: [...this.lcd.lines],
      cursor: { ...this.lcd.cursor },
      backlight: this.lcd.backlight
    };
  }
}
