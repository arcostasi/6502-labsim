
import React, { useState } from 'react';
import { Sun } from 'lucide-react';

interface LcdDisplayProps {
  lines: string[];
}

const Potentiometer: React.FC<{ value: number, onChange: (val: number) => void, label: string }> = ({ value, onChange, label }) => {
    // Simple rotation logic for visualization
    const rotation = (value / 100) * 270 - 135; // -135deg to +135deg

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-600 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-transform group">
                {/* Screw Head / Knob */}
                <div
                    className="w-full h-full rounded-full flex items-center justify-center"
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    <div className="w-1 h-3 bg-yellow-600 rounded-full"></div>
                    <div className="absolute w-6 h-6 border-2 border-neutral-700 rounded-full opacity-50"></div>
                </div>

                {/* Invisible input for interaction */}
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    title={label}
                />
            </div>
            <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider">{label}</span>
        </div>
    );
};

export const LcdDisplay: React.FC<LcdDisplayProps> = ({ lines }) => {
  const [backlight, setBacklight] = useState(90); // 0-100
  const [contrast, setContrast] = useState(85);   // 0-100

  // Calculate visual styles based on simulated hardware values
  const charOpacity = contrast / 100;

  return (
    <div className="visualizer-panel relative flex flex-col items-center cursor-default">
        {/* PCB Board */}
        <div className="bg-[#0a0a0a] p-3 pt-6 pb-6 rounded-lg border-2 border-chip-black shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col gap-4 relative">

            {/* Mounting Holes */}
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#111] border border-[#333] shadow-inner"></div>
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#111] border border-[#333] shadow-inner"></div>
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#111] border border-[#333] shadow-inner"></div>
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#111] border border-[#333] shadow-inner"></div>

            {/* 16-Pin Header (Visual) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-0.5">
                {Array.from({ length: 16 }, (_, pinNumber) => pinNumber + 1).map((pinNumber) => (
                    <div key={`pin-${pinNumber}`} className="w-0.75 h-3 bg-[#cda434] rounded-sm shadow-sm"></div>
                ))}
            </div>

            {/* LCD Bezel Frame (Metal) */}
            <div className="bg-[#111] p-3 rounded border border-neutral-700 shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
                {/* The Glass Screen */}
                <div
                    className="relative rounded shadow-[inset_0_0_20px_rgba(0,0,0,0.3)] overflow-hidden transition-colors duration-200 p-3"
                    style={{ backgroundColor: '#6b7d34' }}
                >
                    {/* Backlight Layer */}
                    <div
                        className="absolute inset-0 transition-opacity duration-300"
                        style={{ backgroundColor: '#9acd32', opacity: backlight / 100 }}
                    ></div>

                    {/* Character Grid - 16x2 cells */}
                    <div className="relative z-10 flex flex-col" style={{ gap: '3px' }}>
                        {lines.map((line, rowIdx) => (
                            <div key={`row-${rowIdx + 1}-${line}`} className="flex" style={{ gap: '2px' }}>
                                {Array.from({ length: 16 }).map((_, colIdx) => {
                                    const char = line[colIdx] || ' ';
                                    const hasChar = char !== ' ';
                                    return (
                                        <div
                                            key={`cell-${rowIdx + 1}-${colIdx + 1}`}
                                            className="relative flex items-center justify-center"
                                            style={{
                                                width: '15px',
                                                height: '20px',
                                                backgroundColor: 'rgba(90, 110, 40, 0.5)',
                                                borderRadius: '1px',
                                            }}
                                        >
                                            {/* Active character */}
                                            <span
                                                className="relative"
                                                style={{
                                                    opacity: hasChar ? charOpacity : 0,
                                                    fontSize: '16px',
                                                    fontFamily: '"Courier New", monospace',
                                                    fontWeight: 'bold',
                                                    color: '#1a1f0d',
                                                    textShadow: '0.5px 0.5px 0px rgba(154,205,50,0.3)',
                                                    lineHeight: 1,
                                                    transform: 'translateY(2px)',
                                                }}
                                            >
                                                {char}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Screen Glare */}
                    <div className="absolute top-0 right-0 w-full h-full bg-linear-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
                </div>
            </div>

            {/* Control Panel Section on the PCB */}
            <div className="flex justify-between items-center px-2 mt-1">
                <div className="flex items-center gap-1 opacity-50">
                    <span className="text-[6px] font-mono text-white">JHD162A</span>
                </div>

                <div className="flex gap-6">
                    {/* Contrast Potentiometer (Trimpot style) */}
                    <Potentiometer
                        label="CONTRAST"
                        value={contrast}
                        onChange={setContrast}
                    />

                    {/* Backlight Slider (Representing a resistor/PWM control) */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="relative w-16 h-8 bg-neutral-800 rounded border border-neutral-700 flex items-center px-2 shadow-inner">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={backlight}
                                onChange={(e) => setBacklight(Number(e.target.value))}
                                className="w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-yellow-500 [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <Sun size={8} className="text-neutral-500" />
                            <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider">LIGHT</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
