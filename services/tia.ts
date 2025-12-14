// TIA - Television Interface Adapter (Atari 2600)
// Based on the prototype implementation with NTSC/PAL support

import { TiaState } from '../types';

// ============================================================================
// PALETTES
// ============================================================================

// NTSC palette - vibrant colors (original working version)
const NTSC_PALETTE: number[] = [
  0x000000, 0x2a2a2a, 0x444444, 0x6e6e6e, 0x8c8c8c, 0xaaaaaa, 0xc8c8c8, 0xeaeaea,
  0x484000, 0x605600, 0x7c7000, 0x9a8b00, 0xb8a700, 0xd8c400, 0xf8e200, 0xffff20,
  0x742c00, 0x903800, 0xae4400, 0xce5000, 0xf05e00, 0xff7418, 0xff8c38, 0xffa45c,
  0x841600, 0xa01c00, 0xc02200, 0xe02800, 0xff3000, 0xff4818, 0xff6238, 0xff7e5c,
  0x7c001c, 0x980024, 0xb6002c, 0xd60034, 0xf8003c, 0xff2854, 0xff4874, 0xff6a94,
  0x68004c, 0x820060, 0x9e0076, 0xbc008c, 0xdc00a4, 0xfc0ab8, 0xff3ad0, 0xff5ee4,
  0x4c0070, 0x62008e, 0x7a00ac, 0x9400ca, 0xb000ea, 0xcc04ff, 0xe23eff, 0xf46eff,
  0x280080, 0x3a009c, 0x4e00b8, 0x6200d6, 0x7800f4, 0x8e16ff, 0xaa48ff, 0xc272ff,
  0x000074, 0x000092, 0x0000b0, 0x0000ce, 0x0000ee, 0x1418ff, 0x4248ff, 0x6e72ff,
  0x001064, 0x001a80, 0x00249e, 0x0030bc, 0x003cdc, 0x124efe, 0x4672ff, 0x7094ff,
  0x002e40, 0x004056, 0x005472, 0x006a8e, 0x0082ac, 0x009ccc, 0x22b4e6, 0x56ccfc,
  0x004010, 0x005416, 0x006a1c, 0x008222, 0x009a28, 0x00b430, 0x2ec84a, 0x5edc74,
  0x003c00, 0x005000, 0x006600, 0x007c00, 0x009400, 0x00ac00, 0x28c220, 0x58d654,
  0x143400, 0x1c4400, 0x265600, 0x306a00, 0x3c7e00, 0x489400, 0x64aa1e, 0x84c042,
  0x302800, 0x403600, 0x524600, 0x665600, 0x7a6800, 0x907a00, 0xae9216, 0xccaa3a,
  0x482000, 0x602c00, 0x783800, 0x924400, 0xae5200, 0xca6000, 0xe67818, 0xff9238
];

// PAL palette - correct PAL colors
const PAL_PALETTE: number[] = [
  // 00-0E (gray)
  0x000000, 0x404040, 0x6c6c6c, 0x909090, 0xb0b0b0, 0xc8c8c8, 0xdcdcdc, 0xf4f4f4,
  // 10-1E (gold/teal)
  0x004444, 0x106464, 0x248484, 0x34a0a0, 0x40b8b8, 0x50d0d0, 0x5ce8e8, 0x68fcfc,
  // 20-2E (blue)
  0x002870, 0x144484, 0x285c98, 0x3c78ac, 0x4c8cbc, 0x5ca0cc, 0x68b4dc, 0x78c8ec,
  // 30-3E (blue)
  0x001884, 0x183498, 0x3050ac, 0x4868c0, 0x5c80d0, 0x7094e0, 0x80a8ec, 0x94bcfc,
  // 40-4E (purple-blue)
  0x000088, 0x20209c, 0x3c3cb0, 0x5858c0, 0x7070d0, 0x8888e0, 0xa0a0ec, 0xb4b4fc,
  // 50-5E (purple)
  0x5c0078, 0x74208c, 0x883ca0, 0x9c58b0, 0xb070c0, 0xc084d0, 0xd09cdc, 0xe0b0ec,
  // 60-6E (red-purple)
  0x780048, 0x902060, 0xa43c78, 0xb8588c, 0xcc70a0, 0xdc84b4, 0xec9cc4, 0xfcb0d4,
  // 70-7E (red)
  0x840014, 0x982030, 0xac3c4c, 0xc05868, 0xd0707c, 0xe08894, 0xeca0a8, 0xfcb4bc,
  // 80-8E (red-orange)
  0x880000, 0x9c201c, 0xb04038, 0xc05c50, 0xd07468, 0xe08c7c, 0xeca490, 0xfcb8a4,
  // 90-9E (orange)
  0x7c1800, 0x90381c, 0xa85438, 0xbc7050, 0xcc8868, 0xdc9c7c, 0xecb490, 0xfcc8a4,
  // A0-AE (orange-brown)
  0x5c2c00, 0x784c1c, 0x906838, 0xac8450, 0xc09c68, 0xd4b47c, 0xe8cc90, 0xfce0a4,
  // B0-BE (yellow-green)
  0x2c3c00, 0x485c1c, 0x647c38, 0x809c50, 0x94b468, 0xacd07c, 0xc0e490, 0xd4fca4,
  // C0-CE (green)
  0x003c00, 0x205c20, 0x407c40, 0x5c9c5c, 0x74b474, 0x8cd08c, 0xa4e4a4, 0xb8fcb8,
  // D0-DE (green-cyan)
  0x003814, 0x1c5c34, 0x387c50, 0x50986c, 0x68b484, 0x7ccc9c, 0x90e4b4, 0xa4fcc8,
  // E0-EE (cyan)
  0x00302c, 0x1c504c, 0x347068, 0x4c8c84, 0x64a89c, 0x78c0b4, 0x88d4cc, 0x9cece0,
  // F0-FE (cyan-blue)
  0x002844, 0x184864, 0x306884, 0x4484a0, 0x589cb8, 0x6cb4d0, 0x7ccce8, 0x8ce0fc
];

