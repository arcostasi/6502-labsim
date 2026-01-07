
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Computer } from '../services/computer';
import { assemble } from '../services/assembler';
import { ComputerState, ClockSpeed } from '../types';
import { ALL_EXAMPLES, DEFAULT_EXAMPLE_ID, CodeExample } from '../examples';

export interface UseComputerReturn {
  state: ComputerState | null;
  isRunning: boolean;
  clockSpeed: ClockSpeed;
  error: string | null;
  loadedRomName: string | null;
  sourceCode: string;
  lastAssembledCode: string;
  lineMapping: Record<number, number>;
  selectedExampleId: string;
  examples: CodeExample[];
  audioEnabled: boolean;

  // Direct access to Computer for high-performance TIA rendering
  computerRef: React.MutableRefObject<Computer>;

  // Actions
  setSourceCode: (code: string) => void;
  setClockSpeed: (speed: ClockSpeed) => void;
  handleReset: () => void;
  handleRun: () => void;
  handleStep: () => void;
  handleLoadRom: (data: Uint8Array, name: string) => void;
  handleEjectRom: () => void;
  toggleTiaFormat: () => void;
  toggleTiaScanlineLimit: () => void;
  toggleTiaAudio: () => void;
  handleConsoleInput: (type: 'SELECT' | 'RESET' | 'COLOR' | 'DIFF0' | 'DIFF1', pressed: boolean) => void;
  handleJoystick: (player: 0 | 1, direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'FIRE', pressed: boolean) => void;
  loadExample: (exampleId: string) => void;

  // ACIA Serial
  sendSerialChar: (char: number) => void;
  clearAciaTxBuffer: () => void;
}

const DEFAULT_PROGRAM = `
; Ben Eater "Hello World"
; 6522 VIA Mapped to $6000
; Port B ($6000) = Data
; Port A ($6001) = Control (E=Bit0, RW=Bit1, RS=Bit2)

.ORG $8000

RESET:
  LDX #$FF
  TXS         ; Init Stack

  LDA #$FF
  STA $6002   ; Set DDRB (Data) to output
  STA $6003   ; Set DDRA (Control) to output

  ; Init LCD (Function Set: 8-bit, 2-line, 5x8)
  LDA #%00111000
  JSR LCD_INST

  ; Display On/Off Control (Display On, Cursor On, Blink Off)
  LDA #%00001110
  JSR LCD_INST

  ; Entry Mode Set (Increment, No Shift)
  LDA #%00000110
  JSR LCD_INST

  ; Clear Display
  LDA #%00000001
  JSR LCD_INST

  ; Print Characters
  LDA #"H"
  JSR LCD_CHAR
  LDA #"E"
  JSR LCD_CHAR
  LDA #"L"
  JSR LCD_CHAR
  LDA #"L"
  JSR LCD_CHAR
  LDA #"O"
  JSR LCD_CHAR
  LDA #" "
  JSR LCD_CHAR
  LDA #"W"
  JSR LCD_CHAR
  LDA #"O"
  JSR LCD_CHAR
  LDA #"R"
  JSR LCD_CHAR
  LDA #"L"
  JSR LCD_CHAR
  LDA #"D"
  JSR LCD_CHAR

LOOP:
  JMP LOOP

LCD_INST:
  JSR CHECK_BUSY
  STA $6000  ; Put instruction on Port B
  LDA #0     ; RS=0, RW=0, E=0
  STA $6001
  LDA #1     ; E=1 (Enable High)
  STA $6001
  LDA #0     ; E=0 (Enable Low - Latch)
  STA $6001
  RTS

LCD_CHAR:
  JSR CHECK_BUSY
  STA $6000  ; Put char on Port B
  LDA #%00000100 ; RS=1, RW=0, E=0
  STA $6001
  LDA #%00000101 ; E=1
  STA $6001
  LDA #%00000100 ; E=0
  STA $6001
  RTS

CHECK_BUSY:
  ; Simplified: Just return.
  ; Real HW would check Busy Flag, but for sim we assume instant.
  RTS
`;

