/**
 * MC6845 CRTC (Cathode Ray Tube Controller) Emulation
 *
 * The 6845 is a programmable CRT controller used in many vintage computers
 * including the BBC Micro, Amstrad CPC, Apple II (80-column card), and many others.
 *
 * Memory Map (typically 2 addresses):
 *   $xx00 - Address Register (write only)
 *   $xx01 - Data Register (read/write selected register)
 *
 * Internal Registers (R0-R17):
 *   R0  - Horizontal Total (characters per line - 1)
 *   R1  - Horizontal Displayed (visible characters per line)
 *   R2  - Horizontal Sync Position
 *   R3  - Sync Widths (HSYNC low 4 bits, VSYNC high 4 bits)
 *   R4  - Vertical Total (character rows - 1)
 *   R5  - Vertical Total Adjust (additional scanlines)
 *   R6  - Vertical Displayed (visible rows)
 *   R7  - Vertical Sync Position
 *   R8  - Interlace and Skew
 *   R9  - Maximum Scanline Address (scanlines per character row - 1)
 *   R10 - Cursor Start (start scanline and cursor mode)
 *   R11 - Cursor End (end scanline)
 *   R12 - Start Address High
 *   R13 - Start Address Low
 *   R14 - Cursor Address High
 *   R15 - Cursor Address Low
 *   R16 - Light Pen High (read only)
 *   R17 - Light Pen Low (read only)
 */

export interface CrtcState {
  // Internal registers (R0-R17)
  registers: number[];
  // Currently selected register
  addressRegister: number;
  // Timing counters
  hCounter: number;        // Horizontal character counter
  vCounter: number;        // Vertical row counter
  scanlineCounter: number; // Scanline within current row
  // Sync signals
  hsync: boolean;
  vsync: boolean;
  displayEnable: boolean;
  // Memory address output
  memoryAddress: number;
  rowAddress: number;      // Current scanline within character
  // Cursor state
  cursorVisible: boolean;
  cursorBlinkState: boolean;
  cursorBlinkCounter: number;
  // Frame counter for timing
  frameCount: number;
  // Character clock frequency (MHz)
  charClockMHz: number;
}

// Default register values (80x25 text mode @ ~60Hz)
const DEFAULT_REGISTERS = [
  95,   // R0  - Horizontal Total (96 chars per line - 1)
  80,   // R1  - Horizontal Displayed (80 visible chars)
  82,   // R2  - Horizontal Sync Position
  0x28, // R3  - Sync Widths (HSYNC=8, VSYNC=2)
  31,   // R4  - Vertical Total (32 rows - 1)
  0,    // R5  - Vertical Total Adjust
  25,   // R6  - Vertical Displayed (25 visible rows)
  28,   // R7  - Vertical Sync Position
  0,    // R8  - Interlace Mode
  7,    // R9  - Maximum Scanline (8 scanlines per char - 1)
  0x60, // R10 - Cursor Start (scanline 0, blink mode)
  7,    // R11 - Cursor End (scanline 7)
  0,    // R12 - Start Address High
  0,    // R13 - Start Address Low
  0,    // R14 - Cursor Address High
  0,    // R15 - Cursor Address Low
  0,    // R16 - Light Pen High
  0     // R17 - Light Pen Low
];

// Register masks (some registers have limited bit widths)
const REGISTER_MASKS = [
  0xFF, // R0  - 8 bits
  0xFF, // R1  - 8 bits
  0xFF, // R2  - 8 bits
  0xFF, // R3  - 8 bits
  0x7F, // R4  - 7 bits
  0x1F, // R5  - 5 bits
  0x7F, // R6  - 7 bits
  0x7F, // R7  - 7 bits
  0x03, // R8  - 2 bits (interlace)
  0x1F, // R9  - 5 bits
  0x7F, // R10 - 7 bits
  0x1F, // R11 - 5 bits
  0x3F, // R12 - 6 bits
  0xFF, // R13 - 8 bits
  0x3F, // R14 - 6 bits
  0xFF, // R15 - 8 bits
  0x3F, // R16 - 6 bits (read only)
  0xFF  // R17 - 8 bits (read only)
];