// ============================================================================
// CONSTANTS
// ============================================================================

export const TIA_WIDTH = 160;
export const TIA_HEIGHT = 192;  // Standard NTSC visible area (192 scanlines)

const HBLANK_CLOCKS = 68;
const TOTAL_CLOCKS = 228;  // 68 + 160
const NTSC_SCANLINES = 262;
const PAL_SCANLINES = 312;

// Missile center offsets based on player NUSIZ mode (for RESMP)
// Offsets for modes: 0=1copy, 1=2close, 2=2med, 3=3close, 4=2wide, 5=double, 6=3med, 7=quad
const MISSILE_CENTER_OFFSETS = [5, 5, 5, 5, 5, 10, 5, 16];

// ============================================================================
// TIA CLASS
// ============================================================================

export class TIA {
  // Write Registers (directly exposed for debugging)
  public VSYNC = 0;   // 0x00
  public VBLANK = 0;  // 0x01
  public WSYNC = 0;   // 0x02
  public RSYNC = 0;   // 0x03
  public NUSIZ0 = 0;  // 0x04
  public NUSIZ1 = 0;  // 0x05
  public COLUP0 = 0;  // 0x06
  public COLUP1 = 0;  // 0x07

  // Cycle offset for current instruction (set by CPU before writes)
  // This compensates for the fact that in our model, CPU executes fully
  // before TIA advances. On real hardware, TIA advances during CPU execution.
  // For a STA zeropage (3 cycles), the write happens on cycle 3, so TIA
  // has advanced 9 color clocks. We need to add this offset to get correct
  // sprite positioning.
  public instructionCycleOffset = 12;
  public COLUPF = 0;  // 0x08
  public COLUBK = 0;  // 0x09
  public CTRLPF = 0;  // 0x0A
  public REFP0 = 0;   // 0x0B
  public REFP1 = 0;   // 0x0C
  public PF0 = 0;     // 0x0D
  public PF1 = 0;     // 0x0E
  public PF2 = 0;     // 0x0F
  // Strobe registers - no need to store, action happens on write
  public AUDC0 = 0;   // 0x15
  public AUDC1 = 0;   // 0x16
  public AUDF0 = 0;   // 0x17
  public AUDF1 = 0;   // 0x18
  public AUDV0 = 0;   // 0x19
  public AUDV1 = 0;   // 0x1A
  public GRP0 = 0;    // 0x1B
  public GRP1 = 0;    // 0x1C
  public ENAM0 = 0;   // 0x1D
  public ENAM1 = 0;   // 0x1E
  public ENABL = 0;   // 0x1F
  public HMP0 = 0;    // 0x20
  public HMP1 = 0;    // 0x21
  public HMM0 = 0;    // 0x22
  public HMM1 = 0;    // 0x23
  public HMBL = 0;    // 0x24
  public VDELP0 = 0;  // 0x25
  public VDELP1 = 0;  // 0x26
  public VDELBL = 0;  // 0x27
  public RESMP0 = 0;  // 0x28
  public RESMP1 = 0;  // 0x29
  // HMOVE, HMCLR, CXCLR are strobes - action happens on write

  // Read Registers (Collision)
  public CXM0P = 0;   // 0x00
  public CXM1P = 0;   // 0x01
  public CXP0FB = 0;  // 0x02
  public CXP1FB = 0;  // 0x03
  public CXM0FB = 0;  // 0x04
  public CXM1FB = 0;  // 0x05
  public CXBLPF = 0;  // 0x06
  public CXPPMM = 0;  // 0x07
  public INPT0 = 0;   // 0x08
  public INPT1 = 0;   // 0x09
  public INPT2 = 0;   // 0x0A
  public INPT3 = 0;   // 0x0B
  public INPT4 = 0x80; // 0x0C - Fire button P0 (bit 7: 1=not pressed)
  public INPT5 = 0x80; // 0x0D - Fire button P1

  // Internal State
  private hClock = 0;
  private scanline = 0;
  private frameBuffer: Uint32Array;
  private palette: number[] = NTSC_PALETTE;
  private isNTSC = true;
  private visibleLine = 0;
  private prevVblank = false;
  private visibleStarted = false;
  // Dynamic visible area start: tracks the actual scanline where VBLANK turns off
  // This adapts to the game's real VBLANK timing instead of using a fixed offset,
  // eliminating 1-scanline vertical jitter when games vary their VBLANK duration.
  private dynamicVisibleStart = -1;
  private pendingWrites: Array<{ delay: number; addr: number; value: number }> = [];

  // Audio (simple WebAudio output)
  private audioEnabled = false;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private audioFilter: BiquadFilterNode | null = null;
  private audioGraphConnected = false;
  private osc0: OscillatorNode | null = null;
  private osc1: OscillatorNode | null = null;
  private gain0: GainNode | null = null;
  private gain1: GainNode | null = null;

  // HMOVE blanking state - only active for current scanline after HMOVE strobe
  private hmoveBlankEnabled = false;

  // Object Positions (Screen Coordinates 0-159)
  private posP0 = 0;
  private posP1 = 0;
  private posM0 = 0;
  private posM1 = 0;
  private posBL = 0;

  // Graphics Latches for VDEL
  private grp0Old = 0;
  private grp1Old = 0;
  private enablOld = 0;

  // Frame Ready Flag
  public readyToDraw = false;

  // WSYNC Active Flag (CPU halted until next scanline)
  public wsyncActive = false;

  // Configuration
  public config = {
    format: 'NTSC' as 'NTSC' | 'PAL',
    colorMode: 'COLOR' as 'COLOR' | 'BW',
    difficulty0: 'A' as 'A' | 'B',
    difficulty1: 'A' as 'A' | 'B',
    scanlineLimit: false
  };

