
// RIOT 6532 - RAM, I/O, Timer for Atari 2600
// Based on Javatari implementation

export class RIOT {
  // 128 bytes of RAM
  private ram = new Uint8Array(128);
  
  // Console switches register (SWCHB - $0282)
  // Bit 7: P1 Difficulty (1=A, 0=B)
  // Bit 6: P0 Difficulty (1=A, 0=B)
  // Bit 3: Color (1=Color, 0=BW)
  // Bit 1: Select (0=Pressed)
  // Bit 0: Reset (0=Pressed)
  private swchb = 0x0B; // Default: Diffs B, Color ON, Select/Reset unpressed
  
  // Joystick inputs (SWCHA - $0280)
  private swcha = 0xFF; // All inputs high (unpressed)
  
  // DDR registers
  private swacnt = 0; // Port A DDR
  private swbcnt = 0; // Port B DDR
  
  // Timer (Javatari-style)
  private timerCount = 1024;  // Counts down to 0 then triggers decrement
  private currentTimerInterval = 1024;
  private lastSetTimerInterval = 1024;
  private intim = Math.floor(Math.random() * 256); // Random initial value
  private instat = 0; // Timer status

  public reset() {
    this.ram.fill(0);
    this.swchb = 0x0B;
    this.swcha = 0xFF;
    this.swacnt = 0;
    this.swbcnt = 0;
    this.timerCount = 1024;
    this.currentTimerInterval = 1024;
    this.lastSetTimerInterval = 1024;
    this.intim = Math.floor(Math.random() * 256);
    this.instat = 0;
  }

  public readRam(addr: number): number {
    return this.ram[addr & 0x7F];
  }

  public writeRam(addr: number, val: number) {
    this.ram[addr & 0x7F] = val;
  }

  public readIO(addr: number): number {
    const reg = addr & 0x07;
    
    switch (reg) {
      case 0x00: // SWCHA - Joystick
        return this.swcha;
      case 0x01: // SWACNT
        return this.swacnt;
      case 0x02: // SWCHB - Console switches
        return this.swchb;
      case 0x03: // SWBCNT
        return this.swbcnt;
      case 0x04: // INTIM - Timer read
      case 0x06:
        this.readFromIntim();
        return this.intim;
      case 0x05: // INSTAT - Timer status (undocumented)
      case 0x07:
        return this.instat;
      default:
        return 0;
    }
  }

  public writeIO(addr: number, val: number) {
    // Timer writes use bits 0-1 of address for interval selection
    // and bit 4 to distinguish timer writes from other writes
    if (addr & 0x10) {
      // Timer write ($0294-$0297 or mirrors)
      const timerReg = addr & 0x03;
      switch (timerReg) {
        case 0x00: // TIM1T ($0294)
          this.setTimerInterval(val, 1);
          break;
        case 0x01: // TIM8T ($0295)
          this.setTimerInterval(val, 8);
          break;
        case 0x02: // TIM64T ($0296)
          this.setTimerInterval(val, 64);
          break;
        case 0x03: // T1024T ($0297)
          this.setTimerInterval(val, 1024);
          break;
      }
    } else {
      // I/O writes
      const reg = addr & 0x07;
      switch (reg) {
        case 0x00: // SWCHA (output to controllers - usually not used)
          break;
        case 0x01: // SWACNT
          this.swacnt = val;
          break;
        case 0x02: // SWCHB write (only bits 2, 4, 5 writable)
          this.swchb = (this.swchb & 0xCB) | (val & 0x34);
          break;
        case 0x03: // SWBCNT
          this.swbcnt = val;
          break;
      }
    }
  }

  private setTimerInterval(value: number, interval: number) {
    this.intim = value;
    this.instat &= 0x3F; // Reset bits 7 and 6
    this.timerCount = this.currentTimerInterval = this.lastSetTimerInterval = interval;
    this.decrementTimer(); // Timer immediately decrements after setting
  }

  private readFromIntim() {
    this.instat &= 0xBF; // Reset bit 6 (overflow since last INTIM read)
    // If fast decrement was active, return to set interval
    if (this.currentTimerInterval === 1) {
      this.timerCount = this.currentTimerInterval = this.lastSetTimerInterval;
    }
  }

  private decrementTimer() {
    this.intim--;
    if (this.intim < 0) {
      this.instat |= 0xC0; // Set bits 7 and 6 (overflow)
      this.intim = 0xFF;   // Wrap timer
      this.timerCount = this.currentTimerInterval = 1; // Fast decrement mode
    } else {
      this.timerCount = this.currentTimerInterval;
    }
  }

  // Called once per CPU clock pulse (not per CPU cycle)
  public clockPulse() {
    this.timerCount--;
    if (this.timerCount <= 0) {
      this.decrementTimer();
    }
  }

  // Console input handling
  public setInput(type: 'SELECT' | 'RESET' | 'COLOR' | 'DIFF0' | 'DIFF1', value: boolean) {
    let mask = 0;
    let bitValue = 1;

    switch (type) {
      case 'RESET':
        mask = 0x01;
        bitValue = value ? 0 : 1; // Pressed(true) -> 0
        break;
      case 'SELECT':
        mask = 0x02;
        bitValue = value ? 0 : 1; // Pressed(true) -> 0
        break;
      case 'COLOR':
        mask = 0x08;
        bitValue = value ? 1 : 0; // Color(true) -> 1
        break;
      case 'DIFF0':
        mask = 0x40;
        bitValue = value ? 1 : 0; // A(true) -> 1
        break;
      case 'DIFF1':
        mask = 0x80;
        bitValue = value ? 1 : 0; // A(true) -> 1
        break;
    }

    if (mask) {
      if (bitValue === 1) {
        this.swchb |= mask;
      } else {
        this.swchb &= ~mask;
      }
    }
  }

  public setJoystick(player: 0 | 1, direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'FIRE', pressed: boolean) {
    // SWCHA bits:
    // P0: D7=Right, D6=Left, D5=Down, D4=Up
    // P1: D3=Right, D2=Left, D1=Down, D0=Up
    const offset = player === 0 ? 4 : 0;
    let bit = 0;
    
    switch (direction) {
      case 'UP': bit = 0; break;
      case 'DOWN': bit = 1; break;
      case 'LEFT': bit = 2; break;
      case 'RIGHT': bit = 3; break;
      case 'FIRE': return; // Fire is on INPT4/INPT5, not SWCHA
    }
    
    const mask = 1 << (bit + offset);
    if (pressed) {
      this.swcha &= ~mask; // Pressed = 0
    } else {
      this.swcha |= mask; // Released = 1
    }
  }

  public getSwchb(): number {
    return this.swchb;
  }
}