export class CRTC6845 {
  private registers: number[] = [...DEFAULT_REGISTERS];
  private addressRegister = 0;

  // Timing counters
  private hCounter = 0;
  private vCounter = 0;
  private scanlineCounter = 0;

  // Sync signals
  private hsync = false;
  private vsync = false;
  private displayEnable = true;

  // Memory addressing
  private memoryAddress = 0;
  private rowAddress = 0;
  private lineStartAddress = 0;

  // Cursor state
  private cursorVisible = true;
  private cursorBlinkState = true;
  private cursorBlinkCounter = 0;

  // Frame counter
  private frameCount = 0;

  // Character clock
  private charClockMHz = 1;

  // Video RAM (for standalone visualization - 4KB)
  private videoRam: Uint8Array = new Uint8Array(4096);

  // Character ROM (8x8 font - 256 chars * 8 bytes each)
  private charRom: Uint8Array = new Uint8Array(2048);

  // Framebuffer for display (max 100x50 chars * 8x8 pixels = 800x400)
  private frameBuffer: Uint32Array = new Uint32Array(800 * 400);

  constructor() {
    this.reset();
    this.initCharRom();
  }

  public reset() {
    this.registers = [...DEFAULT_REGISTERS];
    this.addressRegister = 0;
    this.hCounter = 0;
    this.vCounter = 0;
    this.scanlineCounter = 0;
    this.hsync = false;
    this.vsync = false;
    this.displayEnable = true;
    this.memoryAddress = 0;
    this.rowAddress = 0;
    this.lineStartAddress = 0;
    this.cursorVisible = true;
    this.cursorBlinkState = true;
    this.cursorBlinkCounter = 0;
    this.frameCount = 0;
    this.videoRam.fill(0x20); // Fill with spaces
    this.frameBuffer.fill(0xFF000000); // Black with alpha
  }

