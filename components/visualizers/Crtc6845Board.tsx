import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Monitor, Settings, Trash2, Type, Terminal, Cpu, Keyboard } from 'lucide-react';
import { Chip } from '../Chip';
import { Led } from '../ui/Led';
import { Computer } from '../../services/computer';
import { CrtcState } from '../../types';

interface Crtc6845BoardProps {
  computerRef?: React.MutableRefObject<Computer>;
  crtc?: CrtcState;
}

const REGISTER_INFO = [
  { id: 0, name: 'R0', label: 'H Total', color: 'cyan' },
  { id: 1, name: 'R1', label: 'H Displayed', color: 'cyan' },
  { id: 2, name: 'R2', label: 'H Sync Pos', color: 'cyan' },
  { id: 3, name: 'R3', label: 'Sync Widths', color: 'cyan' },
  { id: 4, name: 'R4', label: 'V Total', color: 'green' },
  { id: 5, name: 'R5', label: 'V Adjust', color: 'green' },
  { id: 6, name: 'R6', label: 'V Displayed', color: 'green' },
  { id: 7, name: 'R7', label: 'V Sync Pos', color: 'green' },
  { id: 8, name: 'R8', label: 'Interlace', color: 'purple' },
  { id: 9, name: 'R9', label: 'Max Scanline', color: 'purple' },
  { id: 10, name: 'R10', label: 'Cursor Start', color: 'yellow' },
  { id: 11, name: 'R11', label: 'Cursor End', color: 'yellow' },
  { id: 12, name: 'R12', label: 'Start Addr H', color: 'orange' },
  { id: 13, name: 'R13', label: 'Start Addr L', color: 'orange' },
  { id: 14, name: 'R14', label: 'Cursor H', color: 'yellow' },
  { id: 15, name: 'R15', label: 'Cursor L', color: 'yellow' },
];

type TabType = 'display' | 'registers' | 'terminal';

// CRT phosphor colors
const PHOSPHOR_COLORS = {
  green: { fg: 0xFF33FF66, bg: 0xFF0A1A0A, name: 'P1 Green' },
  amber: { fg: 0xFF00BBFF, bg: 0xFF0A0A00, name: 'P3 Amber' },
  white: { fg: 0xFFE0E0E0, bg: 0xFF101010, name: 'P4 White' },
};