  // Render Window Config
  // NTSC: 3 lines VSYNC + 37 lines VBLANK = 40 lines before visible area
  // We use a fixed value for simplicity and compatibility
  private readonly VISIBLE_START_NTSC = 40;
  private readonly VISIBLE_START_PAL = 48;

  private visibleStart = this.VISIBLE_START_NTSC;

  constructor() {
    this.frameBuffer = new Uint32Array(TIA_WIDTH * TIA_HEIGHT);
    this.reset();
  }

  reset() {
    this.hClock = 0;
    this.scanline = 0;
    this.visibleLine = 0;
    this.prevVblank = (this.VBLANK & 0x02) !== 0;
    this.visibleStarted = false;
    this.dynamicVisibleStart = -1;
    this.readyToDraw = false;
    this.hmoveBlankEnabled = false;
    this.frameBuffer.fill(0xFF000000);
    this.pendingWrites = [];

    // Reset all registers
    this.VSYNC = 0;
    this.VBLANK = 0;
    this.WSYNC = 0;
    this.NUSIZ0 = 0;
    this.NUSIZ1 = 0;
    this.COLUP0 = 0;
    this.COLUP1 = 0;
    this.COLUPF = 0;
    this.COLUBK = 0;
    this.CTRLPF = 0;
    this.REFP0 = 0;
    this.REFP1 = 0;
    this.PF0 = 0;
    this.PF1 = 0;
    this.PF2 = 0;
    this.GRP0 = 0;
    this.GRP1 = 0;
    this.ENAM0 = 0;
    this.ENAM1 = 0;
    this.ENABL = 0;
    this.HMP0 = 0;
    this.HMP1 = 0;
    this.HMM0 = 0;
    this.HMM1 = 0;
    this.HMBL = 0;
    this.VDELP0 = 0;
    this.VDELP1 = 0;
    this.VDELBL = 0;

    // Reset positions
    this.posP0 = 0;
    this.posP1 = 0;
    this.posM0 = 0;
    this.posM1 = 0;
    this.posBL = 0;

    // Reset latches
    this.grp0Old = 0;
    this.grp1Old = 0;
    this.enablOld = 0;

    // Reset collision
    this.clearCollisions();
    this.INPT4 = 0x80;
    this.INPT5 = 0x80;

    // Ensure correct region settings
    this.setRegion(this.isNTSC);
    this.updateAudioFromRegs();
  }

  public setAudioEnabled(enabled: boolean) {
    this.audioEnabled = enabled;
    if (!enabled) {
      this.stopAudio();
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }

    if (!this.masterGain) {
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
    }

    if (!this.audioFilter) {
      this.audioFilter = this.audioContext.createBiquadFilter();
      this.audioFilter.type = 'lowpass';
      this.audioFilter.frequency.value = 3500;
      this.audioFilter.Q.value = 0.3;
    }

    if (!this.audioGraphConnected) {
      this.masterGain.connect(this.audioFilter);
      this.audioFilter.connect(this.audioContext.destination);
      this.audioGraphConnected = true;
    }

    if (!this.osc0 || !this.gain0) {
      this.osc0 = this.audioContext.createOscillator();
      this.gain0 = this.audioContext.createGain();
      this.gain0.gain.value = 0;
      this.osc0.connect(this.gain0);
      this.gain0.connect(this.masterGain);
      this.osc0.start();
    }

    if (!this.osc1 || !this.gain1) {
      this.osc1 = this.audioContext.createOscillator();
      this.gain1 = this.audioContext.createGain();
      this.gain1.gain.value = 0;
      this.osc1.connect(this.gain1);
      this.gain1.connect(this.masterGain);
      this.osc1.start();
    }

    this.updateAudioFromRegs();
  }

  private stopAudio() {
    if (this.osc0) {
      this.osc0.stop();
      this.osc0.disconnect();
      this.osc0 = null;
    }
    if (this.osc1) {
      this.osc1.stop();
      this.osc1.disconnect();
      this.osc1 = null;
    }
    if (this.gain0) {
      this.gain0.disconnect();
      this.gain0 = null;
    }
    if (this.gain1) {
      this.gain1.disconnect();
      this.gain1 = null;
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain.gain.value = 0.18;
    }
    if (this.audioFilter) {
      this.audioFilter.disconnect();
      this.audioFilter = null;
    }
    this.audioGraphConnected = false;
  }

  // TIA audio control modes - maps AUDC to oscillator type
  // Mode 0: Silent, 1: 4-bit poly, 2: div15->4bit, 3: 5bit->4bit poly
  // Mode 4-5: div2 pure tone, 6-7: div31 pure, 8-9: 9-bit poly
  // Mode 12-15: div6 pure tone
  // We approximate with standard waveforms
  private getWaveform(audc: number): OscillatorType {
    // All modes use square wave for authentic Atari metallic sound
    return 'square';
  }

  // Get the frequency divisor based on AUDC mode (real TIA behavior)
  private getFrequencyDivisor(audc: number): number {
    const mode = audc & 0x0F;
    // Real TIA divisors - these create the characteristic low frequencies
    switch (mode) {
      case 0: return 1;     // Silent (muted by volume check)
      case 1: return 15;    // 4-bit poly (div15)
      case 2: return 465;   // div15 -> 4-bit poly (15*31)
      case 3: return 465;   // 5-bit->4-bit poly
      case 4: return 2;     // div2 pure tone
      case 5: return 2;     // div2 pure tone
      case 6: return 31;    // div31 pure tone
      case 7: return 31;    // div31 pure tone
      case 8: return 511;   // 9-bit poly
      case 9: return 511;   // 9-bit poly
      case 10: return 31;   // div31
      case 11: return 31;   // div31
      case 12: return 6;    // div6 pure tone
      case 13: return 6;    // div6 pure tone
      case 14: return 93;   // div6 -> div31 (6*31/2)
      case 15: return 93;   // div6 -> div31
      default: return 2;
    }
  }