  // Initialize a basic 8x8 ASCII character ROM
  private initCharRom() {
    // Simple 8x8 font for printable ASCII characters (32-126)
    const font: Record<number, number[]> = {
      // Space
      0x20: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      // !
      0x21: [0x18, 0x18, 0x18, 0x18, 0x18, 0x00, 0x18, 0x00],
      // "
      0x22: [0x6C, 0x6C, 0x24, 0x00, 0x00, 0x00, 0x00, 0x00],
      // #
      0x23: [0x6C, 0x6C, 0xFE, 0x6C, 0xFE, 0x6C, 0x6C, 0x00],
      // $
      0x24: [0x18, 0x7E, 0xC0, 0x7C, 0x06, 0xFC, 0x18, 0x00],
      // %
      0x25: [0xC6, 0xCC, 0x18, 0x30, 0x60, 0xC6, 0x86, 0x00],
      // &
      0x26: [0x38, 0x6C, 0x38, 0x76, 0xDC, 0xCC, 0x76, 0x00],
      // '
      0x27: [0x18, 0x18, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00],
      // (
      0x28: [0x0C, 0x18, 0x30, 0x30, 0x30, 0x18, 0x0C, 0x00],
      // )
      0x29: [0x30, 0x18, 0x0C, 0x0C, 0x0C, 0x18, 0x30, 0x00],
      // *
      0x2A: [0x00, 0x66, 0x3C, 0xFF, 0x3C, 0x66, 0x00, 0x00],
      // +
      0x2B: [0x00, 0x18, 0x18, 0x7E, 0x18, 0x18, 0x00, 0x00],
      // ,
      0x2C: [0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18, 0x30],
      // -
      0x2D: [0x00, 0x00, 0x00, 0x7E, 0x00, 0x00, 0x00, 0x00],
      // .
      0x2E: [0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18, 0x00],
      // /
      0x2F: [0x06, 0x0C, 0x18, 0x30, 0x60, 0xC0, 0x80, 0x00],
      // 0-9
      0x30: [0x7C, 0xC6, 0xCE, 0xD6, 0xE6, 0xC6, 0x7C, 0x00],
      0x31: [0x18, 0x38, 0x18, 0x18, 0x18, 0x18, 0x7E, 0x00],
      0x32: [0x7C, 0xC6, 0x06, 0x1C, 0x30, 0x66, 0xFE, 0x00],
      0x33: [0x7C, 0xC6, 0x06, 0x3C, 0x06, 0xC6, 0x7C, 0x00],
      0x34: [0x1C, 0x3C, 0x6C, 0xCC, 0xFE, 0x0C, 0x1E, 0x00],
      0x35: [0xFE, 0xC0, 0xFC, 0x06, 0x06, 0xC6, 0x7C, 0x00],
      0x36: [0x38, 0x60, 0xC0, 0xFC, 0xC6, 0xC6, 0x7C, 0x00],
      0x37: [0xFE, 0xC6, 0x0C, 0x18, 0x30, 0x30, 0x30, 0x00],
      0x38: [0x7C, 0xC6, 0xC6, 0x7C, 0xC6, 0xC6, 0x7C, 0x00],
      0x39: [0x7C, 0xC6, 0xC6, 0x7E, 0x06, 0x0C, 0x78, 0x00],
      // :
      0x3A: [0x00, 0x18, 0x18, 0x00, 0x00, 0x18, 0x18, 0x00],
      // ;
      0x3B: [0x00, 0x18, 0x18, 0x00, 0x00, 0x18, 0x18, 0x30],
      // <
      0x3C: [0x0C, 0x18, 0x30, 0x60, 0x30, 0x18, 0x0C, 0x00],
      // =
      0x3D: [0x00, 0x00, 0x7E, 0x00, 0x00, 0x7E, 0x00, 0x00],
      // >
      0x3E: [0x30, 0x18, 0x0C, 0x06, 0x0C, 0x18, 0x30, 0x00],
      // ?
      0x3F: [0x7C, 0xC6, 0x0C, 0x18, 0x18, 0x00, 0x18, 0x00],
      // @
      0x40: [0x7C, 0xC6, 0xDE, 0xDE, 0xDE, 0xC0, 0x7C, 0x00],
      // A-Z
      0x41: [0x38, 0x6C, 0xC6, 0xFE, 0xC6, 0xC6, 0xC6, 0x00],
      0x42: [0xFC, 0x66, 0x66, 0x7C, 0x66, 0x66, 0xFC, 0x00],
      0x43: [0x3C, 0x66, 0xC0, 0xC0, 0xC0, 0x66, 0x3C, 0x00],
      0x44: [0xF8, 0x6C, 0x66, 0x66, 0x66, 0x6C, 0xF8, 0x00],
      0x45: [0xFE, 0x62, 0x68, 0x78, 0x68, 0x62, 0xFE, 0x00],
      0x46: [0xFE, 0x62, 0x68, 0x78, 0x68, 0x60, 0xF0, 0x00],
      0x47: [0x3C, 0x66, 0xC0, 0xC0, 0xCE, 0x66, 0x3E, 0x00],
      0x48: [0xC6, 0xC6, 0xC6, 0xFE, 0xC6, 0xC6, 0xC6, 0x00],
      0x49: [0x3C, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3C, 0x00],
      0x4A: [0x1E, 0x0C, 0x0C, 0x0C, 0xCC, 0xCC, 0x78, 0x00],
      0x4B: [0xE6, 0x66, 0x6C, 0x78, 0x6C, 0x66, 0xE6, 0x00],
      0x4C: [0xF0, 0x60, 0x60, 0x60, 0x62, 0x66, 0xFE, 0x00],
      0x4D: [0xC6, 0xEE, 0xFE, 0xFE, 0xD6, 0xC6, 0xC6, 0x00],
      0x4E: [0xC6, 0xE6, 0xF6, 0xDE, 0xCE, 0xC6, 0xC6, 0x00],
      0x4F: [0x7C, 0xC6, 0xC6, 0xC6, 0xC6, 0xC6, 0x7C, 0x00],
      0x50: [0xFC, 0x66, 0x66, 0x7C, 0x60, 0x60, 0xF0, 0x00],
      0x51: [0x7C, 0xC6, 0xC6, 0xC6, 0xD6, 0xDE, 0x7C, 0x0E],
      0x52: [0xFC, 0x66, 0x66, 0x7C, 0x6C, 0x66, 0xE6, 0x00],
      0x53: [0x7C, 0xC6, 0x60, 0x38, 0x0C, 0xC6, 0x7C, 0x00],
      0x54: [0x7E, 0x5A, 0x18, 0x18, 0x18, 0x18, 0x3C, 0x00],
      0x55: [0xC6, 0xC6, 0xC6, 0xC6, 0xC6, 0xC6, 0x7C, 0x00],
      0x56: [0xC6, 0xC6, 0xC6, 0xC6, 0x6C, 0x38, 0x10, 0x00],
      0x57: [0xC6, 0xC6, 0xD6, 0xFE, 0xFE, 0xEE, 0xC6, 0x00],
      0x58: [0xC6, 0xC6, 0x6C, 0x38, 0x6C, 0xC6, 0xC6, 0x00],
      0x59: [0x66, 0x66, 0x66, 0x3C, 0x18, 0x18, 0x3C, 0x00],
      0x5A: [0xFE, 0xC6, 0x8C, 0x18, 0x32, 0x66, 0xFE, 0x00],
      // [
      0x5B: [0x3C, 0x30, 0x30, 0x30, 0x30, 0x30, 0x3C, 0x00],
      // \
      0x5C: [0xC0, 0x60, 0x30, 0x18, 0x0C, 0x06, 0x02, 0x00],
      // ]
      0x5D: [0x3C, 0x0C, 0x0C, 0x0C, 0x0C, 0x0C, 0x3C, 0x00],
      // ^
      0x5E: [0x10, 0x38, 0x6C, 0xC6, 0x00, 0x00, 0x00, 0x00],
      // _
      0x5F: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF],
      // `
      0x60: [0x30, 0x18, 0x0C, 0x00, 0x00, 0x00, 0x00, 0x00],
      // a-z (lowercase)
      0x61: [0x00, 0x00, 0x78, 0x0C, 0x7C, 0xCC, 0x76, 0x00],
      0x62: [0xE0, 0x60, 0x60, 0x7C, 0x66, 0x66, 0xDC, 0x00],
      0x63: [0x00, 0x00, 0x78, 0xCC, 0xC0, 0xCC, 0x78, 0x00],
      0x64: [0x1C, 0x0C, 0x0C, 0x7C, 0xCC, 0xCC, 0x76, 0x00],
      0x65: [0x00, 0x00, 0x78, 0xCC, 0xFC, 0xC0, 0x78, 0x00],
      0x66: [0x38, 0x6C, 0x60, 0xF0, 0x60, 0x60, 0xF0, 0x00],
      0x67: [0x00, 0x00, 0x76, 0xCC, 0xCC, 0x7C, 0x0C, 0xF8],
      0x68: [0xE0, 0x60, 0x6C, 0x76, 0x66, 0x66, 0xE6, 0x00],
      0x69: [0x18, 0x00, 0x38, 0x18, 0x18, 0x18, 0x3C, 0x00],
      0x6A: [0x06, 0x00, 0x0E, 0x06, 0x06, 0x66, 0x66, 0x3C],
      0x6B: [0xE0, 0x60, 0x66, 0x6C, 0x78, 0x6C, 0xE6, 0x00],
      0x6C: [0x38, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3C, 0x00],
      0x6D: [0x00, 0x00, 0xEC, 0xFE, 0xD6, 0xD6, 0xC6, 0x00],
      0x6E: [0x00, 0x00, 0xDC, 0x66, 0x66, 0x66, 0x66, 0x00],
      0x6F: [0x00, 0x00, 0x78, 0xCC, 0xCC, 0xCC, 0x78, 0x00],
      0x70: [0x00, 0x00, 0xDC, 0x66, 0x66, 0x7C, 0x60, 0xF0],
      0x71: [0x00, 0x00, 0x76, 0xCC, 0xCC, 0x7C, 0x0C, 0x1E],
      0x72: [0x00, 0x00, 0xDC, 0x76, 0x66, 0x60, 0xF0, 0x00],
      0x73: [0x00, 0x00, 0x7C, 0xC0, 0x78, 0x0C, 0xF8, 0x00],
      0x74: [0x10, 0x30, 0x7C, 0x30, 0x30, 0x34, 0x18, 0x00],
      0x75: [0x00, 0x00, 0xCC, 0xCC, 0xCC, 0xCC, 0x76, 0x00],
      0x76: [0x00, 0x00, 0xCC, 0xCC, 0xCC, 0x78, 0x30, 0x00],
      0x77: [0x00, 0x00, 0xC6, 0xD6, 0xFE, 0xFE, 0x6C, 0x00],
      0x78: [0x00, 0x00, 0xC6, 0x6C, 0x38, 0x6C, 0xC6, 0x00],
      0x79: [0x00, 0x00, 0xCC, 0xCC, 0xCC, 0x7C, 0x0C, 0xF8],
      0x7A: [0x00, 0x00, 0xFC, 0x98, 0x30, 0x64, 0xFC, 0x00],
      // {
      0x7B: [0x0E, 0x18, 0x18, 0x70, 0x18, 0x18, 0x0E, 0x00],
      // |
      0x7C: [0x18, 0x18, 0x18, 0x00, 0x18, 0x18, 0x18, 0x00],
      // }
      0x7D: [0x70, 0x18, 0x18, 0x0E, 0x18, 0x18, 0x70, 0x00],
      // ~
      0x7E: [0x76, 0xDC, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    };

    // Copy font data to character ROM
    for (const [charCode, data] of Object.entries(font)) {
      const code = Number(charCode);
      for (let row = 0; row < 8; row++) {
        this.charRom[code * 8 + row] = data[row];
      }
    }
  }

