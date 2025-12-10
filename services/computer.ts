
import { ComputerState, TiaState, CrtcState } from '../types';
import { CPU6502 } from './cpu6502';
import { TIA } from './tia';
import { VIA6522 } from './via';
import { RIOT } from './riot';
import { ACIA6551 } from './acia';
import { CRTC6845 } from './crtc6845';
import { Bus } from './bus';

export class Computer {
  private readonly cpu: CPU6502;
  private readonly tia: TIA;
  private readonly via: VIA6522;
  private readonly riot: RIOT;
  private readonly acia: ACIA6551;
  private readonly crtc: CRTC6845;
  private readonly bus: Bus;

  private cycles = 0;

  constructor() {
    this.tia = new TIA();
    this.via = new VIA6522();
    this.riot = new RIOT();
    this.acia = new ACIA6551();
    this.crtc = new CRTC6845();
    this.bus = new Bus(this.tia, this.via, this.riot, this.acia, this.crtc);
    this.cpu = new CPU6502(this.bus);
  }

  public reset(romImage?: Uint8Array) {
    if (romImage) {
      this.bus.loadRom(romImage);
    }

    this.cpu.reset();
    this.via.reset();
    this.tia.reset();
    this.riot.reset();
    this.acia.reset();
    this.crtc.reset();
    this.cycles = 0;
  }

  public loadCartridge(data: Uint8Array) {
    this.bus.loadCartridge(data);
    this.tia.reset();
    this.riot.reset();
    this.cpu.reset();
    this.cycles = 0;
  }

  // Load a full 64KB memory image (for functional tests)
  public loadFullImage(data: Uint8Array) {
    this.bus.loadFullImage(data);
    this.via.reset();
    this.tia.reset();
    this.riot.reset();
    this.acia.reset();
    this.cpu.reset();
    this.cycles = 0;
  }

  public clock() {
    if (this.bus.mode === 'ATARI_2600') {
      this.clockAtari();
    } else {
      this.clockBenEater();
    }
  }

  private clockBenEater() {
    const cpuCycles = this.cpu.clock();
    this.cycles += cpuCycles;
  }

  private advanceAtariCpuCycle(cpuCycles: number) {
    for (let i = 0; i < cpuCycles * 3; i++) {
      this.tia.step();
    }

    for (let i = 0; i < cpuCycles; i++) {
      this.riot.clockPulse();
    }
  }

  private advanceWsyncCycle() {
    this.tia.step();
    if (this.tia.wsyncActive) this.tia.step();
    if (this.tia.wsyncActive) this.tia.step();
    this.riot.clockPulse();
  }

  private clockAtari() {
    // Atari 2600 Timing (NTSC):
    // - Master clock: 3.579545 MHz (TIA color clock)
    // - CPU clock: 1.193182 MHz = Master / 3
    // - 3 TIA color clocks = 1 CPU cycle (exactly)
    // - 228 color clocks per scanline = 76 CPU cycles per scanline
    // - 262 scanlines per frame = 19,912 CPU cycles per frame
    // - Frame rate: 59.94 Hz (1,193,182 / 19,912)

    // Check for WSYNC hold - CPU halted until end of scanline
    if (this.tia.wsyncActive) {
      // During WSYNC, CPU is halted but TIA continues running
      // Advance 3 TIA color clocks (1 CPU cycle worth of time)
      // CRITICAL: Stop advancing once WSYNC releases (scanline boundary)
      // to ensure the CPU starts at a consistent hClock position (0)
      // On real hardware, the CPU resumes at the first clock of the new scanline
      this.advanceWsyncCycle();
      this.cycles += 1;
      return;
    }

    // CRITICAL: CPU executes FIRST, then TIA advances
    // This matches the working prototype timing where writes to TIA
    // happen before hClock advances, ensuring correct sprite positioning
    const cpuCycles = this.cpu.clock();

    // TIA runs 3x CPU speed - advance after CPU execution
    this.advanceAtariCpuCycle(cpuCycles);

    this.cycles += cpuCycles;
  }

  // Execute exactly one scanline (76 CPU cycles)
  // This is useful for frame-accurate emulation
  public clockScanline(): number {
    if (this.bus.mode !== 'ATARI_2600') {
      // Non-Atari mode: just execute 76 cycles worth of instructions
      let cyclesExecuted = 0;
      while (cyclesExecuted < 76) {
        const c = this.cpu.clock();
        cyclesExecuted += c;
        this.cycles += c;
      }
      return cyclesExecuted;
    }

    // Atari 2600 mode: execute until we complete 76 CPU cycles
    // accounting for WSYNC halts and multi-cycle instructions
    let cyclesExecuted = 0;

    while (cyclesExecuted < 76) {
      if (this.tia.wsyncActive) {
        this.advanceWsyncCycle();
        cyclesExecuted++;
        continue;
      }

      const cpuCycles = this.cpu.clock();
      this.advanceAtariCpuCycle(cpuCycles);
      cyclesExecuted += cpuCycles;
    }

    this.cycles += cyclesExecuted;
    return cyclesExecuted;
  }