  private updateAudioFromRegs() {
    if (!this.audioEnabled || !this.audioContext || !this.osc0 || !this.osc1 || !this.gain0 || !this.gain1 || !this.masterGain) {
      return;
    }

    const ctxTime = this.audioContext.currentTime;
    const vol0 = this.AUDV0 & 0x0F;
    const vol1 = this.AUDV1 & 0x0F;
    const audc0 = this.AUDC0 & 0x0F;
    const audc1 = this.AUDC1 & 0x0F;

    // Mute if both volumes are zero OR if control mode is 0 (silent)
    const ch0Silent = vol0 === 0 || audc0 === 0;
    const ch1Silent = vol1 === 0 || audc1 === 0;

    if (ch0Silent && ch1Silent) {
      this.gain0.gain.setTargetAtTime(0, ctxTime, 0.01);
      this.gain1.gain.setTargetAtTime(0, ctxTime, 0.01);
      this.masterGain.gain.setTargetAtTime(0, ctxTime, 0.01);
      return;
    }

    // TIA clock is ~31kHz, frequency divider formula
    const baseClock = this.isNTSC ? 31400 : 31200;

    // Frequency calculation using mode-specific divisors (authentic TIA behavior)
    const div0 = this.getFrequencyDivisor(audc0);
    const div1 = this.getFrequencyDivisor(audc1);
    const freq0 = ch0Silent ? 0 : baseClock / ((this.AUDF0 + 1) * div0);
    const freq1 = ch1Silent ? 0 : baseClock / ((this.AUDF1 + 1) * div1);

    this.osc0.type = this.getWaveform(audc0);
    this.osc1.type = this.getWaveform(audc1);

    // Use setTargetAtTime for smoother transitions (avoids clicks)
    this.osc0.frequency.setTargetAtTime(Math.max(20, freq0), ctxTime, 0.005);
    this.osc1.frequency.setTargetAtTime(Math.max(20, freq1), ctxTime, 0.005);

    // INCREASED GAIN for louder audio
    this.masterGain.gain.setTargetAtTime(0.4, ctxTime, 0.005);
    this.gain0.gain.setTargetAtTime(ch0Silent ? 0 : (vol0 / 15) * 0.3, ctxTime, 0.005);
    this.gain1.gain.setTargetAtTime(ch1Silent ? 0 : (vol1 / 15) * 0.3, ctxTime, 0.005);
  }

  setRegion(ntsc: boolean) {
    this.isNTSC = ntsc;
    this.palette = ntsc ? NTSC_PALETTE : PAL_PALETTE;
    this.visibleStart = ntsc ? this.VISIBLE_START_NTSC : this.VISIBLE_START_PAL;
    this.updateAudioFromRegs();
  }

  setFireButton(player: 0 | 1, pressed: boolean) {
    if (player === 0) {
      this.INPT4 = pressed ? 0x00 : 0x80;
    } else {
      this.INPT5 = pressed ? 0x00 : 0x80;
    }
  }

  setConfig(config: Partial<typeof this.config>) {
    if (config.format !== undefined) {
      this.config.format = config.format;
      this.setRegion(config.format === 'NTSC');
    }
    if (config.colorMode !== undefined) this.config.colorMode = config.colorMode;
    if (config.difficulty0 !== undefined) this.config.difficulty0 = config.difficulty0;
    if (config.difficulty1 !== undefined) this.config.difficulty1 = config.difficulty1;
    if (config.scanlineLimit !== undefined) this.config.scanlineLimit = config.scanlineLimit;
  }

  getFrameBuffer(): Uint32Array {
    return this.frameBuffer;
  }

  // ============================================================================
  // READ REGISTER
  // ============================================================================

  read(addr: number): number {
    const reg = addr & 0x0F;
    switch (reg) {
      case 0x00: return this.CXM0P;
      case 0x01: return this.CXM1P;
      case 0x02: return this.CXP0FB;
      case 0x03: return this.CXP1FB;
      case 0x04: return this.CXM0FB;
      case 0x05: return this.CXM1FB;
      case 0x06: return this.CXBLPF;
      case 0x07: return this.CXPPMM;
      case 0x08: return this.INPT0;
      case 0x09: return this.INPT1;
      case 0x0A: return this.INPT2;
      case 0x0B: return this.INPT3;
      case 0x0C: return this.INPT4;
      case 0x0D: return this.INPT5;
      default: return 0;
    }
  }

  // ============================================================================
  // WRITE REGISTER
  // ============================================================================

  write(addr: number, value: number) {
    this.writeWithDelay(addr, value, 0);
  }

  writeWithDelay(addr: number, value: number, delayClocks: number) {
    const delay = Math.max(0, Math.trunc(delayClocks));

    // HMOVE blanking: determine blanking from the effective strobe clock
    // (current hClock + delay), including wrap to next scanline.
    // This avoids per-line jitter when HMOVE is scheduled near line end.
    const reg = addr & 0x3F;
    const strobeClock = (this.hClock + delay) % TOTAL_CLOCKS;
    if (reg === 0x2A && strobeClock < HBLANK_CLOCKS) {
      this.hmoveBlankEnabled = true;
    }

    if (delay > 0) {
      this.pendingWrites.push({ delay, addr, value });
      return;
    }
    this.applyWrite(addr, value);
  }

