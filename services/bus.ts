
import { BusInterface } from './cpu6502';
import { TIA } from './tia';
import { VIA6522 } from './via';
import { RIOT } from './riot';
import { ACIA6551 } from './acia';
import { CRTC6845 } from './crtc6845';
import { MEMORY_SIZE, ROM_OFFSET, ROM_SIZE, VIA_BASE, ACIA_BASE } from '../types';

export type SystemMode = 'BEN_EATER' | 'ATARI_2600';

// CRTC base address (2 registers at $4800-$4801)
const CRTC_BASE = 0x4800;
// CRTC Video RAM ($4000-$47FF, 2KB)
const CRTC_VRAM_BASE = 0x4000;
const CRTC_VRAM_SIZE = 0x0800;

export interface BusState {
  address: number;
  data: number;
  rw: boolean;
}

// Atari 2600 Address Decoding Masks (from Javatari)
const CART_MASK = 0x1000;
const CART_SELECT = 0x1000;
const RAM_MASK = 0x1280;
const RAM_SELECT = 0x0080;
const TIA_MASK = 0x1080;
const TIA_SELECT = 0x0000;
const PIA_MASK = 0x1280;
const PIA_SELECT = 0x0280;

export class Bus implements BusInterface {
  private memory = new Uint8Array(MEMORY_SIZE);
  private testMode = false;

  // Components
  public tia: TIA;
  public via: VIA6522;
  public riot: RIOT;
  public acia: ACIA6551;
  public crtc: CRTC6845;

  // Bus state for visualization
  public lastAddress = 0;
  public lastData = 0;
  public lastRw = true;

  // Data bus latch (Atari 2600 behavior)
  private dataLatch = 0;

  // System mode
  public mode: SystemMode = 'BEN_EATER';

  constructor(tia: TIA, via: VIA6522, riot: RIOT, acia: ACIA6551, crtc: CRTC6845) {
    this.tia = tia;
    this.via = via;
    this.riot = riot;
    this.acia = acia;
    this.crtc = crtc;
  }

  public setTiaInstructionCycleOffset(offset: number) {
    this.tia.instructionCycleOffset = offset;
  }

  public reset() {
    this.memory.fill(0);
    this.lastAddress = 0;
    this.lastData = 0;
    this.lastRw = true;
  }

  public loadRom(romImage: Uint8Array) {
    this.mode = 'BEN_EATER';
    this.testMode = false;
    this.memory.fill(0);

    for (let i = 0; i < ROM_SIZE; i++) {
      if (i < romImage.length) {
        this.memory[ROM_OFFSET + i] = romImage[i];
      } else {
        this.memory[ROM_OFFSET + i] = 0xEA; // NOP padding
      }
    }
  }

  // Load a full 64KB memory image (for functional tests)
  public loadFullImage(data: Uint8Array) {
    this.mode = 'BEN_EATER';
    this.testMode = true;
    this.memory.fill(0);

    // Copy the entire image (up to 64KB)
    const len = Math.min(data.length, MEMORY_SIZE);
    for (let i = 0; i < len; i++) {
      this.memory[i] = data[i];
    }
  }

  public loadCartridge(data: Uint8Array) {
    this.mode = 'ATARI_2600';
    this.testMode = false;
    this.memory.fill(0);
    this.riot.reset();

    // Load ROM with Mirroring for 2K/4K carts
    if (data.length === 2048) {
      // Mirror 2k to both halves of 4k space
      for (let i = 0; i < 2048; i++) {
        this.memory[0xF000 + i] = data[i];
        this.memory[0xF800 + i] = data[i];
      }
    } else {
      // Assume 4k (or smaller padding to 4k)
      const start = 0x10000 - data.length;
      for (let i = 0; i < data.length; i++) {
        this.memory[start + i] = data[i];
      }
    }
  }

  public read(addr: number): number {
    addr &= 0xFFFF;
    this.lastAddress = addr;
    this.lastRw = true;

    let data = 0;

    if (this.mode === 'ATARI_2600') {
      data = this.readAtari(addr);
    } else {
      data = this.readBenEater(addr);
    }

    this.lastData = data;
    return data;
  }

  public write(addr: number, val: number) {
    addr &= 0xFFFF;
    val &= 0xFF;
    this.lastAddress = addr;
    this.lastData = val;
    this.lastRw = false;

    if (this.mode === 'ATARI_2600') {
      this.writeAtari(addr, val);
    } else {
      this.writeBenEater(addr, val);
    }
  }

