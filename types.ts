
export interface CpuRegisters {
  a: number;
  x: number;
  y: number;
  sp: number;
  pc: number;
  flags: {
    C: boolean;
    Z: boolean;
    I: boolean;
    D: boolean;
    B: boolean;
    V: boolean;
    N: boolean;
  };
}

export interface LcdState {
  lines: string[];
  cursor: { x: number, y: number };
  backlight: boolean;
}

export interface TiaState {
  regs: number[]; // Internal registers
  frameBuffer: number[]; // Pixel data (indices to palette)
  currentScanline: number;
  currentCol: number;
  vsync: boolean;
  vblank: boolean;
  config: {
    format: 'NTSC' | 'PAL';
    colorMode: 'COLOR' | 'BW';
    difficulty0: 'A' | 'B';
    difficulty1: 'A' | 'B';
    scanlineLimit: boolean; // Enable/disable scanline limit per frame
  }
}

export interface AciaState {
  dataRx: number;
  dataTx: number;
  status: number;
  command: number;
  control: number;
  rxBuffer: number[];
  txBuffer: number[];
  rxFull: boolean;
  txEmpty: boolean;
  overrun: boolean;
  framingError: boolean;
  parityError: boolean;
  irq: boolean;
}

export interface CrtcState {
  // Internal registers (R0-R17)
  registers: number[];
  // Currently selected register
  addressRegister: number;
  // Timing counters
  hCounter: number;
  vCounter: number;
  scanlineCounter: number;
  // Sync signals
  hsync: boolean;
  vsync: boolean;
  displayEnable: boolean;
  // Memory address output
  memoryAddress: number;
  rowAddress: number;
  // Cursor state
  cursorVisible: boolean;
  cursorBlinkState: boolean;
  cursorBlinkCounter: number;
  // Frame counter
  frameCount: number;
  // Character clock frequency (MHz)
  charClockMHz: number;
}

export interface ComputerState {
  cpu: CpuRegisters;
  ram: Uint8Array; // First 256 bytes for display
  rom: Uint8Array; // First 256 bytes for display
  via: {
    portA: number;
    portB: number;
    ddrA: number;
    ddrB: number;
  };
  lcd: LcdState;
  tia: TiaState;
  acia: AciaState;
  crtc: CrtcState;
  bus: {
    address: number;
    data: number;
    rw: boolean; // true = Read, false = Write
  };
  cycles: number;
  lastInstruction: string;
}

export enum ClockSpeed {
  MANUAL = 0,
  SLOW = 1,
  MEDIUM = 10,
  FAST = 100,
  ULTRA = 1000,
  MHZ1 = 1000000,
  ATARI_2600 = 1193182 // Exact Atari 2600 NTSC/PAL speed (1.19 MHz)
}

export const MEMORY_SIZE = 65536;
export const RAM_SIZE = 0x4000; // 16k mapped
export const ROM_OFFSET = 0x8000;
export const ROM_SIZE = 0x8000;
export const VIA_BASE = 0x6000;
export const ACIA_BASE = 0x5000; // ACIA 6551 mapped to $5000-$5003
export const TIA_BASE = 0x4000; // Mapped to $4000 for this breadboard computer (Real Atari is $00)
export const TIA_SCANLINES_PER_FRAME = 262; // Standard TV scanlines