  // Execute exactly one frame (262 scanlines for NTSC, 312 for PAL)
  // Returns total cycles executed
  public clockFrame(): number {
    const scanlines = this.tia.config.format === 'NTSC' ? 262 : 312;
    let totalCycles = 0;

    for (let i = 0; i < scanlines; i++) {
      totalCycles += this.clockScanline();
    }

    return totalCycles;
  }

  public setTiaConfig(config: Partial<TiaState['config']>) {
    this.tia.setConfig(config);
  }

  public setTiaAudio(_enabled: boolean) {
    this.tia.setAudioEnabled(_enabled);
  }

  public writeTiaRegister(reg: number, value: number) {
    this.tia.write(reg & 0x3F, value & 0xFF);
  }

  public setInputState(type: 'SELECT' | 'RESET' | 'COLOR' | 'DIFF0' | 'DIFF1', value: boolean) {
    this.riot.setInput(type, value);

    // Update TIA config for visual state
    if (type === 'COLOR') this.tia.config.colorMode = value ? 'COLOR' : 'BW';
    if (type === 'DIFF0') this.tia.config.difficulty0 = value ? 'A' : 'B';
    if (type === 'DIFF1') this.tia.config.difficulty1 = value ? 'A' : 'B';
  }

  public setJoystickState(player: 0 | 1, direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'FIRE', pressed: boolean) {
    if (direction === 'FIRE') {
      // Fire button is read via TIA INPT4/INPT5
      this.tia.setFireButton(player, pressed);
    } else {
      this.riot.setJoystick(player, direction, pressed);
    }
  }

  public sendSerialChar(char: number) {
    this.acia.receiveChar(char);
  }

  public sendSerialString(str: string) {
    this.acia.receiveString(str);
  }

  public setAciaTransmitCallback(callback: (char: number) => void) {
    this.acia.onTransmit = callback;
  }

  public clearAciaTxBuffer() {
    this.acia.clearTxBuffer();
  }

  // Fast method to get just the PC (for test runner optimization)
  public getPC(): number {
    return this.cpu.registers.pc;
  }

  public getState(): ComputerState {
    const busState = this.bus.getState();
    const tiaState = this.tia.getState();
    const viaState = this.via.getState();
    const lcdState = this.via.getLcdState();
    const aciaState = this.acia.getState();
    const crtcState = this.crtc.getState();

    return {
      cpu: { ...this.cpu.registers },
      ram: this.bus.getRamSlice(0, 0x20),
      rom: this.bus.getRamSlice(0xF000, 0x20),
      via: viaState,
      lcd: lcdState,
      tia: tiaState,
      acia: aciaState,
      crtc: crtcState,
      bus: busState,
      cycles: this.cycles,
      lastInstruction: this.cpu.lastInstruction
    };
  }

  // Direct access to TIA framebuffer for high-performance rendering
  // This avoids the expensive Array.from() copy in getState()
  public getTiaFrameBuffer(): Uint32Array {
    return this.tia.getFrameBufferDirect();
  }

  // Get TIA config without copying framebuffer
  public getTiaConfig() {
    return this.tia.config;
  }

  // Get lightweight TIA state (scanline, etc) without framebuffer
  public getTiaLightweightState() {
    return this.tia.getLightweightState();
  }

  // Get current cycle count
  public getCycles(): number {
    return this.cycles;
  }

  // Check if TIA has a frame ready to draw
  public isTiaReadyToDraw(): boolean {
    return this.tia.readyToDraw;
  }

  // Clear TIA ready to draw flag (after rendering frame)
  public clearTiaReadyToDraw() {
    this.tia.readyToDraw = false;
  }

  // Check if TIA WSYNC is active (CPU halted)
  public isTiaWsyncActive(): boolean {
    return this.tia.wsyncActive;
  }

  // Clock TIA only (for WSYNC handling in game loop)
  // Returns true if WSYNC is now cleared
  public clockTiaOnly(): boolean {
    // Advance 3 TIA color clocks (1 CPU cycle worth)
    this.tia.step();
    this.tia.step();
    this.tia.step();
    this.riot.clockPulse();
    this.cycles++;
    return !this.tia.wsyncActive;
  }

  // CRTC 6845 Methods
  public getCrtcFrameBuffer(): Uint32Array {
    return this.crtc.renderFrame();
  }

  public getCrtcState(): CrtcState {
    return this.crtc.getState();
  }

  public getCrtcDerivedTiming() {
    return this.crtc.getDerivedTiming();
  }

  public getCrtcVideoRam(): Uint8Array {
    return this.crtc.getVideoRam();
  }

  public setCrtcRegister(index: number, value: number) {
    this.crtc.setRegister(index, value);
  }

  public setCrtcCharClock(mhz: number) {
    this.crtc.setCharClock(mhz);
  }

  public crtcPrintString(str: string) {
    this.crtc.printString(str);
  }

  public crtcClearScreen() {
    this.crtc.clearScreen();
  }

  public crtcSetCursor(row: number, col: number) {
    this.crtc.setCursor(row, col);
  }

  public writeCrtcVideoRam(addr: number, val: number) {
    this.crtc.writeVideoRam(addr, val);
  }
}