  // --- Ben Eater Mode ---
  private readBenEater(addr: number): number {
    // In test mode, bypass I/O device mappings so full-image tests
    // (e.g. AllSuiteA at $4000-$45C2) read from plain memory.
    if (!this.testMode) {
      // Check for I/O devices first
      if (addr >= ACIA_BASE && addr < ACIA_BASE + 4) {
        return this.acia.read(addr - ACIA_BASE);
      } else if (addr >= VIA_BASE && addr < VIA_BASE + 16) {
        return this.via.read(addr - VIA_BASE);
      } else if (addr >= CRTC_BASE && addr < CRTC_BASE + 2) {
        // CRTC registers at $4800-$4801
        return this.crtc.read(addr - CRTC_BASE);
      } else if (addr >= CRTC_VRAM_BASE && addr < CRTC_VRAM_BASE + CRTC_VRAM_SIZE) {
        // CRTC Video RAM at $4000-$47FF
        return this.crtc.readVideoRam(addr - CRTC_VRAM_BASE);
      }
    }

    // C64 VIC-II registers for Lorenz test compatibility
    // The waitborder loop checks:
    //   lda $d011 / bmi border (exit if bit 7 set, i.e., rasterline > 255)
    //   lda $d012 / cmp #40 / bcs waitborder (loop if rasterline >= 40)
    // We simulate being in the border area to exit the loop quickly
    if (addr === 0xD011) {
      // $D011 bit 7 = rasterline bit 8
      // Return with bit 7 set to indicate we're in the border area (rasterline > 255)
      return 0x9B; // bit 7 set = in border
    }
    if (addr === 0xD012) {
      // $D012 = rasterline bits 0-7
      // Return a low value (< 40) to exit the waitborder loop
      return 0x00;
    }

    // For functional tests, allow reading from entire memory space
    return this.memory[addr];
  }

  private writeBenEater(addr: number, val: number) {
    if (!this.testMode) {
      // Check for I/O devices first
      if (addr >= ACIA_BASE && addr < ACIA_BASE + 4) {
        this.acia.write(addr - ACIA_BASE, val);
        return;
      } else if (addr >= VIA_BASE && addr < VIA_BASE + 16) {
        this.via.write(addr - VIA_BASE, val);
        return;
      } else if (addr >= CRTC_BASE && addr < CRTC_BASE + 2) {
        // CRTC registers at $4800-$4801
        this.crtc.write(addr - CRTC_BASE, val);
        return;
      } else if (addr >= CRTC_VRAM_BASE && addr < CRTC_VRAM_BASE + CRTC_VRAM_SIZE) {
        // CRTC Video RAM at $4000-$47FF
        this.crtc.writeVideoRam(addr - CRTC_VRAM_BASE, val);
        return;
      }
    }
    // For functional tests, allow writing to entire memory space (including "ROM" area)
    // This is needed because tests use self-modifying code and store data everywhere
    this.memory[addr] = val;
  }

  // --- Atari 2600 Mode (using Javatari-style address decoding) ---
  private readAtari(addr: number): number {
    // Cartridge ROM ($1000+)
    if ((addr & CART_MASK) === CART_SELECT) {
      this.dataLatch = this.memory[0xF000 + (addr & 0x0FFF)];
      return this.dataLatch;
    }

    // RIOT RAM ($0080-$00FF with mirrors)
    if ((addr & RAM_MASK) === RAM_SELECT) {
      this.dataLatch = this.riot.readRam(addr & 0x7F);
      return this.dataLatch;
    }

    // PIA/RIOT I/O ($0280-$0297)
    if ((addr & PIA_MASK) === PIA_SELECT) {
      this.dataLatch = this.riot.readIO(addr);
      return this.dataLatch;
    }

    // TIA Read (only bits 7 and 6 are connected)
    if ((addr & TIA_MASK) === TIA_SELECT) {
      // Use retained data for bits 5-0, TIA provides bits 7-6
      this.dataLatch = (this.dataLatch & 0x3F) | this.tia.read(addr & 0x0F);
      return this.dataLatch;
    }

    return this.dataLatch;
  }

  private writeAtari(addr: number, val: number) {
    this.dataLatch = val;

    // TIA Write ($0000-$003F and mirrors)
    if ((addr & TIA_MASK) === TIA_SELECT) {
      const delay = this.tia.instructionCycleOffset || 0;
      if (typeof (this.tia as any).writeWithDelay === 'function') {
        (this.tia as any).writeWithDelay(addr & 0x3F, val, delay);
      } else {
        this.tia.write(addr & 0x3F, val);
      }
      this.tia.instructionCycleOffset = 0;
      return;
    }

    // RIOT RAM ($0080-$00FF)
    if ((addr & RAM_MASK) === RAM_SELECT) {
      this.riot.writeRam(addr & 0x7F, val);
      return;
    }

    // PIA/RIOT I/O
    if ((addr & PIA_MASK) === PIA_SELECT) {
      this.riot.writeIO(addr, val);
    }
  }

  public getState(): BusState {
    return {
      address: this.lastAddress,
      data: this.lastData,
      rw: this.lastRw
    };
  }

  public getRamSlice(start: number, length: number): Uint8Array {
    return this.memory.slice(start, start + length);
  }
}