export function useComputer(): UseComputerReturn {
  const compRef = useRef<Computer>(new Computer());
  const [state, setState] = useState<ComputerState | null>(null);
  const [clockSpeed, setClockSpeed] = useState<ClockSpeed>(ClockSpeed.MEDIUM);
  const [sourceCode, setSourceCode] = useState(ALL_EXAMPLES.find(e => e.id === DEFAULT_EXAMPLE_ID)?.code || '');
  const [lastAssembledCode, setLastAssembledCode] = useState("");
  const [lineMapping, setLineMapping] = useState<Record<number, number>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedRomName, setLoadedRomName] = useState<string | null>(null);
  const [selectedExampleId, setSelectedExampleId] = useState(DEFAULT_EXAMPLE_ID);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const syncState = useCallback(() => {
    setState(compRef.current.getState());
  }, []);

  const handleReset = useCallback(() => {
    // Clear ACIA TX buffer on reset
    compRef.current.clearAciaTxBuffer();

    if (loadedRomName) {
      compRef.current.reset(undefined);
      syncState();
      setIsRunning(false);
      return;
    }

    const { binary, error: assembleError, lineMapping: mapping } = assemble(sourceCode);
    if (assembleError) {
      setError(assembleError);
      return;
    }
    setError(null);
    compRef.current.reset(binary);
    setLastAssembledCode(sourceCode);
    setLineMapping(mapping);
    syncState();
    setIsRunning(false);
  }, [loadedRomName, sourceCode, syncState]);

  const handleLoadRom = useCallback((data: Uint8Array, name: string) => {
    if (data.length === 0) {
      // Eject
      setLoadedRomName(null);
      setClockSpeed(ClockSpeed.MEDIUM);
      setIsRunning(false);

      setTimeout(() => {
        const { binary, lineMapping: mapping } = assemble(sourceCode);
        compRef.current.reset(binary);
        setLastAssembledCode(sourceCode);
        setLineMapping(mapping);
        syncState();
      }, 50);
    } else {
      // Load Cartridge
      compRef.current.loadCartridge(data);
      setLoadedRomName(name);
      setClockSpeed(ClockSpeed.ATARI_2600);
      syncState();
      setIsRunning(true);
      setError(null);
    }
  }, [sourceCode, syncState]);

  const handleRun = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      return;
    }

    if (!loadedRomName && sourceCode !== lastAssembledCode) {
      const { binary, error: assembleError, lineMapping: mapping } = assemble(sourceCode);
      if (assembleError) {
        setError(assembleError);
        return;
      }
      setError(null);
      compRef.current.reset(binary);
      setLastAssembledCode(sourceCode);
      setLineMapping(mapping);
      syncState();
    }
    setIsRunning(true);
  }, [isRunning, loadedRomName, sourceCode, lastAssembledCode, syncState]);

  const handleStep = useCallback(() => {
    compRef.current.clock();
    syncState();
  }, [syncState]);

  const toggleTiaFormat = useCallback(() => {
    if (!state) return;
    compRef.current.setTiaConfig({
      format: state.tia.config.format === 'NTSC' ? 'PAL' : 'NTSC'
    });
    syncState();
  }, [state, syncState]);

  const toggleTiaScanlineLimit = useCallback(() => {
    if (!state) return;
    compRef.current.setTiaConfig({
      scanlineLimit: !state.tia.config.scanlineLimit
    });
    syncState();
  }, [state, syncState]);

  const toggleTiaAudio = useCallback(() => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    compRef.current.setTiaAudio(newState);
  }, [audioEnabled]);

  const handleConsoleInput = useCallback((
    type: 'SELECT' | 'RESET' | 'COLOR' | 'DIFF0' | 'DIFF1',
    pressed: boolean
  ) => {
    compRef.current.setInputState(type, pressed);
    syncState();
  }, [syncState]);

  const handleJoystick = useCallback((
    player: 0 | 1,
    direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'FIRE',
    pressed: boolean
  ) => {
    compRef.current.setJoystickState(player, direction, pressed);
  }, []);

  const sendSerialChar = useCallback((char: number) => {
    compRef.current.sendSerialChar(char);
    syncState();
  }, [syncState]);

  const clearAciaTxBuffer = useCallback(() => {
    compRef.current.clearAciaTxBuffer();
    syncState();
  }, [syncState]);

  const handleEjectRom = useCallback(() => {
    handleLoadRom(new Uint8Array(0), '');
  }, [handleLoadRom]);

  const loadExample = useCallback((exampleId: string) => {
    const example = ALL_EXAMPLES.find(e => e.id === exampleId);
    if (!example) return;

    setSelectedExampleId(exampleId);
    setError(null);

    if (example.type === 'rom' && example.romPath) {
      // Load ROM from file
      setSourceCode(example.code);
      fetch(example.romPath)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load ROM: ${res.statusText}`);
          return res.arrayBuffer();
        })
        .then(buffer => {
          const data = new Uint8Array(buffer);
          const name = example.romPath!.split('/').pop() || 'rom.bin';
          // Use handleLoadRom which properly loads cartridge, sets clock, and resets CPU
          handleLoadRom(data, name);
        })
        .catch(err => {
          setError(String(err));
        });
    } else {
      // Regular code example - fully eject any loaded ROM and reset computer
      setIsRunning(false);
      setLoadedRomName(null);
      setClockSpeed(ClockSpeed.MEDIUM);
      setSourceCode(example.code);

      // Reset the computer with the new code after state updates flush
      setTimeout(() => {
        compRef.current.clearAciaTxBuffer();
        const { binary, error: assembleError, lineMapping: mapping } = assemble(example.code);
        if (assembleError) {
          setError(assembleError);
          return;
        }
        compRef.current.reset(binary);
        setLastAssembledCode(example.code);
        setLineMapping(mapping);
        syncState();
      }, 50);
    }
  }, [syncState, handleLoadRom]);

  // Initialize on mount
  useEffect(() => {
    handleReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main execution loop with high-precision timing for Atari 2600 emulation
  useEffect(() => {
    let frameId: number;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // High-precision timing state
    // Using a reference timestamp to avoid drift over time
    let startTime = performance.now();
    let targetCycles = 0;  // Total cycles we should have executed since startTime
    let executedCycles = 0; // Total cycles actually executed since startTime
    let lastSyncTime = 0;  // Last time we synced React state
    let lastFrameTime = performance.now();
    let frameAccumulator = 0;
    const SYNC_INTERVAL_MS = 100; // Sync React state every 100ms (TIA renders independently)

    // Frame-based execution for Atari 2600 mode
    // Uses readyToDraw flag from TIA VSYNC for frame-accurate emulation
    // This eliminates timing stutters by running until frame is complete
    const executeAtariFrame = () => {
      if (!isRunning) return;

      const now = performance.now();
      const config = compRef.current.getTiaConfig();
      const frameDuration = config?.format === 'PAL' ? (1000 / 50) : (1000 / 59.94);

      // Frame pacing to avoid running faster than real hardware on high-refresh displays
      // Accumulate elapsed time and run 0..N frames to catch up
      const delta = now - lastFrameTime;
      lastFrameTime = now;
      frameAccumulator += delta;

      const maxFramesPerTick = 2;
      let framesToRun = Math.floor(frameAccumulator / frameDuration);
      if (framesToRun > maxFramesPerTick) framesToRun = maxFramesPerTick;

      for (let f = 0; f < framesToRun; f++) {
        // Safety limit to prevent infinite loops
        const MAX_CYCLES_PER_FRAME = 40000;
        let cycles = 0;

        // Run until TIA signals frame is ready or we hit safety limit
        while (!compRef.current.isTiaReadyToDraw() && cycles < MAX_CYCLES_PER_FRAME) {
          if (compRef.current.isTiaWsyncActive()) {
            compRef.current.clockTiaOnly();
            cycles++;
          } else {
            compRef.current.clock();
            cycles++;
          }
        }

        if (compRef.current.isTiaReadyToDraw()) {
          compRef.current.clearTiaReadyToDraw();
          executedCycles += cycles;
        }

        frameAccumulator -= frameDuration;
      }

      // Sync React state at reduced frequency
      if (now - lastSyncTime > SYNC_INTERVAL_MS) {
        syncState();
        lastSyncTime = now;
      }

      frameId = requestAnimationFrame(executeAtariFrame);
    };

    // Precision loop for high-speed modes using both rAF and setInterval
    // setInterval provides more consistent timing than rAF alone
    const executePrecisionLoop = () => {
      if (!isRunning) return;

      const now = performance.now();
      const elapsed = now - startTime;

      targetCycles = Math.floor((elapsed * clockSpeed) / 1000);
      let cyclesToRun = targetCycles - executedCycles;

      // More aggressive catch-up limit for precision mode
      const maxCatchUp = Math.ceil(clockSpeed / 30); // ~2 frames
      if (cyclesToRun > maxCatchUp) {
        startTime = now - (maxCatchUp * 1000 / clockSpeed);
        targetCycles = Math.floor(((now - startTime) * clockSpeed) / 1000);
        cyclesToRun = targetCycles - executedCycles;
      }

      if (cyclesToRun > 0) {
        for (let i = 0; i < cyclesToRun; i++) {
          compRef.current.clock();
        }
        executedCycles += cyclesToRun;
        syncState();
      }
    };

    // Low speed loop with simple timing
    const executeLowSpeedLoop = (time: number) => {
      if (!isRunning || clockSpeed === ClockSpeed.MANUAL) return;

      const now = performance.now();
      const elapsed = now - startTime;

      targetCycles = Math.floor((elapsed * clockSpeed) / 1000);
      const cyclesToRun = targetCycles - executedCycles;

      if (cyclesToRun > 0) {
        for (let i = 0; i < cyclesToRun; i++) {
          compRef.current.clock();
        }
        executedCycles += cyclesToRun;
        syncState();
      }

      frameId = requestAnimationFrame(executeLowSpeedLoop);
    };

    if (isRunning && clockSpeed !== ClockSpeed.MANUAL) {
      // Reset timing state
      startTime = performance.now();
      targetCycles = 0;
      executedCycles = 0;

      if (clockSpeed === ClockSpeed.ATARI_2600) {
        // Use frame-based execution for Atari 2600 mode
        // Only requestAnimationFrame - no backup interval to avoid execution conflicts
        frameId = requestAnimationFrame(executeAtariFrame);
      } else if (clockSpeed >= ClockSpeed.MHZ1) {
        // High speed mode: use both rAF and interval for precision
        frameId = requestAnimationFrame(executePrecisionLoop);
        intervalId = setInterval(executePrecisionLoop, 4);
      } else {
        // Low speed mode: rAF is sufficient
        frameId = requestAnimationFrame(executeLowSpeedLoop);
      }
    }

    return () => {
      cancelAnimationFrame(frameId);
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, clockSpeed, syncState]);

  return {
    state,
    isRunning,
    clockSpeed,
    error,
    loadedRomName,
    sourceCode,
    lastAssembledCode,
    lineMapping,
    selectedExampleId,
    examples: ALL_EXAMPLES,
    audioEnabled,
    computerRef: compRef,
    setSourceCode,
    setClockSpeed,
    handleReset,
    handleRun,
    handleStep,
    handleLoadRom,
    handleEjectRom,
    toggleTiaFormat,
    toggleTiaScanlineLimit,
    toggleTiaAudio,
    handleConsoleInput,
    handleJoystick,
    loadExample,
    sendSerialChar,
    clearAciaTxBuffer,
  };
}
