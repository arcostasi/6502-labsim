
import React from 'react';

interface RegisterDisplayProps {
  label: string;
  value: number;
  width?: number; // bytes
}

export const RegisterDisplay: React.FC<RegisterDisplayProps> = ({ label, value, width = 1 }) => {
  const hex = value.toString(16).toUpperCase().padStart(width * 2, '0');
  return (
    <div className="flex flex-col items-center bg-black/40 p-1 rounded border border-neutral-700">
       <span className="text-[9px] text-neutral-500 font-bold mb-0.5">{label}</span>
       <span className="font-mono text-red-500 text-sm md:text-base font-bold tabular-nums tracking-widest drop-shadow-[0_0_2px_rgba(220,38,38,0.5)]">
         {hex}
       </span>
    </div>
  );
};
