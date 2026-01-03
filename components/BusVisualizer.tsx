import React from 'react';

interface BusVisualizerProps {
  value: number;
  bits: number;
  label: string;
  color?: 'red' | 'blue' | 'yellow';
}

export const BusVisualizer: React.FC<BusVisualizerProps> = ({ value, bits, label, color = 'red' }) => {
  const bitArray = Array.from({ length: bits }, (_, i) => (value >> i) & 1);

  let ledColorOn = 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]';
  let ledColorOff = 'bg-yellow-900';
  if (color === 'red') {
    ledColorOn = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]';
    ledColorOff = 'bg-red-900';
  } else if (color === 'blue') {
    ledColorOn = 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]';
    ledColorOff = 'bg-blue-900';
  }

  return (
    <div className="flex flex-col items-center p-2 bg-neutral-800/50 rounded border border-neutral-700">
      <div className="flex space-x-1.5 mb-1">
        {[...bitArray].reverse().map((bit, index) => (
          <div key={`bit-${bits - 1 - index}`} className="flex flex-col items-center">
            <div
              className={`w-3 h-3 md:w-4 md:h-4 rounded-full transition-colors duration-75 ${bit ? ledColorOn : ledColorOff}`}
            />
            <span className="text-[0.6rem] text-neutral-500 mt-1">{bits - 1 - index}</span>
          </div>
        ))}
      </div>
      <span className="text-xs text-neutral-400 font-mono tracking-wider">{label}</span>
      <span className="text-xs text-neutral-500 font-mono mt-0.5">0x{value.toString(16).toUpperCase().padStart(bits/4, '0')}</span>
    </div>
  );
};
