
import React from 'react';

interface LedProps {
  on: boolean;
  label?: string;
  color?: 'red' | 'green' | 'yellow';
  small?: boolean;
}

export const Led: React.FC<LedProps> = ({ on, label, color = 'red', small }) => {
  const bgOn = color === 'red' ? 'bg-red-500 shadow-[0_0_8px_#f00]' : 
               color === 'green' ? 'bg-green-500 shadow-[0_0_8px_#0f0]' : 'bg-yellow-400 shadow-[0_0_8px_#fb0]';
  const bgOff = color === 'red' ? 'bg-red-900' : color === 'green' ? 'bg-green-900' : 'bg-yellow-900';
  const size = small ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`rounded-full transition-all duration-100 border border-black/30 ${size} ${on ? bgOn : bgOff}`} />
      {label && <span className="text-[9px] font-mono text-neutral-400">{label}</span>}
    </div>
  );
};