  private applyWrite(addr: number, value: number) {
    const reg = addr & 0x3F;

    // Calculate position for strobes (RESP0, RESP1, RESM0, RESM1, RESBL)
    //
    // TIA timing: The strobe sets the horizontal position based on when
    // it occurs relative to the electron beam position.
    //
    // - 68 = HBLANK clocks (invisible area, clocks 0-67)
    // - Players have a 5 color clock delay, missiles/ball have 4 clock delay
    //
    // The position calculation depends on when the strobe occurs:
    // - During HBLANK: position is clamped to a minimum visible position
    // - During visible area: position = (hClock - 68 + delay)
    //
    // CRITICAL: hClock ranges from 0-227 (228 total clocks per scanline)
    // Visible area: hClock 68-227 maps to screen pixels 0-159

    // Helper to calculate strobe position for players (5 clock delay)
    // Use hClock (not effectiveClock) to determine HBLANK vs visible
    // This is because hClock represents the actual beam position when CPU writes
    const calcPlayerPos = (): number => {
      const effectiveClock = (this.hClock + this.instructionCycleOffset) % TOTAL_CLOCKS;

      // Use raw hClock to determine if we're in HBLANK or visible area
      if (this.hClock < HBLANK_CLOCKS) {
        // During HBLANK: text rendering (score, activision logo)
        let pos = effectiveClock - HBLANK_CLOCKS + 5;
        if (pos < 0) pos = 0;
        return pos;
      } else {
        // During visible area: scenery (ladder, trees, etc)
        let pos = effectiveClock - HBLANK_CLOCKS + 5;
        if (pos >= 160) pos -= 160;
        return pos;
      }
    };

    // Helper to calculate strobe position for missiles/ball (4 clock delay)
    const calcMissilePos = (): number => {
      const effectiveClock = (this.hClock + this.instructionCycleOffset) % TOTAL_CLOCKS;

      if (this.hClock < HBLANK_CLOCKS) {
        let pos = effectiveClock - HBLANK_CLOCKS + 4;
        if (pos < 0) pos = 0;
        return pos;
      }
      let pos = effectiveClock - HBLANK_CLOCKS + 4;
      if (pos >= 160) pos -= 160;
      return pos;
    };

    // eslint-disable-next-line sonarjs/max-switch-cases
    switch (reg) {
      case 0x00: // VSYNC
        // VSYNC bit D1: When set (1), signals start of vertical sync
        // When cleared (0), ends vertical sync
        if ((value & 0x02) && !(this.VSYNC & 0x02)) {
          // Rising edge: VSYNC turned on - mark frame as ready to display
          this.readyToDraw = true;
        } else if (!(value & 0x02) && (this.VSYNC & 0x02)) {
          // Falling edge: VSYNC turned off - start new frame
          this.scanline = 0;
          this.visibleLine = 0;
          this.prevVblank = (this.VBLANK & 0x02) !== 0;
          this.visibleStarted = false;
          this.dynamicVisibleStart = -1;
          this.frameBuffer.fill(0xFF000000);
        }
        this.VSYNC = value;
        break;

      case 0x01: // VBLANK
        this.VBLANK = value;
        break;
      case 0x02: this.WSYNC = 1; this.wsyncActive = true; break;
      case 0x03: this.RSYNC = value; this.hClock = 0; break;
      case 0x04: this.NUSIZ0 = value; break;
      case 0x05: this.NUSIZ1 = value; break;
      case 0x06: this.COLUP0 = value; break;
      case 0x07: this.COLUP1 = value; break;
      case 0x08: this.COLUPF = value; break;
      case 0x09: this.COLUBK = value; break;
      case 0x0A: this.CTRLPF = value; break;
      case 0x0B: this.REFP0 = value; break;
      case 0x0C: this.REFP1 = value; break;
      case 0x0D: this.PF0 = value; break;
      case 0x0E: this.PF1 = value; break;
      case 0x0F: this.PF2 = value; break;

      // Strobes - set position based on current beam position
      // Players and missiles have different reset delays
      case 0x10: this.posP0 = calcPlayerPos(); break;
      case 0x11: this.posP1 = calcPlayerPos(); break;
      case 0x12: this.posM0 = calcMissilePos(); break;
      case 0x13: this.posM1 = calcMissilePos(); break;
      case 0x14: this.posBL = calcMissilePos(); break;

      case 0x15: this.AUDC0 = value; break;
      case 0x16: this.AUDC1 = value; break;
      case 0x17: this.AUDF0 = value; break;
      case 0x18: this.AUDF1 = value; break;
      case 0x19: this.AUDV0 = value; break;
      case 0x1A: this.AUDV1 = value; break;

      // Player graphics (with cross-update for VDEL)
      //
      // VDEL (Vertical Delay) mechanism for 6-digit score display:
      // - Writing to GRP0: latches current GRP1 into grp1Old
      // - Writing to GRP1: latches current GRP0 into grp0Old
      //
      // This cross-update allows games to display 6 digits using only 2 player sprites
      // by carefully timing writes to GRP0 and GRP1.
      case 0x1B: // GRP0
        this.grp1Old = this.GRP1;  // Cross-latch: GRP1 -> grp1Old
        this.GRP0 = value;
        break;
      case 0x1C: // GRP1
        this.grp0Old = this.GRP0;  // Cross-latch: GRP0 -> grp0Old
        this.GRP1 = value;
        break;

      case 0x1D: this.ENAM0 = value; break;
      case 0x1E: this.ENAM1 = value; break;
      case 0x1F: this.enablOld = this.ENABL; this.ENABL = value; break;
      case 0x20: this.HMP0 = value; break;
      case 0x21: this.HMP1 = value; break;
      case 0x22: this.HMM0 = value; break;
      case 0x23: this.HMM1 = value; break;
      case 0x24: this.HMBL = value; break;
      case 0x25: this.VDELP0 = value; break;
      case 0x26: this.VDELP1 = value; break;
      case 0x27: this.VDELBL = value; break;
      case 0x28: // RESMP0 - reset missile 0 to center of player 0
        this.RESMP0 = value;
        if (value & 2) {
          // Missile center offsets based on player NUSIZ mode
          // [0]=5, [1]=5, [2]=5, [3]=5, [4]=5, [5]=10, [6]=5, [7]=18
          const offset = MISSILE_CENTER_OFFSETS[this.NUSIZ0 & 0x07];
          this.posM0 = (this.posP0 + offset) % 160;
        }
        break;
      case 0x29: // RESMP1 - reset missile 1 to center of player 1
        this.RESMP1 = value;
        if (value & 2) {
          const offset = MISSILE_CENTER_OFFSETS[this.NUSIZ1 & 0x07];
          this.posM1 = (this.posP1 + offset) % 160;
        }
        break;

      case 0x2A: // HMOVE - apply horizontal motion
        this.applyHMOVE();
        break;

      case 0x2B: // HMCLR - clear horizontal motion registers
        this.HMP0 = this.HMP1 = this.HMM0 = this.HMM1 = this.HMBL = 0;
        break;

      case 0x2C: // CXCLR - clear collision registers
        this.clearCollisions();
        break;
    }

    if (reg >= 0x15 && reg <= 0x1A) {
      this.updateAudioFromRegs();
    }
  }

