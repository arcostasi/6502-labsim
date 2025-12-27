
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Switch } from '../ui/Switch';
import { TiaState } from '../../types';
import { Computer } from '../../services/computer';

interface TiaBreakoutProps {
  tia: TiaState;
  computerRef?: React.MutableRefObject<Computer>; // Direct access to Computer for high-performance rendering
  onToggleFormat: () => void;
  onToggleColor: () => void;
  onToggleDiff0: () => void;
  onToggleDiff1: () => void;
  onToggleScanlineLimit: () => void;
  onReset: (pressed: boolean) => void;
  onSelect: (pressed: boolean) => void;
  onPower: () => void;
  isPowered: boolean;
  onJoystick?: (player: 0 | 1, direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'FIRE', pressed: boolean) => void;
  onToggleAudio?: () => void;
  audioEnabled?: boolean;
}

// TV System resolutions
// NTSC: 262 total scanlines, ~37 VBLANK, 192 visible, ~33 overscan
// PAL:  312 total scanlines, ~48 VBLANK, 228 visible, ~36 overscan
// TIA framebuffer is ALWAYS 160x192 - the TIA handles VBLANK internally
const TV_SYSTEMS = {
  NTSC: {
    totalScanlines: 262,
    visibleHeight: 192, // Standard NTSC visible area (matches TIA_HEIGHT)
    bufferWidth: 160,   // TIA ALWAYS generates exactly 160 horizontal pixels
    bufferHeight: 192   // TIA framebuffer height
  },
  PAL: {
    totalScanlines: 312,
    visibleHeight: 192, // Same buffer size - TIA clips to 192
    bufferWidth: 160,   // TIA ALWAYS generates exactly 160 horizontal pixels
    bufferHeight: 192   // TIA framebuffer height
  }
};

// TIA constants - these NEVER change regardless of TV system
const TIA_WIDTH = 160;
const TIA_HEIGHT = 192;
const LEFT_EDGE_MASK_PIXELS = 1;

// Scale multipliers for display
const SCALE_OPTIONS = [1, 2, 3, 4] as const;
type ScaleOption = typeof SCALE_OPTIONS[number];

// Scanline effect intensity (0 = off, 1 = subtle, 2 = medium, 3 = strong)
const SCANLINE_OPTIONS = [0, 1, 2, 3] as const;
type ScanlineOption = typeof SCANLINE_OPTIONS[number];