  // Write to CRTC (address register or data)
  public write(addr: number, val: number) {
    if ((addr & 1) === 0) {
      // Address register (select internal register 0-17)
      this.addressRegister = val & 0x1F;
    } else {
      // Data register (write to selected register)
      if (this.addressRegister <= 15) {
        this.registers[this.addressRegister] = val & REGISTER_MASKS[this.addressRegister];
      }
      // R16 and R17 are read-only (light pen)
    }
  }

  // Read from CRTC
  public read(addr: number): number {
    if ((addr & 1) === 0) {
      // Status register (reading address register returns status on some variants)
      // Bit 5: Vertical retrace (VSYNC)
      // Bit 6: Update ready
      // Bit 7: Light pen strobe
      let status = 0;
      if (this.vsync) status |= 0x20;
      return status;
    } else {
      // Data register (read selected register)
      if (this.addressRegister <= 17) {
        return this.registers[this.addressRegister];
      }
      return 0;
    }
  }

  // Write to video RAM (for standalone mode)
  public writeVideoRam(addr: number, val: number) {
    this.videoRam[addr & 0x0FFF] = val;
  }

  // Read from video RAM
  public readVideoRam(addr: number): number {
    return this.videoRam[addr & 0x0FFF];
  }

  // Set character clock frequency
  public setCharClock(mhz: number) {
    this.charClockMHz = Math.max(0.1, mhz);
  }