  // ============================================================================
  // HMOVE - Apply Horizontal Motion
  // ============================================================================

  private applyHMOVE() {
    const move = (val: number): number => {
      let shift = (val >> 4) & 0x0F;
      if (shift >= 8) shift -= 16;
      return -shift;
    };

    this.posP0 = (this.posP0 + move(this.HMP0) + 160) % 160;
    this.posP1 = (this.posP1 + move(this.HMP1) + 160) % 160;
    this.posM0 = (this.posM0 + move(this.HMM0) + 160) % 160;
    this.posM1 = (this.posM1 + move(this.HMM1) + 160) % 160;
    this.posBL = (this.posBL + move(this.HMBL) + 160) % 160;
  }

  // ============================================================================
  // CLEAR COLLISIONS
  // ============================================================================

  private clearCollisions() {
    this.CXM0P = 0;
    this.CXM1P = 0;
    this.CXP0FB = 0;
    this.CXP1FB = 0;
    this.CXM0FB = 0;
    this.CXM1FB = 0;
    this.CXBLPF = 0;
    this.CXPPMM = 0;
  }

  private processPendingWrites() {
    if (this.pendingWrites.length === 0) return;

    for (let i = 0; i < this.pendingWrites.length; ) {
      const pending = this.pendingWrites[i];
      pending.delay -= 1;
      if (pending.delay <= 0) {
        this.applyWrite(pending.addr, pending.value);
        this.pendingWrites.splice(i, 1);
      } else {
        i++;
      }
    }
  }

  private maybeUpdateDynamicVisibleStart(vblankActive: boolean) {
    if (!vblankActive && this.prevVblank && this.dynamicVisibleStart < 0) {
      this.dynamicVisibleStart = this.scanline;
    }
  }

  private getVisibleStart(): number {
    return this.dynamicVisibleStart >= 0 ? this.dynamicVisibleStart : this.visibleStart;
  }

  private shouldRenderPixel(vblankActive: boolean, visStart: number): boolean {
    return !vblankActive &&
      this.hClock >= HBLANK_CLOCKS && this.hClock < TOTAL_CLOCKS &&
      this.scanline >= visStart &&
      this.scanline < (visStart + TIA_HEIGHT);
  }

  private advanceBeamClock() {
    this.hClock++;

    if (this.hClock >= TOTAL_CLOCKS) {
      this.hClock = 0;
      this.scanline++;
      this.WSYNC = 0;
      this.wsyncActive = false;
      this.hmoveBlankEnabled = false;

      const maxLines = this.isNTSC ? NTSC_SCANLINES : PAL_SCANLINES;
      if (this.scanline >= maxLines + 10) {
        this.scanline = 0;
        this.readyToDraw = true;
      }
    }
  }

  // ============================================================================
  // CLOCK STEP - Called once per color clock (3.58 MHz)
  // Returns true if CPU can continue, false if WSYNC is active
  // ============================================================================

  step(): boolean {
    // CRITICAL: Render FIRST at current hClock, THEN increment
    // This ensures CPU writes to TIA registers take effect at the correct position
    // The rendering happens at the current beam position before advancing

    this.processPendingWrites();

    const vblankActive = (this.VBLANK & 0x02) !== 0;

    // Detect VBLANK turning off: this marks the actual start of the visible area
    // for the current frame. Using dynamic detection instead of a fixed scanline
    // offset eliminates 1-scanline vertical jitter when games vary VBLANK duration.
    this.maybeUpdateDynamicVisibleStart(vblankActive);

    // Use dynamically detected visible start, fall back to fixed offset
    const visStart = this.getVisibleStart();

    // Render visible area (before advancing clock)
    if (this.shouldRenderPixel(vblankActive, visStart)) {
      this.renderPixel(this.hClock - HBLANK_CLOCKS, this.scanline - visStart);
    }

    // NOW advance the clock
    this.advanceBeamClock();

    this.prevVblank = vblankActive;

    return this.WSYNC === 0;
  }

  // Clock multiple color clocks (3 color clocks = 1 CPU cycle)
  clock(cpuCycles: number) {
    for (let i = 0; i < cpuCycles * 3; i++) {
      this.step();
    }
  }

