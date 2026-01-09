
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateAssemblyCode } from './services/geminiService';
import { LcdDisplay } from './components/LcdDisplay';
import { CodeEditor } from './components/CodeEditor';
import { CpuBreakout, ViaBreakout, RomBreakout, TiaBreakout, ClockBreakout, AciaBreakout, TiaAudioKeyboard, Crtc6845Board } from './components/Visualizers';
import { useComputer, usePanZoom } from './hooks';
import { Cpu, Bot, Bug, ZoomIn, ZoomOut, Maximize, Move, GripVertical, FileCode, FlaskConical, Play, Pause, StepForward, RotateCcw, Trash2 } from 'lucide-react';
import { TestRunner } from './components/TestRunner';
import { ClockSpeed } from './types';

const EDITOR_MIN_WIDTH = 350;
const EDITOR_MAX_WIDTH = 800;
const EDITOR_STORAGE_KEY = '6502-editor-width';

const App: React.FC = () => {
  const {
    state,
    isRunning,
    clockSpeed,
    error,
    loadedRomName,
    sourceCode,
    lineMapping,
    selectedExampleId,
    examples,
    computerRef,
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
    audioEnabled,
  } = useComputer();

  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);

  const {
    view,
    isDragging,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetView,
    zoomIn,
    zoomOut,
  } = usePanZoom(undefined, viewportEl);

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTestRunner, setShowTestRunner] = useState(false);

  // Splitter state
  const [editorWidth, setEditorWidth] = useState(() => {
    const saved = localStorage.getItem(EDITOR_STORAGE_KEY);
    return saved ? Math.min(Math.max(Number(saved), EDITOR_MIN_WIDTH), EDITOR_MAX_WIDTH) : 450;
  });
  const isResizing = useRef(false);
  // Keep a ref so the splitter mouseup handler can save without re-registering listeners
  const editorWidthRef = useRef(editorWidth);
  useEffect(() => { editorWidthRef.current = editorWidth; }, [editorWidth]);

  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // Stable effect: no dependency on editorWidth, reads via ref to avoid
  // tearing down/re-attaching document listeners on every drag pixel.
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(Math.max(e.clientX, EDITOR_MIN_WIDTH), EDITOR_MAX_WIDTH);
      setEditorWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        localStorage.setItem(EDITOR_STORAGE_KEY, String(editorWidthRef.current));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!viewportEl) return;

    // The hook now accepts native events directly — no casting needed.
    viewportEl.addEventListener('wheel', handleWheel, { passive: true });
    viewportEl.addEventListener('mousedown', handleMouseDown);
    viewportEl.addEventListener('mousemove', handleMouseMove);
    viewportEl.addEventListener('mouseup', handleMouseUp);
    viewportEl.addEventListener('mouseleave', handleMouseUp);

    return () => {
      viewportEl.removeEventListener('wheel', handleWheel);
      viewportEl.removeEventListener('mousedown', handleMouseDown);
      viewportEl.removeEventListener('mousemove', handleMouseMove);
      viewportEl.removeEventListener('mouseup', handleMouseUp);
      viewportEl.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [viewportEl, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp]);

  const handleAi = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    const code = await generateAssemblyCode(aiPrompt);
    setSourceCode(code);
    setIsGenerating(false);
  };

  let activeLine = -1;
  if (state && lineMapping[state.cpu.pc] !== undefined && !loadedRomName) {
    activeLine = lineMapping[state.cpu.pc];
  }

  if (!state) {
    return (
      <div className="bg-neutral-900 h-screen text-white flex items-center justify-center">
        Initializing System...
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row h-screen bg-[#121212] text-gray-200 font-sans overflow-hidden">

      {/* Editor & Controls (Left) */}
      <div
        className="w-full flex flex-col border-r border-neutral-800 bg-[#1e1e1e] z-30 shadow-2xl shrink-0"
        style={{ width: editorWidth }}
      >

        {/* Header */}
        <div className="h-14 bg-[#252526] border-b border-black flex items-center px-4 shrink-0 justify-between">
          <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
            <Cpu className="text-yellow-500" />
            6502 Laboratory Simulator
          </h1>
          <button
            onClick={() => setShowTestRunner(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition-colors"
            title="Open Test Runner"
          >
            <FlaskConical size={14} />
            Test Runner
          </button>
        </div>

        {/* Example Selector */}
        <div className="bg-chip-black border-b border-neutral-800 px-3 py-2 flex items-center gap-2 min-w-0">
          <FileCode size={14} className="text-cyan-400 shrink-0" />
          <select
            value={selectedExampleId}
            onChange={(e) => loadExample(e.target.value)}
            disabled={isRunning}
            className="flex-1 min-w-0 bg-[#252526] border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 cursor-pointer truncate"
          >
            {examples.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} - {ex.description}
              </option>
            ))}
          </select>
          {loadedRomName && (
            <button
              onClick={handleEjectRom}
              className="shrink-0 p-1.5 bg-[#331111] hover:bg-[#551111] rounded border border-red-900 transition-colors"
              title="Eject ROM cartridge"
            >
              <Trash2 size={14} className="text-red-400" />
            </button>
          )}
        </div>

        {/* Execution Controls */}
        <div className="bg-chip-black border-b border-neutral-800 px-3 py-2 flex items-center gap-2">
          <button
            onClick={handleRun}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all border ${
              isRunning
                ? 'bg-red-700 hover:bg-red-600 border-red-500 text-white'
                : 'bg-green-700 hover:bg-green-600 border-green-500 text-white'
            }`}
            title={isRunning ? 'Halt' : 'Run'}
          >
            {isRunning ? <Pause size={12} /> : <Play size={12} />}
            {isRunning ? 'HALT' : 'RUN'}
          </button>

          <button
            onClick={handleStep}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-800 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs font-bold text-white transition-all border border-blue-600"
            title="Step"
          >
            <StepForward size={12} />
            STEP
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs font-bold text-white transition-all border border-neutral-500"
            title="Reset"
          >
            <RotateCcw size={12} />
            RST
          </button>

          <div className="h-6 w-px bg-neutral-700 mx-1"></div>

          <select
            value={clockSpeed}
            onChange={(e) => setClockSpeed(Number(e.target.value) as ClockSpeed)}
            className="flex-1 min-w-0 bg-[#252526] text-xs text-yellow-400 font-bold outline-none border border-neutral-600 rounded px-2 py-1.5 focus:border-yellow-500 cursor-pointer"
          >
            <option value={ClockSpeed.MANUAL}>MANUAL (Step)</option>
            <option value={ClockSpeed.SLOW}>1 Hz (Slow)</option>
            <option value={ClockSpeed.MEDIUM}>10 Hz (Medium)</option>
            <option value={ClockSpeed.FAST}>100 Hz (Fast)</option>
            <option value={ClockSpeed.ULTRA}>1 kHz (Ultra)</option>
            <option value={ClockSpeed.MHZ1}>1 MHz (Real-time)</option>
            <option value={ClockSpeed.ATARI_2600}>1.19 MHz (Atari 2600)</option>
          </select>
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col relative group overflow-hidden bg-[#1e1e1e]">
          {error && (
            <div className="absolute top-2 left-10 right-2 bg-red-900/90 text-red-100 text-xs p-2 rounded border border-red-500 z-20 flex items-start gap-2 shadow-lg backdrop-blur-sm">
              <Bug size={14} className="shrink-0 mt-0.5" />
              <span className="font-mono whitespace-pre-wrap">{error}</span>
            </div>
          )}

          <CodeEditor
            value={sourceCode}
            onChange={setSourceCode}
            activeLine={activeLine}
            readOnly={isRunning || !!loadedRomName}
          />
          {loadedRomName && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-neutral-400 font-bold mb-2">Cartridge Inserted</p>
                <p className="text-yellow-500 font-mono">{loadedRomName}</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Prompt */}
        <div className="p-3 bg-[#252526] border-t border-black">
          <div className="flex items-center gap-2 bg-[#181818] rounded p-1 border border-neutral-700 focus-within:border-purple-500 transition-colors">
            <Bot size={16} className="text-purple-400 ml-1" />
            <input
              type="text"
              placeholder="Generate assembly..."
              className="bg-transparent border-none text-xs text-white flex-1 focus:outline-none h-8"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAi()}
              disabled={isRunning}
            />
            <button
              onClick={handleAi}
              disabled={isGenerating || isRunning}
              className="text-[10px] bg-purple-700 hover:bg-purple-600 text-white px-2 py-1 rounded font-bold disabled:opacity-50"
            >
              {isGenerating ? '...' : 'GEN'}
            </button>
          </div>
        </div>
      </div>

      {/* Splitter */}
      <button
        type="button"
        aria-label="Resize editor panel"
        className="hidden xl:flex w-2 bg-chip-black hover:bg-[#333] cursor-col-resize items-center justify-center z-40 border-x border-neutral-800 transition-colors group"
        onMouseDown={handleSplitterMouseDown}
      >
        <GripVertical size={12} className="text-neutral-600 group-hover:text-neutral-400 transition-colors" />
      </button>

      {/* Main PCB Visualizer (Right) */}
      <div className="flex-1 bg-[#101010] relative overflow-hidden flex flex-col">

        {/* Top Info Bar */}
        <div className="h-14 bg-chip-black border-b border-black flex items-center px-6 gap-8 shadow-2xl z-20 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 shadow-[0_0_10px_lime]' : 'bg-red-500 shadow-[0_0_10px_red]'} transition-colors duration-300`}></div>
            <span className="text-xs font-mono font-bold text-neutral-400 tracking-wider">PWR</span>
          </div>

          <div className="h-8 w-px bg-neutral-800"></div>

          <div className="items-center gap-6 text-xs font-mono hidden lg:flex">
            {/* ADDRESS BUS with LEDs */}
            <div className="flex flex-col gap-1">
              <span className="text-neutral-500 text-[9px] tracking-wider">ADDRESS BUS</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const bit = (state.bus.address >> (15 - i)) & 1;
                    return (
                      <div
                        key={`addr-bit-${15 - i}`}
                        className={`w-2 h-2 rounded-full transition-colors ${bit ? 'bg-yellow-400 shadow-[0_0_4px_#facc15]' : 'bg-yellow-900/50'}`}
                      />
                    );
                  })}
                </div>
                <span className="text-yellow-400 font-bold text-sm leading-none">
                  {state.bus.address.toString(16).toUpperCase().padStart(4,'0')}
                </span>
              </div>
            </div>

            {/* DATA BUS with LEDs */}
            <div className="flex flex-col gap-1">
              <span className="text-neutral-500 text-[9px] tracking-wider">DATA BUS</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const bit = (state.bus.data >> (7 - i)) & 1;
                    return (
                      <div
                        key={`data-bit-${7 - i}`}
                        className={`w-2 h-2 rounded-full transition-colors ${bit ? 'bg-blue-400 shadow-[0_0_4px_#60a5fa]' : 'bg-blue-900/50'}`}
                      />
                    );
                  })}
                </div>
                <span className="text-blue-400 font-bold text-sm leading-none">
                  {state.bus.data.toString(16).toUpperCase().padStart(2,'0')}
                </span>
              </div>
            </div>

            {/* MODE */}
            <div className="flex flex-col gap-1">
              <span className="text-neutral-500 text-[9px] tracking-wider">MODE</span>
              <span className={`font-bold text-sm leading-none ${state.bus.rw ? 'text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]'}`}>
                {state.bus.rw ? 'READ' : 'WRITE'}
              </span>
            </div>
          </div>
        </div>

        {/* Viewport (Interactive Area) */}
        <div
          ref={setViewportEl}
          className="flex-1 overflow-hidden bg-[#0d0d0d] relative cursor-grab active:cursor-grabbing select-none"
        >

          {/* View Controls */}
          <div className="absolute bottom-14 left-4 z-50 flex flex-col gap-2 bg-[#252526]/90 p-1.5 rounded-lg border border-neutral-700 shadow-xl backdrop-blur-sm">
            <button
              onClick={zoomIn}
              className="p-1.5 hover:bg-white/10 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={zoomOut}
              className="p-1.5 hover:bg-white/10 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <div className="h-px w-full bg-neutral-700 my-0.5"></div>
            <button
              onClick={resetView}
              className="p-1.5 hover:bg-white/10 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Reset View"
            >
              <Maximize size={18} />
            </button>
          </div>

          {/* Nav Hint */}
          <div className="absolute bottom-4 left-4 z-40 text-[10px] text-neutral-500 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded pointer-events-none">
            <Move size={12} />
            <span>Drag to Pan • Scroll to Zoom</span>
          </div>

          {/* Transform Container */}
          <div
            className="w-full h-full flex items-center justify-center origin-center"
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
              willChange: 'transform',
              transformOrigin: 'center center',
            }}
          >
            {/* Dark Grid Background */}
            <div className="absolute -inset-1250 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}>
            </div>

            {/* Content */}
            <div className="relative w-full max-w-450 mx-auto flex flex-col gap-16 z-10 p-20 mt-12">
              <div className="flex flex-col xl:flex-row gap-10 justify-center items-center xl:items-start">

                {/* Columns 1+2 group: CPU/VIA | Clock/EEPROM with ACIA centered below */}
                <div className="flex flex-col gap-10 items-center">
                  <div className="flex flex-col xl:flex-row gap-10 items-center xl:items-start">

                    {/* Column 1: CPU & VIA */}
                    <div className="flex flex-col gap-10 items-center">
                      <CpuBreakout cpu={state.cpu} lastInstruction={state.lastInstruction} />

                      <ViaBreakout
                        portA={state.via.portA}
                        portB={state.via.portB}
                        ddrA={state.via.ddrA}
                        ddrB={state.via.ddrB}
                      />
                    </div>

                    {/* Column 2: Clock & EEPROM/CART */}
                    <div className="flex flex-col gap-10 items-center">
                      <ClockBreakout
                        isRunning={isRunning}
                        clockSpeed={clockSpeed}
                        cycles={state.cycles}
                      />

                      <RomBreakout
                        addressBus={state.bus.address}
                        onLoadRom={handleLoadRom}
                        loadedRomName={loadedRomName}
                      />
                    </div>

                  </div>

                  {/* ACIA centered below VIA and EEPROM/CART */}
                  <AciaBreakout
                    acia={state.acia}
                    onSendChar={sendSerialChar}
                    onClearTerminal={clearAciaTxBuffer}
                  />
                </div>

                {/* Column 3: TIA (Atari TV) & 6845 CRTC */}
                <div className="flex flex-col gap-10 items-center">
                  <TiaBreakout
                    tia={state.tia}
                    computerRef={computerRef}
                    onToggleFormat={toggleTiaFormat}
                    onToggleColor={() => handleConsoleInput('COLOR', state.tia.config.colorMode !== 'COLOR')}
                    onToggleDiff0={() => handleConsoleInput('DIFF0', state.tia.config.difficulty0 !== 'A')}
                    onToggleDiff1={() => handleConsoleInput('DIFF1', state.tia.config.difficulty1 !== 'A')}
                    onToggleScanlineLimit={toggleTiaScanlineLimit}
                    onReset={(p) => handleConsoleInput('RESET', p)}
                    onSelect={(p) => handleConsoleInput('SELECT', p)}
                    onPower={handleRun}
                    isPowered={isRunning && !!loadedRomName}
                    onJoystick={handleJoystick}
                    onToggleAudio={toggleTiaAudio}
                    audioEnabled={audioEnabled}
                  />

                  <Crtc6845Board
                    computerRef={computerRef}
                    crtc={state?.crtc}
                  />
                </div>

                {/* Column 4: LCD & TIA Audio */}
                <div className="flex flex-col gap-10 items-center">
                  <div className="visualizer-panel bg-[#151515] p-6 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] border border-neutral-800 flex flex-col items-center cursor-default">
                    <LcdDisplay lines={state.lcd.lines} />
                    <div className="mt-4 text-neutral-600 text-[10px] font-mono tracking-widest uppercase">HD44780 LCD Output</div>
                  </div>

                  <TiaAudioKeyboard
                    computerRef={computerRef}
                    audioEnabled={audioEnabled}
                    onToggleAudio={toggleTiaAudio}
                  />
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Test Runner Panel */}
        {showTestRunner && (
          <div
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
          >
            <div
              className="w-full max-w-5xl h-[85vh] bg-chip-black rounded-xl shadow-2xl border border-neutral-700 overflow-hidden"
            >
              <TestRunner onClose={() => setShowTestRunner(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
