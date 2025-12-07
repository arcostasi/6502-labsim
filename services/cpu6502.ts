
import { CpuRegisters } from '../types';

// Simple Opcode Name Lookup for Visualization
export const OPCODE_NAMES: Record<number, string> = {
  0xA9: "LDA #", 0xA5: "LDA zp", 0xAD: "LDA abs", 0xBD: "LDA abs,X", 0xB9: "LDA abs,Y",
  0xA1: "LDA (zp,X)", 0xB1: "LDA (zp),Y",
  0xA2: "LDX #", 0xA6: "LDX zp", 0xAE: "LDX abs", 0xB6: "LDX zp,Y", 0xBE: "LDX abs,Y",
  0xA0: "LDY #", 0xA4: "LDY zp", 0xAC: "LDY abs", 0xB4: "LDY zp,X", 0xBC: "LDY abs,X",
  0x85: "STA zp", 0x8D: "STA abs", 0x9D: "STA abs,X", 0x99: "STA abs,Y",
  0x81: "STA (zp,X)", 0x91: "STA (zp),Y", 0x95: "STA zp,X",
  0x86: "STX zp", 0x8E: "STX abs", 0x96: "STX zp,Y",
  0x84: "STY zp", 0x8C: "STY abs", 0x94: "STY zp,X",
  0x4C: "JMP abs", 0x6C: "JMP ind",
  0x20: "JSR abs", 0x60: "RTS", 0x40: "RTI",
  0xD0: "BNE", 0xF0: "BEQ", 0x10: "BPL", 0x30: "BMI", 0x90: "BCC", 0xB0: "BCS",
  0x50: "BVC", 0x70: "BVS",
  0xE8: "INX", 0xC8: "INY", 0xCA: "DEX", 0x88: "DEY",
  0xE6: "INC zp", 0xEE: "INC abs", 0xF6: "INC zp,X", 0xFE: "INC abs,X",
  0xC6: "DEC zp", 0xCE: "DEC abs", 0xD6: "DEC zp,X", 0xDE: "DEC abs,X",
  0xA8: "TAY", 0xAA: "TAX", 0x98: "TYA", 0x8A: "TXA", 0x9A: "TXS", 0xBA: "TSX",
  0x48: "PHA", 0x68: "PLA", 0x08: "PHP", 0x28: "PLP",
  0x18: "CLC", 0x38: "SEC", 0x58: "CLI", 0x78: "SEI", 0xB8: "CLV", 0xD8: "CLD", 0xF8: "SED",
  0x09: "ORA #", 0x05: "ORA zp", 0x0D: "ORA abs",
  0x29: "AND #", 0x25: "AND zp", 0x2D: "AND abs",
  0x49: "EOR #", 0x45: "EOR zp", 0x4D: "EOR abs",
  0x69: "ADC #", 0x65: "ADC zp", 0x6D: "ADC abs",
  0xE9: "SBC #", 0xE5: "SBC zp", 0xED: "SBC abs",
  0xC9: "CMP #", 0xC5: "CMP zp", 0xCD: "CMP abs",
  0xE0: "CPX #", 0xE4: "CPX zp", 0xEC: "CPX abs",
  0xC0: "CPY #", 0xC4: "CPY zp", 0xCC: "CPY abs",
  0x0A: "ASL A", 0x06: "ASL zp", 0x0E: "ASL abs",
  0x4A: "LSR A", 0x46: "LSR zp", 0x4E: "LSR abs",
  0x2A: "ROL A", 0x26: "ROL zp", 0x2E: "ROL abs",
  0x6A: "ROR A", 0x66: "ROR zp", 0x6E: "ROR abs",
  0x24: "BIT zp", 0x2C: "BIT abs",
  0xEA: "NOP", 0x00: "BRK"
};

// Cycle counts for standard 6502 instructions
export const OPCODE_CYCLES: Record<number, number> = {
  0xA9: 2, 0xA5: 3, 0xAD: 4, 0xBD: 4, 0xB9: 4, 0xA1: 6, 0xB1: 5, // LDA
  0xA2: 2, 0xA6: 3, 0xAE: 4, 0xB6: 4, 0xBE: 4, // LDX
  0xA0: 2, 0xA4: 3, 0xAC: 4, 0xB4: 4, 0xBC: 4, // LDY
  0x85: 3, 0x8D: 4, 0x9D: 5, 0x99: 5, 0x81: 6, 0x91: 6, 0x95: 4, // STA
  0x86: 3, 0x8E: 4, 0x96: 4, // STX
  0x84: 3, 0x8C: 4, 0x94: 4, // STY
  0x4C: 3, 0x6C: 5, // JMP
  0x20: 6, 0x60: 6, 0x40: 6, // JSR, RTS, RTI
  0xD0: 2, 0xF0: 2, 0x10: 2, 0x30: 2, 0x90: 2, 0xB0: 2, 0x50: 2, 0x70: 2, // Branches
  0xE8: 2, 0xC8: 2, 0xCA: 2, 0x88: 2, // INX, INY, DEX, DEY
  0xE6: 5, 0xEE: 6, 0xF6: 6, 0xFE: 7, // INC
  0xC6: 5, 0xCE: 6, 0xD6: 6, 0xDE: 7, // DEC
  0xA8: 2, 0xAA: 2, 0x98: 2, 0x8A: 2, 0x9A: 2, 0xBA: 2, // Transfers
  0x48: 3, 0x68: 4, 0x08: 3, 0x28: 4, // Stack
  0x18: 2, 0x38: 2, 0x58: 2, 0x78: 2, 0xB8: 2, 0xD8: 2, 0xF8: 2, // Flags
  0x09: 2, 0x05: 3, 0x0D: 4, // ORA
  0x29: 2, 0x25: 3, 0x2D: 4, // AND
  0x49: 2, 0x45: 3, 0x4D: 4, // EOR
  0x69: 2, 0x65: 3, 0x6D: 4, // ADC
  0xE9: 2, 0xE5: 3, 0xED: 4, // SBC
  0xC9: 2, 0xC5: 3, 0xCD: 4, // CMP
  0xE0: 2, 0xE4: 3, 0xEC: 4, // CPX
  0xC0: 2, 0xC4: 3, 0xCC: 4, // CPY
  0x0A: 2, 0x06: 5, 0x0E: 6, // ASL
  0x4A: 2, 0x46: 5, 0x4E: 6, // LSR
  0x2A: 2, 0x26: 5, 0x2E: 6, // ROL
  0x6A: 2, 0x66: 5, 0x6E: 6, // ROR
  0x24: 3, 0x2C: 4, // BIT
  0xEA: 2, 0x00: 7 // NOP, BRK
};