  // ============================================================================
  // GET PLAYER BIT - Check if player sprite is visible at given X position
  // ============================================================================

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private getPlayerBit(x: number, pos: number, grp: number, nusiz: number, refp: number): number {
    const mode = nusiz & 0x07;
    let size = 1;
    if (mode === 5) {
      size = 2;
    } else if (mode === 7) {
      size = 4;
    }

    // Calculate distance from player position
    // Using simple subtraction - if x < pos, sprite is not visible at this x
    let dist = x - pos;

    // Handle wraparound: if pos is near end of line (153+), the sprite doesn't wrap to start
    // This prevents sprites from appearing on the left when they're actually on the right
    if (dist < 0) {
      // Check if this could be a wrapped copy based on NUSIZ mode
      dist += 160;
      // Only allow wraparound for actual copy positions, not the main sprite
      if (dist >= 80) return 0; // No wraparound for positions > 80 pixels away
    }

    let matched = false;

    // Check each copy based on NUSIZ mode
    if (mode === 0 || mode === 5 || mode === 7) {
      // Single copy (normal, double, or quad size)
      if (dist >= 0 && dist < 8 * size) matched = true;
    } else if (mode === 1) {
      // 2 close copies
      if (dist >= 0 && dist < 8 * size) matched = true;
      else if (dist >= 16 && dist < 16 + 8 * size) { dist -= 16; matched = true; }
    } else if (mode === 2) {
      // 2 medium copies
      if (dist >= 0 && dist < 8 * size) matched = true;
      else if (dist >= 32 && dist < 32 + 8 * size) { dist -= 32; matched = true; }
    } else if (mode === 3) {
      // 3 close copies
      if (dist >= 0 && dist < 8 * size) matched = true;
      else if (dist >= 16 && dist < 16 + 8 * size) { dist -= 16; matched = true; }
      else if (dist >= 32 && dist < 32 + 8 * size) { dist -= 32; matched = true; }
    } else if (mode === 4) {
      // 2 wide copies
      if (dist >= 0 && dist < 8 * size) matched = true;
      else if (dist >= 64 && dist < 64 + 8 * size) { dist -= 64; matched = true; }
    } else if (mode === 6) {
      // 3 medium copies
      if (dist >= 0 && dist < 8 * size) matched = true;
      else if (dist >= 32 && dist < 32 + 8 * size) { dist -= 32; matched = true; }
      else if (dist >= 64 && dist < 64 + 8 * size) { dist -= 64; matched = true; }
    }

    if (matched) {
      const bitIndexRaw = Math.floor(dist / size);
      const bitIndex = (refp & 8) ? bitIndexRaw : (7 - bitIndexRaw);
      if (bitIndex >= 0 && bitIndex <= 7) return (grp >> bitIndex) & 1;
    }
    return 0;
  }

  // ============================================================================
  // GET MISSILE BIT - Check if missile is visible at given X position
  // Missiles follow same copy pattern as players (NUSIZ bits 0-2)
  // ============================================================================

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private getMissileBit(x: number, pos: number, nusiz: number): number {
    // Missiles follow the same copy pattern as players (NUSIZ bits 0-2)
    // Missile width is controlled by NUSIZ bits 4-5
    const mode = nusiz & 0x07;
    const size = 1 << ((nusiz >> 4) & 3);  // 1, 2, 4, or 8 pixels wide

    // Calculate distance without wraparound issues
    let dist = x - pos;
    if (dist < 0) {
      dist += 160;
      // Prevent wraparound for positions far away
      if (dist >= 80) return 0;
    }

    // Check each copy position based on NUSIZ mode (same as player)
    if (mode === 0 || mode === 5 || mode === 7) {
      // Single copy
      if (dist >= 0 && dist < size) return 1;
    } else if (mode === 1) {
      // 2 close copies (16 pixels apart)
      if (dist >= 0 && dist < size) return 1;
      if (dist >= 16 && dist < 16 + size) return 1;
    } else if (mode === 2) {
      // 2 medium copies (32 pixels apart)
      if (dist >= 0 && dist < size) return 1;
      if (dist >= 32 && dist < 32 + size) return 1;
    } else if (mode === 3) {
      // 3 close copies (16 pixels apart)
      if (dist >= 0 && dist < size) return 1;
      if (dist >= 16 && dist < 16 + size) return 1;
      if (dist >= 32 && dist < 32 + size) return 1;
    } else if (mode === 4) {
      // 2 wide copies (64 pixels apart)
      if (dist >= 0 && dist < size) return 1;
      if (dist >= 64 && dist < 64 + size) return 1;
    } else if (mode === 6) {
      // 3 medium copies (32 pixels apart)
      if (dist >= 0 && dist < size) return 1;
      if (dist >= 32 && dist < 32 + size) return 1;
      if (dist >= 64 && dist < 64 + size) return 1;
    }
    return 0;
  }