export const Crtc6845Board: React.FC<Crtc6845BoardProps> = ({ computerRef, crtc }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('display');
  const [charClockMHz, setCharClockMHz] = useState(1);
  const [phosphorColor, setPhosphorColor] = useState<keyof typeof PHOSPHOR_COLORS>('green');
  const [inputText, setInputText] = useState('');
  const [localRegisters, setLocalRegisters] = useState<number[]>([
    95, 80, 82, 0x28, 31, 0, 25, 28, 0, 7, 0x60, 7, 0, 0, 0, 0
  ]);
  const [scale, setScale] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);

  // Clear focus highlight when switching away from terminal tab
  useEffect(() => {
    if (activeTab !== 'terminal') {
      setIsFocused(false);
      rootRef.current?.blur();
    }
  }, [activeTab]);
  const [isFocused, setIsFocused] = useState(false);

  // Get current registers (from computer or local state)
  const registers = crtc?.registers || localRegisters;

  // Update local register (for standalone mode)
  const updateRegister = useCallback((index: number, value: number) => {
    const clampedValue = Math.max(0, Math.min(255, value));
    if (computerRef?.current) {
      computerRef.current.setCrtcRegister(index, clampedValue);
    } else {
      setLocalRegisters(prev => {
        const next = [...prev];
        next[index] = clampedValue;
        return next;
      });
    }
  }, [computerRef]);

  // Update char clock
  const handleCharClockChange = useCallback((mhz: number) => {
    setCharClockMHz(mhz);
    if (computerRef?.current) {
      computerRef.current.setCrtcCharClock(mhz);
    }
  }, [computerRef]);

  // Derived timing calculations
  const derived = useMemo(() => {
    const hTotal = registers[0] + 1;
    const hDisplayed = registers[1];
    const hSyncPos = registers[2];
    const hSyncWidth = registers[3] & 0x0F;

    const vTotal = registers[4] + 1;
    const vTotalAdjust = registers[5];
    const vDisplayed = registers[6];
    const vSyncPos = registers[7];
    const vSyncWidth = ((registers[3] >> 4) & 0x0F) || 16;
    const maxScanline = (registers[9] & 0x1F) + 1;

    const totalScanlines = (vTotal * maxScanline) + vTotalAdjust;
    const hFreq = charClockMHz > 0 ? (charClockMHz * 1_000_000) / hTotal : 0;
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
  }, [registers, charClockMHz]);

  // Render loop
  useEffect(() => {
    if (!canvasRef.current || activeTab !== 'display') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    let animationId: number;
    let isRunning = true;

    const renderFrame = () => {
      if (!isRunning) return;

      const { pixelWidth, pixelHeight } = derived;

      // Set canvas size based on display dimensions
      const canvasWidth = Math.max(80, Math.min(800, pixelWidth));
      const canvasHeight = Math.max(80, Math.min(400, pixelHeight));

      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      }

      // Get framebuffer from computer or render standalone
      if (computerRef?.current) {
        const frameBuffer = computerRef.current.getCrtcFrameBuffer();
        const imgData = ctx.createImageData(canvasWidth, canvasHeight);
        const data = imgData.data;

        for (let y = 0; y < canvasHeight; y++) {
          for (let x = 0; x < canvasWidth; x++) {
            const srcIdx = y * 800 + x;
            const dstIdx = (y * canvasWidth + x) * 4;
            const color = frameBuffer[srcIdx];

            // ABGR to RGBA
            data[dstIdx] = (color >> 16) & 0xFF;     // R
            data[dstIdx + 1] = (color >> 8) & 0xFF;  // G
            data[dstIdx + 2] = color & 0xFF;         // B
            data[dstIdx + 3] = 255;                  // A
          }
        }

        ctx.putImageData(imgData, 0, 0);
      } else {
        // Standalone mode - draw test pattern
        const { fg, bg } = PHOSPHOR_COLORS[phosphorColor];
        ctx.fillStyle = `#${(bg & 0xFFFFFF).toString(16).padStart(6, '0')}`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        ctx.fillStyle = `#${(fg & 0xFFFFFF).toString(16).padStart(6, '0')}`;
        ctx.font = '8px monospace';

        // Draw test pattern with current settings
        const cols = derived.hDisplayed;
        const rows = derived.vDisplayed;

        for (let row = 0; row < Math.min(rows, 25); row++) {
          for (let col = 0; col < Math.min(cols, 80); col++) {
            if (row === 0) {
              // Header line
              const char = '6845 CRTC TEST PATTERN'.charAt(col) || ' ';
              ctx.fillText(char, col * 8, row * derived.maxScanline + 8);
            } else if (row === 1) {
              // Resolution line
              const text = `${cols}x${rows} @ ${derived.vFreq.toFixed(1)}Hz`;
              const char = text.charAt(col) || ' ';
              ctx.fillText(char, col * 8, row * derived.maxScanline + 8);
            } else {
              // Grid pattern
              const charCode = ((row * cols + col) % 94) + 33;
              const char = String.fromCodePoint(charCode);
              ctx.fillText(char, col * 8, row * derived.maxScanline + 8);
            }
          }
        }
      }

      animationId = requestAnimationFrame(renderFrame);
    };

    animationId = requestAnimationFrame(renderFrame);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationId);
    };
  }, [activeTab, derived, computerRef, phosphorColor]);

  // Handle keyboard input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!computerRef?.current || !isFocused) return;

    if (e.key === 'Enter') {
      computerRef.current.crtcPrintString(inputText + '\n');
      setInputText('');
    } else if (e.key === 'Backspace') {
      setInputText(prev => prev.slice(0, -1));
    } else if (e.key.length === 1) {
      setInputText(prev => prev + e.key);
    }
  }, [computerRef, isFocused, inputText]);

  // Clear screen
  const handleClearScreen = useCallback(() => {
    if (computerRef?.current) {
      computerRef.current.crtcClearScreen();
    }
  }, [computerRef]);

  // Print test text
  const handlePrintTest = useCallback(() => {
    if (computerRef?.current) {
      computerRef.current.crtcPrintString('Hello, World!\nCRTC 6845 Test\n');
    }
  }, [computerRef]);

  // Cycle phosphor color
  const cyclePhosphor = () => {
    const colors = Object.keys(PHOSPHOR_COLORS) as Array<keyof typeof PHOSPHOR_COLORS>;
    const idx = colors.indexOf(phosphorColor);
    setPhosphorColor(colors[(idx + 1) % colors.length]);
  };

  // Cycle scale
  const cycleScale = () => {
    setScale(prev => (prev % 3) + 1);
  };

  const displayWidth = Math.min(640, derived.pixelWidth) * scale;
  const displayHeight = Math.min(200, derived.pixelHeight) * scale;

  return (
    <div
      role="application"
      aria-label="CRTC 6845 Terminal - Press keys to type"
      ref={rootRef}
      className={`visualizer-panel relative bg-[#141414] p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] border flex flex-col gap-3 w-120 cursor-default outline-none transition-colors ${isFocused ? 'border-cyan-600' : 'border-neutral-800'}`}
      tabIndex={activeTab === 'terminal' ? 0 : undefined}
      onFocus={activeTab === 'terminal' ? () => setIsFocused(true) : undefined}
      onBlur={() => setIsFocused(false)}
      onKeyDown={activeTab === 'terminal' ? handleKeyDown : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 tracking-widest uppercase">
          <Monitor size={12} />
          6845 CRTC
        </div>
        <div className="flex items-center gap-2">
          <Led on={crtc?.hsync || false} color="cyan" small />
          <span className="text-[8px] text-neutral-500">HS</span>
          <Led on={crtc?.vsync || false} color="green" small />
          <span className="text-[8px] text-neutral-500">VS</span>
          <Led on={crtc?.displayEnable !== false} color="yellow" small />
          <span className="text-[8px] text-neutral-500">DE</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        <button
          onClick={() => setActiveTab('display')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold transition-colors ${
            activeTab === 'display'
              ? 'bg-cyan-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
          }`}
        >
          <Monitor size={12} />
          DISPLAY
        </button>
        <button
          onClick={() => setActiveTab('registers')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold transition-colors ${
            activeTab === 'registers'
              ? 'bg-purple-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
          }`}
        >
          <Cpu size={12} />
          REGISTERS
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold transition-colors ${
            activeTab === 'terminal'
              ? 'bg-green-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
          }`}
        >
          <Terminal size={12} />
          TERMINAL
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'display' && (
        <div className="flex flex-col gap-3">
          {/* CRT Display */}
          <div className="relative bg-black rounded-lg border-4 border-[#222] shadow-[inset_0_0_30px_rgba(0,0,0,1)] overflow-hidden">
            <canvas
              ref={canvasRef}
              className="bg-black"
              style={{
                imageRendering: 'pixelated',
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
              }}
            />

            {/* CRT Screen Curvature/Glow Effect */}
            <div
              className="absolute inset-0 pointer-events-none rounded"
              style={{
                boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.3)',
                background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.3) 100%)'
              }}
            />

            {/* Scanline overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0, 0, 0, 0.2) 1px, rgba(0, 0, 0, 0.2) 2px)`,
                backgroundSize: `100% ${scale * 2}px`,
              }}
            />
          </div>

          {/* Display Controls */}
          <div className="flex gap-2 text-[9px] text-neutral-500 font-mono flex-wrap">
            <span>
              PHOSPHOR: <button className="text-cyan-400 cursor-pointer hover:text-white bg-transparent border-none p-0 font-mono text-[9px]" onClick={cyclePhosphor}>{PHOSPHOR_COLORS[phosphorColor].name}</button>
            </span>
            <span>
              SCALE: <button className="text-cyan-400 cursor-pointer hover:text-white bg-transparent border-none p-0 font-mono text-[9px]" onClick={cycleScale}>{scale}x</button>
            </span>
            <span>RES: <span className="text-neutral-400">{derived.pixelWidth}×{derived.pixelHeight}</span></span>
            <span>FREQ: <span className="text-green-400">{derived.vFreq.toFixed(1)}Hz</span></span>
          </div>

          {/* Timing Info */}
          <div className="bg-black/40 border border-neutral-700 rounded p-2">
            <div className="grid grid-cols-4 gap-2 text-[9px]">
              <div className="text-center">
                <div className="text-neutral-500">H TOTAL</div>
                <div className="text-cyan-400 font-mono">{derived.hTotal}</div>
              </div>
              <div className="text-center">
                <div className="text-neutral-500">H DISP</div>
                <div className="text-cyan-400 font-mono">{derived.hDisplayed}</div>
              </div>
              <div className="text-center">
                <div className="text-neutral-500">V TOTAL</div>
                <div className="text-green-400 font-mono">{derived.vTotal}</div>
              </div>
              <div className="text-center">
                <div className="text-neutral-500">V DISP</div>
                <div className="text-green-400 font-mono">{derived.vDisplayed}</div>
              </div>
              <div className="text-center">
                <div className="text-neutral-500">SCANLINE</div>
                <div className="text-purple-400 font-mono">{derived.maxScanline}</div>
              </div>
              <div className="text-center">
                <div className="text-neutral-500">TOTAL SL</div>
                <div className="text-purple-400 font-mono">{derived.totalScanlines}</div>
              </div>
              <div className="text-center">
                <div className="text-neutral-500">H FREQ</div>
                <div className="text-yellow-400 font-mono">{(derived.hFreq/1000).toFixed(1)}k</div>
              </div>
              <div className="text-center">
                <div className="text-neutral-500">V FREQ</div>
                <div className="text-yellow-400 font-mono">{derived.vFreq.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* Char Clock */}
          <div className="flex items-center gap-2 justify-center">
            <Settings size={12} className="text-neutral-500" />
            <span className="text-[9px] text-neutral-400">CHAR CLK</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={charClockMHz}
              onChange={e => handleCharClockChange(Number(e.target.value) || 0.1)}
              className="w-16 bg-black/60 border border-neutral-700 rounded px-1 py-0.5 text-[10px] text-neutral-200 text-center"
            />
            <span className="text-[9px] text-neutral-400">MHz</span>
          </div>
        </div>
      )}

      {activeTab === 'registers' && (
        <div className="flex gap-3">
          {/* Chip Visualization */}
          <div className="flex flex-col items-center gap-2">
            <Chip name="MC6845" pins={40} className="h-40 w-14" />
            <div className="text-[8px] text-neutral-500 text-center">
              ADDR: ${crtc?.addressRegister?.toString(16).toUpperCase().padStart(2, '0') || '00'}
            </div>
          </div>

          {/* Registers Grid */}
          <div className="flex-1 grid grid-cols-2 gap-1">
            {REGISTER_INFO.map(info => (
              <div key={info.id} className="flex items-center justify-between gap-1 bg-black/40 border border-neutral-700 rounded px-1.5 py-0.5">
                <div className="flex items-center gap-1">
                  <span className={`text-[8px] font-mono text-${info.color}-400`}>{info.name}</span>
                  <span className="text-[7px] text-neutral-500 truncate" style={{maxWidth: 50}}>{info.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={registers[info.id] || 0}
                    onChange={e => updateRegister(info.id, Number(e.target.value) || 0)}
                    className="w-10 bg-black/70 border border-neutral-700 rounded px-1 py-0.5 text-[9px] text-neutral-100 text-right"
                  />
                  <span className="text-[8px] text-neutral-500 font-mono w-5">
                    {(registers[info.id] || 0).toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'terminal' && (
        <div className="flex flex-col gap-3">
          {/* Terminal Output Area */}
          <div
            className="bg-black border border-neutral-700 rounded p-2 h-48 overflow-auto font-mono text-green-400 text-[10px] leading-tight"
            style={{ fontFamily: 'monospace' }}
          >
            {computerRef?.current ? (
              <div>
                Click panel and type to send text to CRTC.
                <br />Use buttons below for quick actions.
              </div>
            ) : (
              <div className="text-neutral-500">
                No computer connected. Connect to see CRTC output.
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Type text..."
              className="flex-1 bg-black/60 border border-neutral-700 rounded px-2 py-1 text-[10px] text-neutral-200 font-mono"
              onKeyDown={e => {
                if (e.key === 'Enter' && computerRef?.current) {
                  computerRef.current.crtcPrintString(inputText + '\n');
                  setInputText('');
                }
              }}
            />
            <button
              onClick={() => {
                if (computerRef?.current) {
                  computerRef.current.crtcPrintString(inputText);
                  setInputText('');
                }
              }}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded transition-colors"
            >
              SEND
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handlePrintTest}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[9px] font-bold rounded transition-colors"
            >
              <Type size={10} />
              TEST TEXT
            </button>
            <button
              onClick={handleClearScreen}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[9px] font-bold rounded transition-colors"
            >
              <Trash2 size={10} />
              CLEAR
            </button>
            <button
              onClick={() => {
                if (computerRef?.current) {
                  computerRef.current.crtcSetCursor(0, 0);
                }
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[9px] font-bold rounded transition-colors"
            >
              <Keyboard size={10} />
              HOME
            </button>
          </div>
        </div>
      )}

      {/* Focus indicator */}
      {isFocused && (
        <div className="text-[8px] text-cyan-500 text-center">
          Panel focused - keyboard input active
        </div>
      )}
    </div>
  );
};