export interface BusInterface {
  read(addr: number): number;
  write(addr: number, val: number): void;
  setTiaInstructionCycleOffset?(offset: number): void;
}

export class CPU6502 {
  public registers: CpuRegisters;
  public lastInstruction: string = "RESET";

  private readonly bus: BusInterface;

  constructor(bus: BusInterface) {
    this.bus = bus;
    this.registers = this.getInitialRegisters();
  }

  private getInitialRegisters(): CpuRegisters {
    return {
      a: 0, x: 0, y: 0, sp: 0xFD, pc: 0x8000,
      flags: { C: false, Z: false, I: true, D: false, B: false, V: false, N: false }
    };
  }

  public reset() {
    this.registers = this.getInitialRegisters();
    this.lastInstruction = "RESET";

    // Read Reset Vector
    const low = this.bus.read(0xFFFC);
    const high = this.bus.read(0xFFFD);
    this.registers.pc = (high << 8) | low;

    // Safety for bad ROMs
    if (this.registers.pc === 0) {
      this.registers.pc = 0xF000;
    }
  }

  private push(val: number) {
    this.bus.write(0x100 + this.registers.sp, val);
    this.registers.sp = (this.registers.sp - 1) & 0xFF;
  }

  private pop(): number {
    this.registers.sp = (this.registers.sp + 1) & 0xFF;
    return this.bus.read(0x100 + this.registers.sp);
  }

  private setZN(val: number) {
    this.registers.flags.Z = (val === 0);
    this.registers.flags.N = (val & 0x80) !== 0;
  }

  private getByte(): number {
    const v = this.bus.read(this.registers.pc);
    this.registers.pc++;
    return v;
  }

  private getWord(): number {
    const l = this.getByte();
    const h = this.getByte();
    return (h << 8) | l;
  }

  // Addressing modes
  private addrImm(): number {
    const addr = this.registers.pc;
    this.registers.pc++;
    return addr;
  }

  private addrZp(): number {
    return this.getByte();
  }

  private addrZpX(): number {
    return (this.getByte() + this.registers.x) & 0xFF;
  }

  private addrZpY(): number {
    return (this.getByte() + this.registers.y) & 0xFF;
  }

  private addrAbs(): number {
    return this.getWord();
  }

  private addrAbsX(): number {
    return (this.getWord() + this.registers.x) & 0xFFFF;
  }

  private addrAbsY(): number {
    return (this.getWord() + this.registers.y) & 0xFFFF;
  }

  private addrAbsXWithPageCross(): { addr: number; pageCrossed: boolean } {
    const base = this.getWord();
    const addr = (base + this.registers.x) & 0xFFFF;
    return { addr, pageCrossed: (base & 0xFF00) !== (addr & 0xFF00) };
  }

  private addrAbsYWithPageCross(): { addr: number; pageCrossed: boolean } {
    const base = this.getWord();
    const addr = (base + this.registers.y) & 0xFFFF;
    return { addr, pageCrossed: (base & 0xFF00) !== (addr & 0xFF00) };
  }

  private addrIndX(): number {
    const zp = (this.getByte() + this.registers.x) & 0xFF;
    const lo = this.bus.read(zp);
    const hi = this.bus.read((zp + 1) & 0xFF);
    return (hi << 8) | lo;
  }

  private addrIndY(): number {
    const zp = this.getByte();
    const lo = this.bus.read(zp);
    const hi = this.bus.read((zp + 1) & 0xFF);
    return (((hi << 8) | lo) + this.registers.y) & 0xFFFF;
  }

  private addrIndYWithPageCross(): { addr: number; pageCrossed: boolean } {
    const zp = this.getByte();
    const lo = this.bus.read(zp);
    const hi = this.bus.read((zp + 1) & 0xFF);
    const base = (hi << 8) | lo;
    const addr = (base + this.registers.y) & 0xFFFF;
    return { addr, pageCrossed: (base & 0xFF00) !== (addr & 0xFF00) };
  }