  // Get derived timing values
  public getDerivedTiming() {
    const hTotal = this.registers[0] + 1;
    const hDisplayed = this.registers[1];
    const hSyncPos = this.registers[2];
    const hSyncWidth = this.registers[3] & 0x0F;

    const vTotal = this.registers[4] + 1;
    const vTotalAdjust = this.registers[5];
    const vDisplayed = this.registers[6];
    const vSyncPos = this.registers[7];
    const vSyncWidth = (this.registers[3] >> 4) & 0x0F || 16;
    const maxScanline = (this.registers[9] & 0x1F) + 1;

    const totalScanlines = (vTotal * maxScanline) + vTotalAdjust;
    const hFreq = this.charClockMHz > 0 ? (this.charClockMHz * 1_000_000) / hTotal : 0;
    const vFreq = hFreq > 0 ? hFreq / totalScanlines : 0;

    const pixelWidth = hDisplayed * 8;
    const pixelHeight = vDisplayed * maxScanline;

    return {
      hTotal,
      hDisplayed,
      hSyncPos,
      hSyncWidth,
      vTotal,
      vTotalAdjust,
      vDisplayed,
      vSyncPos,
      vSyncWidth,
      maxScanline,
      totalScanlines,
      hFreq,
      vFreq,
      pixelWidth,
      pixelHeight
    };
  }

