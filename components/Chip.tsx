
import React from 'react';

interface ChipProps {
  name: string;
  pins: number;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({ name, pins, className }) => {
  const pinCountSide = pins / 2;

  return (
    <div className={`relative ${className} select-none flex flex-col items-center shadow-[0_4px_6px_rgba(0,0,0,0.5)]`}>
      {/* IC Body */}
      <div className="relative w-full h-full bg-chip-black rounded-xs border border-neutral-700/50 flex flex-col items-center z-10">

        {/* Matte finish texture overlay */}
        <div className="absolute inset-0 bg-white/5 pointer-events-none rounded-xs"></div>

        {/* Notch */}
        <div className="w-6 h-3 bg-[#111] rounded-b-full border border-neutral-800 shadow-inner mt-1 mb-4"></div>

        {/* Label */}
        <div className="flex-1 flex items-center justify-center">
             <div className="text-neutral-400 font-mono text-[10px] md:text-xs font-bold -rotate-90 whitespace-nowrap tracking-widest opacity-90 drop-shadow-sm">
                {name}
            </div>
        </div>

        {/* Pin 1 Dot */}
        <div className="absolute bottom-4 left-3 w-1.5 h-1.5 bg-[#2a2a2a] rounded-full shadow-inner border border-neutral-800"></div>
      </div>

      {/* Pins - Left Side */}
      <div className="absolute top-4 bottom-4 -left-1.5 w-2 flex flex-col justify-between items-end">
         {Array.from({ length: pinCountSide }, (_, pin) => pin + 1).map((pin) => (
           <div key={`pl-${pin}`} className="w-2.5 h-1.5 bg-linear-to-r from-neutral-400 via-neutral-200 to-neutral-500 rounded-l-[1px] shadow-[1px_1px_2px_rgba(0,0,0,0.5)] border-t border-b border-neutral-600/50" />
         ))}
      </div>

      {/* Pins - Right Side */}
      <div className="absolute top-4 bottom-4 -right-1.5 w-2 flex flex-col justify-between items-start">
         {Array.from({ length: pinCountSide }, (_, pin) => pin + 1).map((pin) => (
           <div key={`pr-${pin}`} className="w-2.5 h-1.5 bg-linear-to-l from-neutral-400 via-neutral-200 to-neutral-500 rounded-r-[1px] shadow-[-1px_1px_2px_rgba(0,0,0,0.5)] border-t border-b border-neutral-600/50" />
         ))}
      </div>
    </div>
  );
};