  private setTiaWriteOffset(cpuCycle: number) {
    // The write happens during the second half of the final cycle.
    // Each CPU cycle is 3 color clocks.
    // Delaying by (cpuCycle - 1) * 3 + 2 puts the write near the end of the cycle.
    const delayClocks = Math.max(0, (cpuCycle - 1) * 3 + 2);
    this.bus.setTiaInstructionCycleOffset?.(delayClocks);
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  public clock(): number {
    const pc = this.registers.pc;
    const opcode = this.bus.read(pc);
    this.lastInstruction = OPCODE_NAMES[opcode] || `OP ${opcode.toString(16).toUpperCase()}`;
    this.registers.pc++;

    const cycles = OPCODE_CYCLES[opcode] || 2;
    let extraCycles = 0;

    // eslint-disable-next-line sonarjs/max-switch-cases
    switch (opcode) {
      // NOP
      case 0xEA: break;

      // LDA
      case 0xA9: this.registers.a = this.bus.read(this.addrImm()); this.setZN(this.registers.a); break;
      case 0xA5: this.registers.a = this.bus.read(this.addrZp()); this.setZN(this.registers.a); break;
      case 0xB5: this.registers.a = this.bus.read(this.addrZpX()); this.setZN(this.registers.a); break;
      case 0xAD: this.registers.a = this.bus.read(this.addrAbs()); this.setZN(this.registers.a); break;
      case 0xBD: {
        const { addr, pageCrossed } = this.addrAbsXWithPageCross();
        this.registers.a = this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0xB9: {
        const { addr, pageCrossed } = this.addrAbsYWithPageCross();
        this.registers.a = this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0xA1: this.registers.a = this.bus.read(this.addrIndX()); this.setZN(this.registers.a); break;
      case 0xB1: {
        const { addr, pageCrossed } = this.addrIndYWithPageCross();
        this.registers.a = this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }

      // LDX
      case 0xA2: this.registers.x = this.bus.read(this.addrImm()); this.setZN(this.registers.x); break;
      case 0xA6: this.registers.x = this.bus.read(this.addrZp()); this.setZN(this.registers.x); break;
      case 0xB6: this.registers.x = this.bus.read(this.addrZpY()); this.setZN(this.registers.x); break;
      case 0xAE: this.registers.x = this.bus.read(this.addrAbs()); this.setZN(this.registers.x); break;
      case 0xBE: {
        const { addr, pageCrossed } = this.addrAbsYWithPageCross();
        this.registers.x = this.bus.read(addr); this.setZN(this.registers.x);
        if (pageCrossed) extraCycles++;
        break;
      }

      // LDY
      case 0xA0: this.registers.y = this.bus.read(this.addrImm()); this.setZN(this.registers.y); break;
      case 0xA4: this.registers.y = this.bus.read(this.addrZp()); this.setZN(this.registers.y); break;
      case 0xB4: this.registers.y = this.bus.read(this.addrZpX()); this.setZN(this.registers.y); break;
      case 0xAC: this.registers.y = this.bus.read(this.addrAbs()); this.setZN(this.registers.y); break;
      case 0xBC: {
        const { addr, pageCrossed } = this.addrAbsXWithPageCross();
        this.registers.y = this.bus.read(addr); this.setZN(this.registers.y);
        if (pageCrossed) extraCycles++;
        break;
      }

      // STA
      case 0x85: this.setTiaWriteOffset(3); this.bus.write(this.addrZp(), this.registers.a); break;
      case 0x95: this.setTiaWriteOffset(4); this.bus.write(this.addrZpX(), this.registers.a); break;
      case 0x8D: this.setTiaWriteOffset(4); this.bus.write(this.addrAbs(), this.registers.a); break;
      case 0x9D: this.setTiaWriteOffset(5); this.bus.write(this.addrAbsX(), this.registers.a); break;
      case 0x99: this.setTiaWriteOffset(5); this.bus.write(this.addrAbsY(), this.registers.a); break;
      case 0x81: this.setTiaWriteOffset(6); this.bus.write(this.addrIndX(), this.registers.a); break;
      case 0x91: this.setTiaWriteOffset(6); this.bus.write(this.addrIndY(), this.registers.a); break;

      // STX
      case 0x86: this.setTiaWriteOffset(3); this.bus.write(this.addrZp(), this.registers.x); break;
      case 0x96: this.setTiaWriteOffset(4); this.bus.write(this.addrZpY(), this.registers.x); break;
      case 0x8E: this.setTiaWriteOffset(4); this.bus.write(this.addrAbs(), this.registers.x); break;

      // STY
      case 0x84: this.setTiaWriteOffset(3); this.bus.write(this.addrZp(), this.registers.y); break;
      case 0x94: this.setTiaWriteOffset(4); this.bus.write(this.addrZpX(), this.registers.y); break;
      case 0x8C: this.setTiaWriteOffset(4); this.bus.write(this.addrAbs(), this.registers.y); break;

      // JMP
      case 0x4C: this.registers.pc = this.addrAbs(); break;
      case 0x6C: {
        const addr = this.addrAbs();
        const lo = this.bus.read(addr);
        const hi = this.bus.read((addr & 0xFF00) | ((addr + 1) & 0xFF));
        this.registers.pc = (hi << 8) | lo;
        break;
      }

      // JSR / RTS / RTI
      case 0x20: {
        const tgt = this.addrAbs();
        this.push((this.registers.pc - 1) >> 8);
        this.push((this.registers.pc - 1) & 0xFF);
        this.registers.pc = tgt;
        break;
      }
      case 0x60: {
        const lo = this.pop();
        const hi = this.pop();
        this.registers.pc = ((hi << 8) | lo) + 1;
        break;
      }
      case 0x40: {
        const flags = this.pop();
        this.registers.flags.C = !!(flags & 0x01);
        this.registers.flags.Z = !!(flags & 0x02);
        this.registers.flags.I = !!(flags & 0x04);
        this.registers.flags.D = !!(flags & 0x08);
        this.registers.flags.V = !!(flags & 0x40);
        this.registers.flags.N = !!(flags & 0x80);
        const lo = this.pop();
        const hi = this.pop();
        this.registers.pc = (hi << 8) | lo;
        break;
      }

      // Branches
      case 0xD0: {
        const offset = this.getByte();
        if (!this.registers.flags.Z) {
          const oldPc = this.registers.pc;
          this.registers.pc += (offset > 127 ? offset - 256 : offset);
          extraCycles++;
          if ((oldPc & 0xFF00) !== (this.registers.pc & 0xFF00)) extraCycles++;
        }
        break;
      }
      case 0xF0: {
        const offset = this.getByte();
        if (this.registers.flags.Z) {
          const oldPc = this.registers.pc;
          this.registers.pc += (offset > 127 ? offset - 256 : offset);
          extraCycles++;
          if ((oldPc & 0xFF00) !== (this.registers.pc & 0xFF00)) extraCycles++;
        }
        break;
      }
      case 0x10: {
        const offset = this.getByte();
        if (!this.registers.flags.N) {
          const oldPc = this.registers.pc;
          this.registers.pc += (offset > 127 ? offset - 256 : offset);
          extraCycles++;
          if ((oldPc & 0xFF00) !== (this.registers.pc & 0xFF00)) extraCycles++;
        }
        break;
      }
      case 0x30: {
        const offset = this.getByte();
        if (this.registers.flags.N) {
          const oldPc = this.registers.pc;
          this.registers.pc += (offset > 127 ? offset - 256 : offset);
          extraCycles++;
          if ((oldPc & 0xFF00) !== (this.registers.pc & 0xFF00)) extraCycles++;
        }
        break;
      }
      case 0x90: {
        const offset = this.getByte();
        if (!this.registers.flags.C) {
          const oldPc = this.registers.pc;
          this.registers.pc += (offset > 127 ? offset - 256 : offset);
          extraCycles++;
          if ((oldPc & 0xFF00) !== (this.registers.pc & 0xFF00)) extraCycles++;
        }
        break;
      }
      case 0xB0: {
        const offset = this.getByte();
        if (this.registers.flags.C) {
          const oldPc = this.registers.pc;
          this.registers.pc += (offset > 127 ? offset - 256 : offset);
          extraCycles++;
          if ((oldPc & 0xFF00) !== (this.registers.pc & 0xFF00)) extraCycles++;
        }
        break;
      }
      case 0x50: {
        const offset = this.getByte();
        if (!this.registers.flags.V) {
          const oldPc = this.registers.pc;
          this.registers.pc += (offset > 127 ? offset - 256 : offset);
          extraCycles++;
          if ((oldPc & 0xFF00) !== (this.registers.pc & 0xFF00)) extraCycles++;
        }
        break;
      }
      case 0x70: {
        const offset = this.getByte();
        if (this.registers.flags.V) {
          const oldPc = this.registers.pc;
          this.registers.pc += (offset > 127 ? offset - 256 : offset);
          extraCycles++;
          if ((oldPc & 0xFF00) !== (this.registers.pc & 0xFF00)) extraCycles++;
        }
        break;
      }

      // INC/DEC Register
      case 0xE8: this.registers.x = (this.registers.x + 1) & 0xFF; this.setZN(this.registers.x); break;
      case 0xC8: this.registers.y = (this.registers.y + 1) & 0xFF; this.setZN(this.registers.y); break;
      case 0xCA: this.registers.x = (this.registers.x - 1) & 0xFF; this.setZN(this.registers.x); break;
      case 0x88: this.registers.y = (this.registers.y - 1) & 0xFF; this.setZN(this.registers.y); break;

      // INC Memory
      case 0xE6: { const addr = this.addrZp(); let v = (this.bus.read(addr) + 1) & 0xFF; this.bus.write(addr, v); this.setZN(v); break; }
      case 0xF6: { const addr = this.addrZpX(); let v = (this.bus.read(addr) + 1) & 0xFF; this.bus.write(addr, v); this.setZN(v); break; }
      case 0xEE: { const addr = this.addrAbs(); let v = (this.bus.read(addr) + 1) & 0xFF; this.bus.write(addr, v); this.setZN(v); break; }
      case 0xFE: { const addr = this.addrAbsX(); let v = (this.bus.read(addr) + 1) & 0xFF; this.bus.write(addr, v); this.setZN(v); break; }

      // DEC Memory
      case 0xC6: { const addr = this.addrZp(); let v = (this.bus.read(addr) - 1) & 0xFF; this.bus.write(addr, v); this.setZN(v); break; }
      case 0xD6: { const addr = this.addrZpX(); let v = (this.bus.read(addr) - 1) & 0xFF; this.bus.write(addr, v); this.setZN(v); break; }
      case 0xCE: { const addr = this.addrAbs(); let v = (this.bus.read(addr) - 1) & 0xFF; this.bus.write(addr, v); this.setZN(v); break; }
      case 0xDE: { const addr = this.addrAbsX(); let v = (this.bus.read(addr) - 1) & 0xFF; this.bus.write(addr, v); this.setZN(v); break; }

      // Transfers
      case 0xAA: this.registers.x = this.registers.a; this.setZN(this.registers.x); break;
      case 0xA8: this.registers.y = this.registers.a; this.setZN(this.registers.y); break;
      case 0x8A: this.registers.a = this.registers.x; this.setZN(this.registers.a); break;
      case 0x98: this.registers.a = this.registers.y; this.setZN(this.registers.a); break;
      case 0x9A: this.registers.sp = this.registers.x; break;
      case 0xBA: this.registers.x = this.registers.sp; this.setZN(this.registers.x); break;

      // Stack
      case 0x48: this.push(this.registers.a); break;
      case 0x68: this.registers.a = this.pop(); this.setZN(this.registers.a); break;
      case 0x08: {
        let p = 0x20; // Bit 5 always set
        if (this.registers.flags.C) p |= 0x01;
        if (this.registers.flags.Z) p |= 0x02;
        if (this.registers.flags.I) p |= 0x04;
        if (this.registers.flags.D) p |= 0x08;
        p |= 0x10; // B flag set on PHP
        if (this.registers.flags.V) p |= 0x40;
        if (this.registers.flags.N) p |= 0x80;
        this.push(p);
        break;
      }
      case 0x28: {
        const p = this.pop();
        this.registers.flags.C = !!(p & 0x01);
        this.registers.flags.Z = !!(p & 0x02);
        this.registers.flags.I = !!(p & 0x04);
        this.registers.flags.D = !!(p & 0x08);
        this.registers.flags.V = !!(p & 0x40);
        this.registers.flags.N = !!(p & 0x80);
        break;
      }

      // Flags
      case 0x18: this.registers.flags.C = false; break;
      case 0x38: this.registers.flags.C = true; break;
      case 0x58: this.registers.flags.I = false; break;
      case 0x78: this.registers.flags.I = true; break;
      case 0xB8: this.registers.flags.V = false; break;
      case 0xD8: this.registers.flags.D = false; break;
      case 0xF8: this.registers.flags.D = true; break;

      // ORA
      case 0x09: this.registers.a |= this.bus.read(this.addrImm()); this.setZN(this.registers.a); break;
      case 0x05: this.registers.a |= this.bus.read(this.addrZp()); this.setZN(this.registers.a); break;
      case 0x15: this.registers.a |= this.bus.read(this.addrZpX()); this.setZN(this.registers.a); break;
      case 0x0D: this.registers.a |= this.bus.read(this.addrAbs()); this.setZN(this.registers.a); break;
      case 0x1D: {
        const { addr, pageCrossed } = this.addrAbsXWithPageCross();
        this.registers.a |= this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0x19: {
        const { addr, pageCrossed } = this.addrAbsYWithPageCross();
        this.registers.a |= this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0x01: this.registers.a |= this.bus.read(this.addrIndX()); this.setZN(this.registers.a); break;
      case 0x11: {
        const { addr, pageCrossed } = this.addrIndYWithPageCross();
        this.registers.a |= this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }

      // AND
      case 0x29: this.registers.a &= this.bus.read(this.addrImm()); this.setZN(this.registers.a); break;
      case 0x25: this.registers.a &= this.bus.read(this.addrZp()); this.setZN(this.registers.a); break;
      case 0x35: this.registers.a &= this.bus.read(this.addrZpX()); this.setZN(this.registers.a); break;
      case 0x2D: this.registers.a &= this.bus.read(this.addrAbs()); this.setZN(this.registers.a); break;
      case 0x3D: {
        const { addr, pageCrossed } = this.addrAbsXWithPageCross();
        this.registers.a &= this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0x39: {
        const { addr, pageCrossed } = this.addrAbsYWithPageCross();
        this.registers.a &= this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0x21: this.registers.a &= this.bus.read(this.addrIndX()); this.setZN(this.registers.a); break;
      case 0x31: {
        const { addr, pageCrossed } = this.addrIndYWithPageCross();
        this.registers.a &= this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }

      // EOR
      case 0x49: this.registers.a ^= this.bus.read(this.addrImm()); this.setZN(this.registers.a); break;
      case 0x45: this.registers.a ^= this.bus.read(this.addrZp()); this.setZN(this.registers.a); break;
      case 0x55: this.registers.a ^= this.bus.read(this.addrZpX()); this.setZN(this.registers.a); break;
      case 0x4D: this.registers.a ^= this.bus.read(this.addrAbs()); this.setZN(this.registers.a); break;
      case 0x5D: {
        const { addr, pageCrossed } = this.addrAbsXWithPageCross();
        this.registers.a ^= this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0x59: {
        const { addr, pageCrossed } = this.addrAbsYWithPageCross();
        this.registers.a ^= this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0x41: this.registers.a ^= this.bus.read(this.addrIndX()); this.setZN(this.registers.a); break;
      case 0x51: {
        const { addr, pageCrossed } = this.addrIndYWithPageCross();
        this.registers.a ^= this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }

      // ADC
      case 0x69: this.adc(this.bus.read(this.addrImm())); break;
      case 0x65: this.adc(this.bus.read(this.addrZp())); break;
      case 0x75: this.adc(this.bus.read(this.addrZpX())); break;
      case 0x6D: this.adc(this.bus.read(this.addrAbs())); break;
      case 0x7D: {
        const { addr, pageCrossed } = this.addrAbsXWithPageCross();
        this.adc(this.bus.read(addr));
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0x79: {
        const { addr, pageCrossed } = this.addrAbsYWithPageCross();
        this.adc(this.bus.read(addr));
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0x61: this.adc(this.bus.read(this.addrIndX())); break;
      case 0x71: {
        const { addr, pageCrossed } = this.addrIndYWithPageCross();
        this.adc(this.bus.read(addr));
        if (pageCrossed) extraCycles++;
        break;
      }

      // SBC
      case 0xE9: this.sbc(this.bus.read(this.addrImm())); break;
      case 0xE5: this.sbc(this.bus.read(this.addrZp())); break;
      case 0xF5: this.sbc(this.bus.read(this.addrZpX())); break;
      case 0xED: this.sbc(this.bus.read(this.addrAbs())); break;
      case 0xFD: {
        const { addr, pageCrossed } = this.addrAbsXWithPageCross();
        this.sbc(this.bus.read(addr));
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0xF9: {
        const { addr, pageCrossed } = this.addrAbsYWithPageCross();
        this.sbc(this.bus.read(addr));
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0xE1: this.sbc(this.bus.read(this.addrIndX())); break;
      case 0xF1: {
        const { addr, pageCrossed } = this.addrIndYWithPageCross();
        this.sbc(this.bus.read(addr));
        if (pageCrossed) extraCycles++;
        break;
      }

      // CMP
      case 0xC9: this.cmp(this.registers.a, this.bus.read(this.addrImm())); break;
      case 0xC5: this.cmp(this.registers.a, this.bus.read(this.addrZp())); break;
      case 0xD5: this.cmp(this.registers.a, this.bus.read(this.addrZpX())); break;
      case 0xCD: this.cmp(this.registers.a, this.bus.read(this.addrAbs())); break;
      case 0xDD: {
        const { addr, pageCrossed } = this.addrAbsXWithPageCross();
        this.cmp(this.registers.a, this.bus.read(addr));
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0xD9: {
        const { addr, pageCrossed } = this.addrAbsYWithPageCross();
        this.cmp(this.registers.a, this.bus.read(addr));
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0xC1: this.cmp(this.registers.a, this.bus.read(this.addrIndX())); break;
      case 0xD1: {
        const { addr, pageCrossed } = this.addrIndYWithPageCross();
        this.cmp(this.registers.a, this.bus.read(addr));
        if (pageCrossed) extraCycles++;
        break;
      }

      // CPX
      case 0xE0: this.cmp(this.registers.x, this.bus.read(this.addrImm())); break;
      case 0xE4: this.cmp(this.registers.x, this.bus.read(this.addrZp())); break;
      case 0xEC: this.cmp(this.registers.x, this.bus.read(this.addrAbs())); break;

      // CPY
      case 0xC0: this.cmp(this.registers.y, this.bus.read(this.addrImm())); break;
      case 0xC4: this.cmp(this.registers.y, this.bus.read(this.addrZp())); break;
      case 0xCC: this.cmp(this.registers.y, this.bus.read(this.addrAbs())); break;

      // ASL
      case 0x0A: this.registers.a = this.asl(this.registers.a); break;
      case 0x06: { const addr = this.addrZp(); this.bus.write(addr, this.asl(this.bus.read(addr))); break; }
      case 0x16: { const addr = this.addrZpX(); this.bus.write(addr, this.asl(this.bus.read(addr))); break; }
      case 0x0E: { const addr = this.addrAbs(); this.bus.write(addr, this.asl(this.bus.read(addr))); break; }
      case 0x1E: { const addr = this.addrAbsX(); this.bus.write(addr, this.asl(this.bus.read(addr))); break; }

      // LSR
      case 0x4A: this.registers.a = this.lsr(this.registers.a); break;
      case 0x46: { const addr = this.addrZp(); this.bus.write(addr, this.lsr(this.bus.read(addr))); break; }
      case 0x56: { const addr = this.addrZpX(); this.bus.write(addr, this.lsr(this.bus.read(addr))); break; }
      case 0x4E: { const addr = this.addrAbs(); this.bus.write(addr, this.lsr(this.bus.read(addr))); break; }
      case 0x5E: { const addr = this.addrAbsX(); this.bus.write(addr, this.lsr(this.bus.read(addr))); break; }

      // ROL
      case 0x2A: this.registers.a = this.rol(this.registers.a); break;
      case 0x26: { const addr = this.addrZp(); this.bus.write(addr, this.rol(this.bus.read(addr))); break; }
      case 0x36: { const addr = this.addrZpX(); this.bus.write(addr, this.rol(this.bus.read(addr))); break; }
      case 0x2E: { const addr = this.addrAbs(); this.bus.write(addr, this.rol(this.bus.read(addr))); break; }
      case 0x3E: { const addr = this.addrAbsX(); this.bus.write(addr, this.rol(this.bus.read(addr))); break; }

      // ROR
      case 0x6A: this.registers.a = this.ror(this.registers.a); break;
      case 0x66: { const addr = this.addrZp(); this.bus.write(addr, this.ror(this.bus.read(addr))); break; }
      case 0x76: { const addr = this.addrZpX(); this.bus.write(addr, this.ror(this.bus.read(addr))); break; }
      case 0x6E: { const addr = this.addrAbs(); this.bus.write(addr, this.ror(this.bus.read(addr))); break; }
      case 0x7E: { const addr = this.addrAbsX(); this.bus.write(addr, this.ror(this.bus.read(addr))); break; }

      // BIT
      case 0x24: this.bit(this.bus.read(this.addrZp())); break;
      case 0x2C: this.bit(this.bus.read(this.addrAbs())); break;

      // BRK
      case 0x00: {
        this.registers.pc++;
        this.push(this.registers.pc >> 8);
        this.push(this.registers.pc & 0xFF);
        let p = 0x30; // B and bit 5 set
        if (this.registers.flags.C) p |= 0x01;
        if (this.registers.flags.Z) p |= 0x02;
        if (this.registers.flags.I) p |= 0x04;
        if (this.registers.flags.D) p |= 0x08;
        if (this.registers.flags.V) p |= 0x40;
        if (this.registers.flags.N) p |= 0x80;
        this.push(p);
        this.registers.flags.I = true;
        const lo = this.bus.read(0xFFFE);
        const hi = this.bus.read(0xFFFF);
        this.registers.pc = (hi << 8) | lo;
        break;
      }

      // ==================== ILLEGAL/UNDOCUMENTED OPCODES ====================

      // SLO (ASL + ORA) - Shift left then OR with A
      case 0x07: { const addr = this.addrZp(); const v = this.asl(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a |= v; this.setZN(this.registers.a); break; }
      case 0x17: { const addr = this.addrZpX(); const v = this.asl(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a |= v; this.setZN(this.registers.a); break; }
      case 0x0F: { const addr = this.addrAbs(); const v = this.asl(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a |= v; this.setZN(this.registers.a); break; }
      case 0x1F: { const addr = this.addrAbsX(); const v = this.asl(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a |= v; this.setZN(this.registers.a); break; }
      case 0x1B: { const addr = this.addrAbsY(); const v = this.asl(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a |= v; this.setZN(this.registers.a); break; }
      case 0x03: { const addr = this.addrIndX(); const v = this.asl(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a |= v; this.setZN(this.registers.a); break; }
      case 0x13: { const addr = this.addrIndY(); const v = this.asl(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a |= v; this.setZN(this.registers.a); break; }

      // RLA (ROL + AND) - Rotate left then AND with A
      case 0x27: { const addr = this.addrZp(); const v = this.rol(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a &= v; this.setZN(this.registers.a); break; }
      case 0x37: { const addr = this.addrZpX(); const v = this.rol(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a &= v; this.setZN(this.registers.a); break; }
      case 0x2F: { const addr = this.addrAbs(); const v = this.rol(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a &= v; this.setZN(this.registers.a); break; }
      case 0x3F: { const addr = this.addrAbsX(); const v = this.rol(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a &= v; this.setZN(this.registers.a); break; }
      case 0x3B: { const addr = this.addrAbsY(); const v = this.rol(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a &= v; this.setZN(this.registers.a); break; }
      case 0x23: { const addr = this.addrIndX(); const v = this.rol(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a &= v; this.setZN(this.registers.a); break; }
      case 0x33: { const addr = this.addrIndY(); const v = this.rol(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a &= v; this.setZN(this.registers.a); break; }

      // SRE (LSR + EOR) - Shift right then XOR with A
      case 0x47: { const addr = this.addrZp(); const v = this.lsr(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a ^= v; this.setZN(this.registers.a); break; }
      case 0x57: { const addr = this.addrZpX(); const v = this.lsr(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a ^= v; this.setZN(this.registers.a); break; }
      case 0x4F: { const addr = this.addrAbs(); const v = this.lsr(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a ^= v; this.setZN(this.registers.a); break; }
      case 0x5F: { const addr = this.addrAbsX(); const v = this.lsr(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a ^= v; this.setZN(this.registers.a); break; }
      case 0x5B: { const addr = this.addrAbsY(); const v = this.lsr(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a ^= v; this.setZN(this.registers.a); break; }
      case 0x43: { const addr = this.addrIndX(); const v = this.lsr(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a ^= v; this.setZN(this.registers.a); break; }
      case 0x53: { const addr = this.addrIndY(); const v = this.lsr(this.bus.read(addr)); this.bus.write(addr, v); this.registers.a ^= v; this.setZN(this.registers.a); break; }

      // RRA (ROR + ADC) - Rotate right then add with carry
      case 0x67: { const addr = this.addrZp(); const v = this.ror(this.bus.read(addr)); this.bus.write(addr, v); this.adc(v); break; }
      case 0x77: { const addr = this.addrZpX(); const v = this.ror(this.bus.read(addr)); this.bus.write(addr, v); this.adc(v); break; }
      case 0x6F: { const addr = this.addrAbs(); const v = this.ror(this.bus.read(addr)); this.bus.write(addr, v); this.adc(v); break; }
      case 0x7F: { const addr = this.addrAbsX(); const v = this.ror(this.bus.read(addr)); this.bus.write(addr, v); this.adc(v); break; }
      case 0x7B: { const addr = this.addrAbsY(); const v = this.ror(this.bus.read(addr)); this.bus.write(addr, v); this.adc(v); break; }
      case 0x63: { const addr = this.addrIndX(); const v = this.ror(this.bus.read(addr)); this.bus.write(addr, v); this.adc(v); break; }
      case 0x73: { const addr = this.addrIndY(); const v = this.ror(this.bus.read(addr)); this.bus.write(addr, v); this.adc(v); break; }

      // SAX (store A & X)
      case 0x87: this.setTiaWriteOffset(3); this.bus.write(this.addrZp(), this.registers.a & this.registers.x); break;
      case 0x97: this.setTiaWriteOffset(4); this.bus.write(this.addrZpY(), this.registers.a & this.registers.x); break;
      case 0x8F: this.setTiaWriteOffset(4); this.bus.write(this.addrAbs(), this.registers.a & this.registers.x); break;
      case 0x83: this.setTiaWriteOffset(6); this.bus.write(this.addrIndX(), this.registers.a & this.registers.x); break;

      // LAX (load A and X with same value)
      case 0xA7: this.registers.a = this.registers.x = this.bus.read(this.addrZp()); this.setZN(this.registers.a); break;
      case 0xB7: this.registers.a = this.registers.x = this.bus.read(this.addrZpY()); this.setZN(this.registers.a); break;
      case 0xAF: this.registers.a = this.registers.x = this.bus.read(this.addrAbs()); this.setZN(this.registers.a); break;
      case 0xBF: {
        const { addr, pageCrossed } = this.addrAbsYWithPageCross();
        this.registers.a = this.registers.x = this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }
      case 0xA3: this.registers.a = this.registers.x = this.bus.read(this.addrIndX()); this.setZN(this.registers.a); break;
      case 0xB3: {
        const { addr, pageCrossed } = this.addrIndYWithPageCross();
        this.registers.a = this.registers.x = this.bus.read(addr); this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }

      // DCP (DEC + CMP) - Decrement memory then compare with A
      case 0xC7: { const addr = this.addrZp(); const v = (this.bus.read(addr) - 1) & 0xFF; this.bus.write(addr, v); this.cmp(this.registers.a, v); break; }
      case 0xD7: { const addr = this.addrZpX(); const v = (this.bus.read(addr) - 1) & 0xFF; this.bus.write(addr, v); this.cmp(this.registers.a, v); break; }
      case 0xCF: { const addr = this.addrAbs(); const v = (this.bus.read(addr) - 1) & 0xFF; this.bus.write(addr, v); this.cmp(this.registers.a, v); break; }
      case 0xDF: { const addr = this.addrAbsX(); const v = (this.bus.read(addr) - 1) & 0xFF; this.bus.write(addr, v); this.cmp(this.registers.a, v); break; }
      case 0xDB: { const addr = this.addrAbsY(); const v = (this.bus.read(addr) - 1) & 0xFF; this.bus.write(addr, v); this.cmp(this.registers.a, v); break; }
      case 0xC3: { const addr = this.addrIndX(); const v = (this.bus.read(addr) - 1) & 0xFF; this.bus.write(addr, v); this.cmp(this.registers.a, v); break; }
      case 0xD3: { const addr = this.addrIndY(); const v = (this.bus.read(addr) - 1) & 0xFF; this.bus.write(addr, v); this.cmp(this.registers.a, v); break; }

      // ISC/ISB (INC + SBC) - Increment memory then subtract from A
      case 0xE7: { const addr = this.addrZp(); const v = (this.bus.read(addr) + 1) & 0xFF; this.bus.write(addr, v); this.sbc(v); break; }
      case 0xF7: { const addr = this.addrZpX(); const v = (this.bus.read(addr) + 1) & 0xFF; this.bus.write(addr, v); this.sbc(v); break; }
      case 0xEF: { const addr = this.addrAbs(); const v = (this.bus.read(addr) + 1) & 0xFF; this.bus.write(addr, v); this.sbc(v); break; }
      case 0xFF: { const addr = this.addrAbsX(); const v = (this.bus.read(addr) + 1) & 0xFF; this.bus.write(addr, v); this.sbc(v); break; }
      case 0xFB: { const addr = this.addrAbsY(); const v = (this.bus.read(addr) + 1) & 0xFF; this.bus.write(addr, v); this.sbc(v); break; }
      case 0xE3: { const addr = this.addrIndX(); const v = (this.bus.read(addr) + 1) & 0xFF; this.bus.write(addr, v); this.sbc(v); break; }
      case 0xF3: { const addr = this.addrIndY(); const v = (this.bus.read(addr) + 1) & 0xFF; this.bus.write(addr, v); this.sbc(v); break; }

      // ANC (AND + set C from bit 7)
      case 0x0B:
      case 0x2B: {
        this.registers.a &= this.bus.read(this.addrImm());
        this.setZN(this.registers.a);
        this.registers.flags.C = !!(this.registers.a & 0x80);
        break;
      }

      // ALR/ASR (AND + LSR)
      case 0x4B: {
        this.registers.a &= this.bus.read(this.addrImm());
        this.registers.flags.C = !!(this.registers.a & 0x01);
        this.registers.a >>= 1;
        this.setZN(this.registers.a);
        break;
      }

      // ARR (AND + ROR with special flag handling)
      // Based on Lorenz test arrb.asm expected behavior
      case 0x6B: {
        const operand = this.bus.read(this.addrImm());
        const andResult = this.registers.a & operand;

        // ROR the AND result using current carry
        this.registers.a = (andResult >> 1) | (this.registers.flags.C ? 0x80 : 0);
        this.setZN(this.registers.a);

        if (this.registers.flags.D) {
          // Decimal mode: More complex behavior
          // V = bit 6 of ROR result XOR bit 6 of AND result
          this.registers.flags.V = !!((andResult ^ this.registers.a) & 0x40);

          // Low nibble adjustment: if (andResult & 0x0F) > 0x05
          if ((andResult & 0x0F) >= 0x05) {
            this.registers.a = (this.registers.a & 0xF0) | ((this.registers.a + 0x06) & 0x0F);
          }

          // High nibble adjustment and carry: if (andResult & 0xF0) >= 0x50
          if ((andResult & 0xF0) >= 0x50) {
            this.registers.a = (this.registers.a + 0x60) & 0xFF;
            this.registers.flags.C = true;
          } else {
            this.registers.flags.C = false;
          }
        } else {
          // Binary mode: C = bit 6, V = bit 6 XOR bit 5
          this.registers.flags.C = !!(this.registers.a & 0x40);
          this.registers.flags.V = !!(((this.registers.a >> 6) ^ (this.registers.a >> 5)) & 1);
        }
        break;
      }

      // SBX/AXS (A & X - operand -> X)
      // X = (A & X) - operand, flags set like CMP
      case 0xCB: {
        const operand = this.bus.read(this.addrImm());
        const tmp = this.registers.a & this.registers.x;
        const result = (tmp - operand) & 0xFF;
        this.registers.flags.N = !!(result & 0x80);
        this.registers.flags.Z = result === 0;
        this.registers.flags.C = tmp >= operand;
        this.registers.x = result;
        break;
      }

      // LXA/LAX immediate (highly unstable - (A | MAGIC) & operand -> A, X)
      // Magic constant is 0xEE for C64 compatibility (Lorenz tests expect this)
      case 0xAB: {
        const operand = this.bus.read(this.addrImm());
        this.registers.a = this.registers.x = ((this.registers.a | 0xEE) & operand);
        this.setZN(this.registers.a);
        break;
      }

      // ANE/XAA (highly unstable - (A | MAGIC) & X & operand -> A)
      // Magic constant is 0xEE for C64 compatibility (Lorenz tests expect this)
      case 0x8B: {
        const operand = this.bus.read(this.addrImm());
        this.registers.a = ((this.registers.a | 0xEE) & this.registers.x & operand);
        this.setZN(this.registers.a);
        break;
      }

      // SHA/AHX (store A & X & (high byte + 1))
      case 0x9F: {
        const base = this.getWord();
        const addr = (base + this.registers.y) & 0xFFFF;
        const value = this.registers.a & this.registers.x & (((base >> 8) + 1) & 0xFF);
        this.bus.write(addr, value);
        break;
      }
      case 0x93: {
        const zp = this.getByte();
        const lo = this.bus.read(zp);
        const hi = this.bus.read((zp + 1) & 0xFF);
        const base = (hi << 8) | lo;
        const addr = (base + this.registers.y) & 0xFFFF;
        const value = this.registers.a & this.registers.x & (((base >> 8) + 1) & 0xFF);
        this.bus.write(addr, value);
        break;
      }

      // SHX/SXA (store X & (high byte + 1)) with page crossing behavior
      case 0x9E: {
        const base = this.getWord();
        let addr = (base + this.registers.y) & 0xFFFF;
        const value = this.registers.x & (((base >> 8) + 1) & 0xFF);
        // If page crossing occurred, modify the high byte of effective address
        if ((base & 0xFF) + this.registers.y > 0xFF) {
          addr = (addr & 0xFF) | (value << 8);
        }
        this.bus.write(addr, value);
        break;
      }

      // SHY/SYA (store Y & (high byte + 1)) with page crossing behavior
      case 0x9C: {
        const base = this.getWord();
        let addr = (base + this.registers.x) & 0xFFFF;
        const value = this.registers.y & (((base >> 8) + 1) & 0xFF);
        // If page crossing occurred, modify the high byte of effective address
        if ((base & 0xFF) + this.registers.x > 0xFF) {
          addr = (addr & 0xFF) | (value << 8);
        }
        this.bus.write(addr, value);
        break;
      }

      // TAS/SHS (A & X -> SP, then store SP & (high byte + 1))
      case 0x9B: {
        this.registers.sp = this.registers.a & this.registers.x;
        const base = this.getWord();
        const addr = (base + this.registers.y) & 0xFFFF;
        const value = this.registers.sp & (((base >> 8) + 1) & 0xFF);
        this.bus.write(addr, value);
        break;
      }

      // LAS/LAR (mem & SP -> A, X, SP)
      case 0xBB: {
        const { addr, pageCrossed } = this.addrAbsYWithPageCross();
        const val = this.bus.read(addr) & this.registers.sp;
        this.registers.a = this.registers.x = this.registers.sp = val;
        this.setZN(this.registers.a);
        if (pageCrossed) extraCycles++;
        break;
      }

      // Illegal SBC (same as regular SBC)
      case 0xEB: this.sbc(this.bus.read(this.addrImm())); break;

      // Illegal NOPs (various addressing modes)
      case 0x1A: case 0x3A: case 0x5A: case 0x7A: case 0xDA: case 0xFA: break; // 1-byte NOPs
      case 0x80: case 0x82: case 0x89: case 0xC2: case 0xE2: this.addrImm(); break; // 2-byte NOPs
      case 0x04: case 0x44: case 0x64: this.addrZp(); break; // 2-byte NOPs (zp)
      case 0x14: case 0x34: case 0x54: case 0x74: case 0xD4: case 0xF4: this.addrZpX(); break; // 2-byte NOPs (zp,x)
      case 0x0C: this.addrAbs(); break; // 3-byte NOP (abs)
      case 0x1C: case 0x3C: case 0x5C: case 0x7C: case 0xDC: case 0xFC: this.addrAbsX(); break; // 3-byte NOPs (abs,x)

      // JAM/KIL (halt the CPU - we just do nothing and stay at same PC)
      case 0x02: case 0x12: case 0x22: case 0x32: case 0x42: case 0x52:
      case 0x62: case 0x72: case 0x92: case 0xB2: case 0xD2: case 0xF2:
        this.registers.pc--; // Stay at same instruction (halt)
        break;

      default: break;
    }

    return cycles + extraCycles;
  }

  private adc(val: number) {
    const a = this.registers.a;
    const carry = this.registers.flags.C ? 1 : 0;

    if (this.registers.flags.D) {
      // BCD (Decimal) mode - NMOS 6502 behavior
      // Reference: http://www.6502.org/tutorials/decimal_mode.html

      // Binary result for Z flag
      const binResult = a + val + carry;
      this.registers.flags.Z = (binResult & 0xFF) === 0;

      // Low nibble with BCD adjust
      let al = (a & 0x0F) + (val & 0x0F) + carry;
      if (al > 9) al += 6;

      // Intermediate result after low nibble adjust
      let ah = (a & 0xF0) + (val & 0xF0) + (al > 0x0F ? 0x10 : 0) + (al & 0x0F);

      // N flag based on bit 7 of intermediate result
      this.registers.flags.N = !!(ah & 0x80);

      // V flag: overflow from intermediate result
      this.registers.flags.V = !!(((a ^ ah) & ~(a ^ val)) & 0x80);

      // High nibble BCD adjust
      if ((ah & 0x1F0) > 0x90) ah += 0x60;

      // C flag from final result
      this.registers.flags.C = ah > 0xFF;

      this.registers.a = ah & 0xFF;
    } else {
      // Binary mode
      const sum = a + val + carry;
      this.registers.flags.C = sum > 0xFF;
      this.registers.flags.V = !!((~(a ^ val) & (a ^ sum)) & 0x80);
      this.registers.a = sum & 0xFF;
      this.setZN(this.registers.a);
    }
  }

  private sbc(val: number) {
    const a = this.registers.a;
    const borrow = this.registers.flags.C ? 0 : 1;

    if (this.registers.flags.D) {
      // BCD (Decimal) mode - NMOS 6502 behavior
      // All flags based on binary result for NMOS 6502
      const binResult = a + (val ^ 0xFF) + (this.registers.flags.C ? 1 : 0);
      this.registers.flags.C = binResult > 0xFF;
      this.registers.flags.Z = (binResult & 0xFF) === 0;
      this.registers.flags.N = !!(binResult & 0x80);
      this.registers.flags.V = !!(((a ^ binResult) & ((val ^ 0xFF) ^ binResult)) & 0x80);

      // Low nibble BCD adjust
      let al = (a & 0x0F) - (val & 0x0F) - borrow;
      if (al < 0) al = ((al - 0x06) & 0x0F) - 0x10;

      // High nibble with BCD adjust
      let ah = (a & 0xF0) - (val & 0xF0) + al;
      if (ah < 0) ah -= 0x60;

      this.registers.a = ah & 0xFF;
    } else {
      // Binary mode - SBC is ADC with inverted operand
      const result = a + (val ^ 0xFF) + (this.registers.flags.C ? 1 : 0);
      this.registers.flags.C = result > 0xFF;
      this.registers.flags.V = !!(((result ^ a) & (result ^ (val ^ 0xFF))) & 0x80);
      this.registers.a = result & 0xFF;
      this.setZN(this.registers.a);
    }
  }

  private cmp(reg: number, val: number) {
    const r = reg - val;
    this.registers.flags.C = reg >= val;
    this.setZN(r & 0xFF);
  }

  private asl(val: number): number {
    this.registers.flags.C = !!(val & 0x80);
    const result = (val << 1) & 0xFF;
    this.setZN(result);
    return result;
  }

  private lsr(val: number): number {
    this.registers.flags.C = !!(val & 0x01);
    const result = val >> 1;
    this.setZN(result);
    return result;
  }

  private rol(val: number): number {
    const oldC = this.registers.flags.C ? 1 : 0;
    this.registers.flags.C = !!(val & 0x80);
    const result = ((val << 1) | oldC) & 0xFF;
    this.setZN(result);
    return result;
  }

  private ror(val: number): number {
    const oldC = this.registers.flags.C ? 0x80 : 0;
    this.registers.flags.C = !!(val & 0x01);
    const result = (val >> 1) | oldC;
    this.setZN(result);
    return result;
  }

  private bit(val: number) {
    this.registers.flags.Z = (this.registers.a & val) === 0;
    this.registers.flags.V = !!(val & 0x40);
    this.registers.flags.N = !!(val & 0x80);
  }
}