  // Clock the CRTC (one character clock)
  public clock() {
    const hTotal = this.registers[0];
    const hDisplayed = this.registers[1];
    const hSyncPos = this.registers[2];
    const hSyncWidth = this.registers[3] & 0x0F;

    const vTotal = this.registers[4];
    const vDisplayed = this.registers[6];
    const vSyncPos = this.registers[7];
    const vSyncWidth = ((this.registers[3] >> 4) & 0x0F) || 16;
    const maxScanline = this.registers[9] & 0x1F;

    // Check horizontal display enable
    this.displayEnable = this.hCounter < hDisplayed && this.vCounter < vDisplayed;

    // Generate HSYNC
    if (this.hCounter >= hSyncPos && this.hCounter < hSyncPos + hSyncWidth) {
      this.hsync = true;
    } else {
      this.hsync = false;
    }

    // Advance horizontal counter
    this.hCounter++;
    this.memoryAddress++;

    // End of line?
    if (this.hCounter > hTotal) {
      this.hCounter = 0;

      // Advance scanline within row
      this.scanlineCounter++;
      this.rowAddress = this.scanlineCounter;

      if (this.scanlineCounter > maxScanline) {
        // Next row
        this.scanlineCounter = 0;
        this.rowAddress = 0;
        this.vCounter++;
        this.lineStartAddress += hDisplayed;
      } else {
        // Same row, restart memory address
        this.memoryAddress = this.lineStartAddress;
      }

      // Check vertical sync
      if (this.vCounter >= vSyncPos && this.vCounter < vSyncPos + vSyncWidth) {
        this.vsync = true;
      } else {
        this.vsync = false;
      }

      // End of frame?
      if (this.vCounter > vTotal) {
        this.vCounter = 0;
        this.scanlineCounter = 0;
        this.rowAddress = 0;
        this.frameCount++;

        // Reset memory address to start address
        this.lineStartAddress = (this.registers[12] << 8) | this.registers[13];
        this.memoryAddress = this.lineStartAddress;

        // Cursor blink
        this.cursorBlinkCounter++;
        if (this.cursorBlinkCounter >= 16) {
          this.cursorBlinkCounter = 0;
          this.cursorBlinkState = !this.cursorBlinkState;
        }
      }
    }
  }