export const TiaBreakout: React.FC<TiaBreakoutProps> = ({
  tia,
  computerRef,
  onToggleFormat,
  onToggleColor,
  onToggleDiff0,
  onToggleDiff1,
  onToggleScanlineLimit,
  onReset,
  onSelect,
  onPower,
  isPowered,
  onJoystick,
  onToggleAudio,
  audioEnabled = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track scanline for display (updated independently)
  const [displayScanline, setDisplayScanline] = useState(0);

  // Get TV system parameters
  const tvSystem = TV_SYSTEMS[tia.config.format];
  const { totalScanlines } = tvSystem;

  // Display scale (2x default for good visibility)
  const [scale, setScale] = useState<ScaleOption>(2);

  // Scanline effect intensity
  const [scanlineIntensity, setScanlineIntensity] = useState<ScanlineOption>(1);

  // CRITICAL: Canvas internal dimensions are ALWAYS 160x192 (TIA native resolution)
  // The aspect ratio correction happens ONLY in CSS, never in the framebuffer
  // Atari 2600 pixels are NOT square - they are stretched horizontally on CRT
  // The 160 horizontal pixels fill the same width as the 4:3 aspect requires
  // For proper 4:3: displayWidth = visibleHeight * (4/3) = 192 * 4/3 = 256 CSS pixels
  const aspectCorrectedWidth = Math.round(TIA_HEIGHT * (4 / 3)); // Always 256 for 4:3
  const displayWidth = aspectCorrectedWidth * scale;  // CSS width only
  const displayHeight = TIA_HEIGHT * scale;           // CSS height only

  const [resetPressed, setResetPressed] = useState(false);
  const [selectPressed, setSelectPressed] = useState(false);

  // Cycle through scale options
  const cycleScale = () => {
    const currentIndex = SCALE_OPTIONS.indexOf(scale);
    const nextIndex = (currentIndex + 1) % SCALE_OPTIONS.length;
    setScale(SCALE_OPTIONS[nextIndex]);
  };

  // Cycle through scanline intensity options
  const cycleScanlines = () => {
    const currentIndex = SCANLINE_OPTIONS.indexOf(scanlineIntensity);
    const nextIndex = (currentIndex + 1) % SCANLINE_OPTIONS.length;
    setScanlineIntensity(SCANLINE_OPTIONS[nextIndex]);
  };

  // Get scanline label
  const getScanlineLabel = () => {
    switch (scanlineIntensity) {
      case 0: return 'OFF';
      case 1: return 'LOW';
      case 2: return 'MED';
      case 3: return 'HIGH';
    }
  };

  // Calculate scanline CSS opacity based on intensity
  const getScanlineOpacity = () => {
    switch (scanlineIntensity) {
      case 0: return 0;
      case 1: return 0.15;
      case 2: return 0.25;
      case 3: return 0.4;
    }
  };

  // Keyboard controls for joystick
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!onJoystick || !isPowered) return;

    // Prevent default for game keys
    const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ'];
    if (gameKeys.includes(e.code)) {
      e.preventDefault();
    }

    // Player 0 controls (Arrow keys + Space)
    switch (e.code) {
      case 'ArrowUp': onJoystick(0, 'UP', true); break;
      case 'ArrowDown': onJoystick(0, 'DOWN', true); break;
      case 'ArrowLeft': onJoystick(0, 'LEFT', true); break;
      case 'ArrowRight': onJoystick(0, 'RIGHT', true); break;
      case 'Space': onJoystick(0, 'FIRE', true); break;
      // Player 1 controls (WASD + Z)
      case 'KeyW': onJoystick(1, 'UP', true); break;
      case 'KeyS': onJoystick(1, 'DOWN', true); break;
      case 'KeyA': onJoystick(1, 'LEFT', true); break;
      case 'KeyD': onJoystick(1, 'RIGHT', true); break;
      case 'KeyZ': onJoystick(1, 'FIRE', true); break;
      // Console controls
      case 'F1': onSelect(true); break;
      case 'F2': onReset(true); break;
    }
  }, [onJoystick, isPowered, onSelect, onReset]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!onJoystick) return;

    switch (e.code) {
      case 'ArrowUp': onJoystick(0, 'UP', false); break;
      case 'ArrowDown': onJoystick(0, 'DOWN', false); break;
      case 'ArrowLeft': onJoystick(0, 'LEFT', false); break;
      case 'ArrowRight': onJoystick(0, 'RIGHT', false); break;
      case 'Space': onJoystick(0, 'FIRE', false); break;
      case 'KeyW': onJoystick(1, 'UP', false); break;
      case 'KeyS': onJoystick(1, 'DOWN', false); break;
      case 'KeyA': onJoystick(1, 'LEFT', false); break;
      case 'KeyD': onJoystick(1, 'RIGHT', false); break;
      case 'KeyZ': onJoystick(1, 'FIRE', false); break;
      case 'F1': onSelect(false); break;
      case 'F2': onReset(false); break;
    }
  }, [onJoystick, onSelect, onReset]);

  // Add keyboard listeners when focused
  useEffect(() => {
    if (isPowered) {
      globalThis.addEventListener('keydown', handleKeyDown);
      globalThis.addEventListener('keyup', handleKeyUp);
      return () => {
        globalThis.removeEventListener('keydown', handleKeyDown);
        globalThis.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [isPowered, handleKeyDown, handleKeyUp]);

  // Store refs to avoid useEffect dependency issues
  const computerRefStable = useRef(computerRef);
  const tiaRef = useRef(tia);

  // Update refs when props change (without triggering useEffect restart)
  useEffect(() => {
    computerRefStable.current = computerRef;
    tiaRef.current = tia;
  });

  // Independent render loop for smooth TIA display
  // This runs at 60fps completely independent of React state updates
  // CRITICAL: Canvas is ALWAYS 160x192 - this matches the TIA framebuffer exactly
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // FIXED: Canvas internal resolution is ALWAYS 160x192 (TIA native)
    // This ensures 1:1 mapping between framebuffer and canvas pixels
    canvas.width = TIA_WIDTH;
    canvas.height = TIA_HEIGHT;

    // Pre-allocate ImageData at fixed TIA resolution
    const imgData = ctx.createImageData(TIA_WIDTH, TIA_HEIGHT);
    const imgDataArray = imgData.data;

    let animationId: number;
    let isRunning = true;

    const renderFrame = () => {
      if (!isRunning) return;

      // Get framebuffer directly from Computer (high-performance path)
      const compRef = computerRefStable.current;
      const frameBuffer = compRef?.current?.getTiaFrameBuffer();
      const config = compRef?.current?.getTiaConfig();

      if (frameBuffer && config) {
        const isBW = config.colorMode === 'BW';

        // FIXED: Always read exactly 160x192 pixels from framebuffer
        // No aspect ratio correction here - that's CSS only
        // No VBLANK offset - TIA already clips to visible area internally
        for (let y = 0; y < TIA_HEIGHT; y++) {
          const srcRowOffset = y * TIA_WIDTH;  // Source: y * 160
          const dstRowOffset = y * TIA_WIDTH * 4; // Dest: y * 160 * 4

          for (let x = 0; x < TIA_WIDTH; x++) {
            if (x < LEFT_EDGE_MASK_PIXELS) {
              const maskedIdx = dstRowOffset + x * 4;
              imgDataArray[maskedIdx] = 0;
              imgDataArray[maskedIdx + 1] = 0;
              imgDataArray[maskedIdx + 2] = 0;
              imgDataArray[maskedIdx + 3] = 255;
              continue;
            }

            const rgb = frameBuffer[srcRowOffset + x];
            const dstIdx = dstRowOffset + x * 4;

            if (isBW) {
              // Grayscale conversion using standard luminance weights
              const lum = ((rgb >> 16) * 77 + ((rgb >> 8) & 0xFF) * 150 + (rgb & 0xFF) * 29) >> 8;
              imgDataArray[dstIdx] = lum;
              imgDataArray[dstIdx + 1] = lum;
              imgDataArray[dstIdx + 2] = lum;
            } else {
              imgDataArray[dstIdx] = (rgb >> 16) & 0xFF;     // R
              imgDataArray[dstIdx + 1] = (rgb >> 8) & 0xFF;  // G
              imgDataArray[dstIdx + 2] = rgb & 0xFF;         // B
            }
            imgDataArray[dstIdx + 3] = 255; // Alpha
          }
        }

        ctx.putImageData(imgData, 0, 0);
      }

      // Continue render loop
      animationId = requestAnimationFrame(renderFrame);
    };

    // Start render loop immediately
    animationId = requestAnimationFrame(renderFrame);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationId);
    };
  }, []); // Empty dependencies - loop runs independently forever

  // Separate effect for scanline display update (low frequency)
  useEffect(() => {
    if (!isPowered) return;

    const intervalId = setInterval(() => {
      const compRef = computerRef?.current;
      if (compRef) {
        const lightState = compRef.getTiaLightweightState();
        setDisplayScanline(lightState.scanline);
      }
    }, 200); // Update every 200ms

    return () => clearInterval(intervalId);
  }, [isPowered, computerRef]);

  return (
    <div
      ref={containerRef}
      className={`visualizer-panel relative bg-[#1a1510] p-6 rounded-xl shadow-2xl border-4 flex flex-col items-center cursor-default outline-none transition-colors min-w-90 ${isPowered ? 'border-yellow-600' : 'border-[#3e2723]'}`}
    >
      {/* Woodgrain Texture Effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none rounded-lg" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")` }}></div>

      <div className="absolute top-2 left-3 text-[10px] font-bold text-[#8d6e63] tracking-widest uppercase z-10">VIDEO SYSTEM</div>
      <div className="absolute top-2 right-3 text-[10px] font-bold text-[#8d6e63] tracking-widest uppercase z-10">TIA 1A</div>

      {/* CRT Screen */}
      {/* FIXED: Canvas is ALWAYS 160x192 internally (TIA native resolution) */}
      {/* Aspect ratio correction happens ONLY via CSS width/height */}
      <div className="relative bg-black rounded-lg border-4 border-[#111] shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-hidden mt-4">
        <canvas
          ref={canvasRef}
          width={TIA_WIDTH}
          height={TIA_HEIGHT}
          className="bg-black"
          style={{
            imageRendering: 'pixelated',
            width: `${displayWidth}px`,   // CSS stretches 160 → 256*scale for 4:3
            height: `${displayHeight}px`  // CSS stretches 192 → 192*scale
          }}
        />

        {/* CRT Scanline Overlay Effect */}
        {scanlineIntensity > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 1px,
                rgba(0, 0, 0, ${getScanlineOpacity()}) 1px,
                rgba(0, 0, 0, ${getScanlineOpacity()}) 2px
              )`,
              backgroundSize: `100% ${scale * 2}px`,
              mixBlendMode: 'multiply'
            }}
          />
        )}

        {/* CRT Screen Curvature/Glow Effect */}
        <div
          className="absolute inset-0 pointer-events-none rounded"
          style={{
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.3)',
            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.3) 100%)'
          }}
        />
      </div>

      {/* Control Panel */}
      <div className="w-full bg-[#111] mt-6 p-3 rounded border-t border-[#333] flex justify-between items-center z-10 relative">
        <div className="flex gap-4">
          <Switch label="POWER" active={isPowered} onClick={onPower} />
          <Switch label="COLOR" active={tia.config.colorMode === 'COLOR'} onClick={onToggleColor} />
        </div>

        <div className="flex gap-4">
          <Switch label="L DIFF" active={tia.config.difficulty0 === 'A'} onClick={onToggleDiff0} />
          <Switch label="R DIFF" active={tia.config.difficulty1 === 'A'} onClick={onToggleDiff1} />
        </div>

        <div className="flex gap-4">
          <Switch
            label="SELECT"
            active={selectPressed}
            onClick={() => { }}
            type="momentary"
            onMouseDown={() => { setSelectPressed(true); onSelect(true); }}
            onMouseUp={() => { setSelectPressed(false); onSelect(false); }}
          />
          <Switch
            label="RESET"
            active={resetPressed}
            onClick={() => { }}
            type="momentary"
            onMouseDown={() => { setResetPressed(true); onReset(true); }}
            onMouseUp={() => { setResetPressed(false); onReset(false); }}
          />
        </div>
      </div>

      <div className="mt-2 flex gap-2 text-[9px] text-[#555] font-mono whitespace-nowrap">
        <span>
          SYNC: <button type="button" className={`cursor-pointer hover:text-white ${tia.config.scanlineLimit ? 'text-green-500' : 'text-red-500'}`} onClick={onToggleScanlineLimit}>
            {tia.config.scanlineLimit ? 'ON' : 'OFF'}
          </button>
        </span>
        <span>
          AUDIO: <button type="button" className={`cursor-pointer hover:text-white ${audioEnabled ? 'text-green-500' : 'text-red-500'}`} onClick={onToggleAudio}>
            {audioEnabled ? 'ON' : 'OFF'}
          </button>
        </span>
        <span>FMT: <button type="button" className="text-[#888] cursor-pointer hover:text-white" onClick={onToggleFormat}>{tia.config.format}</button></span>
        <span>SCALE: <button type="button" className="text-cyan-500 cursor-pointer hover:text-white" onClick={cycleScale}>{scale}x</button></span>
        <span>SCAN: <button type="button" className={`cursor-pointer hover:text-white ${scanlineIntensity > 0 ? 'text-green-500' : 'text-red-500'}`} onClick={cycleScanlines}>{getScanlineLabel()}</button></span>
        <span>RES: <span className="tabular-nums">{TIA_WIDTH}×{TIA_HEIGHT}</span></span>
        <span className="whitespace-nowrap">LINE: <span className="tabular-nums inline-block w-17.5">{String(displayScanline).padStart(3, ' ')}/{String(totalScanlines).padStart(3, ' ')}</span></span>
      </div>

      {/* Keyboard controls hint */}
      {isPowered && (
        <div className="mt-2 text-[8px] text-yellow-600 font-mono text-center">
          P1: ←↑↓→ + SPACE | P2: WASD + Z | F1: SELECT | F2: RESET
        </div>
      )}
    </div>
  );
};