  // ============================================================================
  // RENDER PIXEL
  // ============================================================================

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private renderPixel(x: number, y: number) {
    if (x < 0 || x >= TIA_WIDTH || y < 0 || y >= TIA_HEIGHT) return;

    // Cache framebuffer index to avoid recalculating
    const fbIndex = y * TIA_WIDTH + x;

    // VBLANK active - render black
    if (this.VBLANK & 0x02) {
      this.frameBuffer[fbIndex] = 0xFF000000;
      return;
    }

    // HMOVE Blanking - only active when HMOVE was strobed during HBLANK
    // This blacks out the first 8 pixels of the visible area
    if (this.hmoveBlankEnabled && x < 8) {
      this.frameBuffer[fbIndex] = 0xFF000000;
      return;
    }

    // --- 1. PLAYFIELD ---
    // Playfield uses screen X coordinate directly (no offset)
    // Each playfield "pixel" is 4 color clocks wide = 4 screen pixels
    // Total: 40 PF pixels across 160 screen pixels (20 per half)
    let pfBit = 0;

    if (x < 80) {
      // Left half
      const xHalf = Math.floor(x / 4);
      if (xHalf < 4) {
        pfBit = (this.PF0 >> (4 + xHalf)) & 1;
      } else if (xHalf < 12) {
        pfBit = (this.PF1 >> (7 - (xHalf - 4))) & 1;
      } else {
        pfBit = (this.PF2 >> (xHalf - 12)) & 1;
      }
    } else {
      // Right half
      const xHalf = Math.floor((x - 80) / 4);
      if (this.CTRLPF & 1) {
        // Reflected: PF2 reversed, PF1 reversed, PF0 reversed
        if (xHalf < 8) {
          pfBit = (this.PF2 >> (7 - xHalf)) & 1;
        } else if (xHalf < 16) {
          pfBit = (this.PF1 >> (xHalf - 8)) & 1;
        } else {
          pfBit = (this.PF0 >> (7 - (xHalf - 16))) & 1;
        }
      } else if (xHalf < 4) {
        // Non-reflected: same as left half
        pfBit = (this.PF0 >> (4 + xHalf)) & 1;
      } else if (xHalf < 12) {
        pfBit = (this.PF1 >> (7 - (xHalf - 4))) & 1;
      } else {
        pfBit = (this.PF2 >> (xHalf - 12)) & 1;
      }
    }

    // Playfield color
    // Score mode (CTRLPF bit 1): left half uses COLUP0, right half uses COLUP1
    let pfColor: number;
    if (this.CTRLPF & 2) {
      pfColor = (x < 80) ? this.COLUP0 : this.COLUP1;
    } else {
      pfColor = this.COLUPF;
    }
    const bkColor = this.COLUBK;

    // --- 2. PLAYERS ---
    const graphicP0 = (this.VDELP0 & 1) ? this.grp0Old : this.GRP0;
    const p0Bit = this.getPlayerBit(x, this.posP0, graphicP0, this.NUSIZ0, this.REFP0);

    const graphicP1 = (this.VDELP1 & 1) ? this.grp1Old : this.GRP1;
    const p1Bit = this.getPlayerBit(x, this.posP1, graphicP1, this.NUSIZ1, this.REFP1);

    // --- 3. MISSILES ---
    // Missiles follow same copy pattern as players (NUSIZ bits 0-2)
    // Missile size is controlled by NUSIZ bits 4-5
    const m0Bit = (this.ENAM0 & 2) ? this.getMissileBit(x, this.posM0, this.NUSIZ0) : 0;
    const m1Bit = (this.ENAM1 & 2) ? this.getMissileBit(x, this.posM1, this.NUSIZ1) : 0;

    // --- 4. BALL (with VDELBL support) ---
    // Simple implementation matching working prototype (no delay)
    let blBit = 0;
    const enablToUse = (this.VDELBL & 1) ? this.enablOld : this.ENABL;
    if (enablToUse & 2) {
      let distBL = x - this.posBL;
      if (distBL < 0) {
        distBL += 160;
        if (distBL >= 80) distBL = -1; // Prevent wraparound
      }
      const sizeBL = 1 << ((this.CTRLPF >> 4) & 3);
      if (distBL >= 0 && distBL < sizeBL) blBit = 1;
    }

    // --- 5. COLLISION DETECTION ---
    if (m0Bit && p1Bit) this.CXM0P |= 0x80;
    if (m0Bit && p0Bit) this.CXM0P |= 0x40;
    if (m1Bit && p0Bit) this.CXM1P |= 0x80;
    if (m1Bit && p1Bit) this.CXM1P |= 0x40;
    if (p0Bit && pfBit) this.CXP0FB |= 0x80;
    if (p0Bit && blBit) this.CXP0FB |= 0x40;
    if (p1Bit && pfBit) this.CXP1FB |= 0x80;
    if (p1Bit && blBit) this.CXP1FB |= 0x40;
    if (m0Bit && pfBit) this.CXM0FB |= 0x80;
    if (m0Bit && blBit) this.CXM0FB |= 0x40;
    if (m1Bit && pfBit) this.CXM1FB |= 0x80;
    if (m1Bit && blBit) this.CXM1FB |= 0x40;
    if (blBit && pfBit) this.CXBLPF |= 0x80;
    if (p0Bit && p1Bit) this.CXPPMM |= 0x80;
    if (m0Bit && m1Bit) this.CXPPMM |= 0x40;

    // --- 6. PRIORITY & FINAL COLOR ---
    let pixelColor = bkColor;
    const priority = (this.CTRLPF & 4) !== 0;

    if (priority) {
      // PF/BL have priority over players
      if (pfBit) pixelColor = pfColor;
      else if (blBit) pixelColor = this.COLUPF;
      else if (p0Bit || m0Bit) pixelColor = this.COLUP0;
      else if (p1Bit || m1Bit) pixelColor = this.COLUP1;
    } else if (p0Bit || m0Bit) {
      pixelColor = this.COLUP0;
    } else if (p1Bit || m1Bit) {
      pixelColor = this.COLUP1;
    } else if (pfBit) {
      pixelColor = pfColor;
    } else if (blBit) {
      pixelColor = this.COLUPF;
    }

    // Convert color register to palette index
    // TIA color registers use bits 7-1 for color (128 colors), bit 0 is ignored
    // So we shift right by 1 to get palette index
    const paletteIndex = (pixelColor >> 1) & 0x7F;
    const rgb = this.palette[paletteIndex];

    // Store as 0x00RRGGBB format (TiaBreakout expects this format)
    this.frameBuffer[fbIndex] = rgb;
  }

  // ============================================================================
  // GET STATE - For debugging/visualization
  // ============================================================================

  getState(): TiaState {
    return {
      regs: [
        this.VSYNC, this.VBLANK, this.WSYNC, this.RSYNC,
        this.NUSIZ0, this.NUSIZ1, this.COLUP0, this.COLUP1,
        this.COLUPF, this.COLUBK, this.CTRLPF, this.REFP0,
        this.REFP1, this.PF0, this.PF1, this.PF2
      ],
      frameBuffer: Array.from(this.frameBuffer),
      currentScanline: this.scanline,
      currentCol: this.hClock,
      vsync: (this.VSYNC & 0x02) !== 0,
      vblank: (this.VBLANK & 0x02) !== 0,
      config: { ...this.config }
    };
  }

  // Direct access to framebuffer (avoids copy)
  getFrameBufferDirect(): Uint32Array {
    return this.frameBuffer;
  }

  // Lightweight state without framebuffer copy
  getLightweightState() {
    return {
      scanline: this.scanline,
      currentScanline: this.scanline,
      currentCol: this.hClock,
      vsync: (this.VSYNC & 0x02) !== 0,
      vblank: (this.VBLANK & 0x02) !== 0,
      readyToDraw: this.readyToDraw
    };
  }
}