  // Render the current frame to framebuffer
  public renderFrame(): Uint32Array {
    const timing = this.getDerivedTiming();
    const { hDisplayed, vDisplayed, maxScanline } = timing;

    const startAddr = (this.registers[12] << 8) | this.registers[13];
    const cursorAddr = (this.registers[14] << 8) | this.registers[15];
    const cursorStart = this.registers[10] & 0x1F;
    const cursorEnd = this.registers[11] & 0x1F;
    const cursorMode = (this.registers[10] >> 5) & 0x03;

    // Determine cursor visibility
    let cursorOn = true;
    if (cursorMode === 1) cursorOn = false; // Cursor off
    if (cursorMode === 2 || cursorMode === 3) cursorOn = this.cursorBlinkState; // Blink

    // Colors (green phosphor CRT look)
    const fgColor = 0xFF33FF66; // Green (ABGR)
    const bgColor = 0xFF0A1A0A; // Dark green-black

    // Render each character
    for (let row = 0; row < vDisplayed; row++) {
      for (let col = 0; col < hDisplayed; col++) {
        const charAddr = (startAddr + row * hDisplayed + col) & 0x0FFF;
        const charCode = this.videoRam[charAddr];

        // Check if cursor is at this position
        const isCursor = (startAddr + row * hDisplayed + col) === cursorAddr && cursorOn;

        // Render character (8 scanlines)
        for (let scanline = 0; scanline < maxScanline; scanline++) {
          const charData = this.charRom[charCode * 8 + (scanline & 7)];

          // Check cursor scanline range
          const cursorHere = isCursor && scanline >= cursorStart && scanline <= cursorEnd;

          // Render 8 pixels
          for (let px = 0; px < 8; px++) {
            const pixelOn = (charData >> (7 - px)) & 1;
            const x = col * 8 + px;
            const y = row * maxScanline + scanline;

            if (x < 800 && y < 400) {
              const idx = y * 800 + x;
              if (cursorHere) {
                // XOR cursor with character
                this.frameBuffer[idx] = pixelOn ? bgColor : fgColor;
              } else {
                this.frameBuffer[idx] = pixelOn ? fgColor : bgColor;
              }
            }
          }
        }
      }
    }

    return this.frameBuffer;
  }

  // Get framebuffer for display
  public getFrameBuffer(): Uint32Array {
    return this.frameBuffer;
  }

  // Print a string to video RAM at current cursor position
  public printString(str: string, wrapAround: boolean = true) {
    const timing = this.getDerivedTiming();
    let cursorAddr = (this.registers[14] << 8) | this.registers[15];
    const maxAddr = timing.hDisplayed * timing.vDisplayed;

    for (const char of str) {
      const code = char.codePointAt(0) ?? 0;
      if (code === 10 || code === 13) {
        // Newline - move to next row
        const currentRow = Math.floor(cursorAddr / timing.hDisplayed);
        cursorAddr = (currentRow + 1) * timing.hDisplayed;
      } else {
        this.videoRam[cursorAddr & 0x0FFF] = code;
        cursorAddr++;
      }

      if (wrapAround && cursorAddr >= maxAddr) {
        cursorAddr = 0;
      }
    }

    // Update cursor position registers
    this.registers[14] = (cursorAddr >> 8) & 0x3F;
    this.registers[15] = cursorAddr & 0xFF;
  }

  // Set cursor position
  public setCursor(row: number, col: number) {
    const timing = this.getDerivedTiming();
    const addr = row * timing.hDisplayed + col;
    this.registers[14] = (addr >> 8) & 0x3F;
    this.registers[15] = addr & 0xFF;
  }

  // Clear screen
  public clearScreen() {
    this.videoRam.fill(0x20);
    this.registers[14] = 0;
    this.registers[15] = 0;
  }

  // Get current state for visualization
  public getState(): CrtcState {
    return {
      registers: [...this.registers],
      addressRegister: this.addressRegister,
      hCounter: this.hCounter,
      vCounter: this.vCounter,
      scanlineCounter: this.scanlineCounter,
      hsync: this.hsync,
      vsync: this.vsync,
      displayEnable: this.displayEnable,
      memoryAddress: this.memoryAddress,
      rowAddress: this.rowAddress,
      cursorVisible: this.cursorVisible,
      cursorBlinkState: this.cursorBlinkState,
      cursorBlinkCounter: this.cursorBlinkCounter,
      frameCount: this.frameCount,
      charClockMHz: this.charClockMHz
    };
  }

  // Get video RAM for display
  public getVideoRam(): Uint8Array {
    return this.videoRam;
  }

  // Directly set a register value (for interactive UI)
  public setRegister(index: number, value: number) {
    if (index >= 0 && index <= 15) {
      this.registers[index] = value & REGISTER_MASKS[index];
    }
  }

  // Get register value
  public getRegister(index: number): number {
    if (index >= 0 && index <= 17) {
      return this.registers[index];
    }
    return 0;
  }
}
