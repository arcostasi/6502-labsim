
import React from 'react';
import { Led } from '../ui/Led';
import { ClockSpeed } from '../../types';

interface ClockBreakoutProps {
  isRunning: boolean;
  clockSpeed: ClockSpeed;
  cycles: number;
}

export const ClockBreakout: React.FC<ClockBreakoutProps> = ({
  isRunning,
  clockSpeed,
  cycles,
}) => {
  const getSpeedLabel = (speed: ClockSpeed): string => {
    switch (speed) {
      case ClockSpeed.MANUAL: return 'MANUAL';
      case ClockSpeed.SLOW: return '1 Hz';
      case ClockSpeed.MEDIUM: return '10 Hz';
      case ClockSpeed.FAST: return '100 Hz';
      case ClockSpeed.ULTRA: return '1 kHz';
      case ClockSpeed.MHZ1: return '1 MHz';
      case ClockSpeed.ATARI_2600: return '1.19 MHz';
      default: return 'UNKNOWN';
    }
  };

  return (
    <div className="visualizer-panel relative bg-[#1a2520] p-4 pt-8 pb-4 rounded-xl shadow-2xl border border-neutral-700 flex flex-col items-center gap-4 cursor-default min-w-70 w-70">
      <div className="absolute top-2 left-3 text-[10px] font-bold text-neutral-600 tracking-widest uppercase">Clock Generator</div>

      {/* Top Section: Status LEDs */}
      <div className="flex gap-8 w-full justify-center px-4">
        <div className="flex flex-col items-center gap-1">
          <Led on={isRunning} color="green" />
          <span className="text-[8px] font-mono text-neutral-500">RUN</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Led on={!isRunning} color="red" />
          <span className="text-[8px] font-mono text-neutral-500">HALT</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Led on={isRunning} color="yellow" />
          <span className="text-[8px] font-mono text-neutral-500">CLK</span>
        </div>
      </div>

      {/* Center: The Chip (NE555 DIP-8) */}
      <div className="flex items-center justify-center">
        <div className="relative z-10 select-none">
          <div className="relative h-20 w-14 bg-chip-black rounded-xs border border-neutral-700/50 flex flex-col items-center shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
            {/* Notch */}
            <div className="w-5 h-2.5 bg-[#111] rounded-b-full border border-neutral-800 shadow-inner mt-1"></div>
            {/* Pin 1 Dot */}
            <div className="absolute top-6 left-2 w-1.5 h-1.5 bg-[#2a2a2a] rounded-full border border-neutral-800"></div>
            {/* Label */}
            <div className="flex-1 flex items-center justify-center">
              <span className="text-neutral-400 font-mono text-[9px] font-bold whitespace-nowrap tracking-wider">NE555</span>
            </div>
          </div>
          {/* Pins - Left (4 pins) */}
          <div className="absolute top-3 bottom-3 -left-1.5 flex flex-col justify-between">
            {[1,2,3,4].map(i => <div key={i} className="w-2 h-1.25 bg-linear-to-r from-neutral-400 via-neutral-200 to-neutral-500 rounded-l-[1px]" />)}
          </div>
          {/* Pins - Right (4 pins) */}
          <div className="absolute top-3 bottom-3 -right-1.5 flex flex-col justify-between">
            {[5,6,7,8].map(i => <div key={i} className="w-2 h-1.25 bg-linear-to-l from-neutral-400 via-neutral-200 to-neutral-500 rounded-r-[1px]" />)}
          </div>
        </div>
      </div>

      {/* Frequency Display */}
      <div className="w-full bg-black/30 p-1 rounded border border-neutral-700">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-neutral-500 font-bold tracking-wider">FREQUENCY</span>
          <span className="text-xs font-mono text-cyan-400 font-bold drop-shadow-[0_0_4px_rgba(34,211,238,0.5)]">
            {getSpeedLabel(clockSpeed)}
          </span>
        </div>
      </div>

      {/* Cycle Counter */}
      <div className="w-full bg-black/40 p-1 rounded border border-neutral-700 flex items-center justify-between">
        <span className="text-[9px] font-mono text-neutral-500 font-bold tracking-wider">CYCLES</span>
        <span className="font-mono text-green-400 text-sm font-bold tabular-nums drop-shadow-[0_0_3px_rgba(74,222,128,0.5)] w-24 text-right">
          {cycles.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
