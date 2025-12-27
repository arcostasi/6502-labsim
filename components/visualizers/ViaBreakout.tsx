
import React from 'react';
import { Chip } from '../Chip';
import { Led } from '../ui/Led';

interface ViaBreakoutProps {
  portA: number;
  portB: number;
  ddrA: number;
  ddrB: number;
}

export const ViaBreakout: React.FC<ViaBreakoutProps> = ({ portA, portB }) => {
  const getBits = (val: number) => Array.from({length: 8}, (_,i) => (val >> i) & 1);

  return (
    <div className="visualizer-panel relative bg-[#202025] p-4 rounded-xl shadow-2xl border border-neutral-700 flex flex-col items-center cursor-default min-w-[280px] w-[280px]">
       <div className="absolute top-2 left-3 text-[10px] font-bold text-neutral-600 tracking-widest uppercase">VIA I/O</div>

       <div className="flex gap-4 md:gap-8 items-center mt-4">

          {/* Port A LEDS */}
          <div className="flex flex-col items-end gap-1">
             <span className="text-[9px] font-bold text-neutral-500 mb-1">PORT A (CTRL)</span>
             {getBits(portA).reverse().map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                   <span className="text-[8px] font-mono text-neutral-500">PA{7-i}</span>
                   <Led on={!!b} color="yellow" small />
                </div>
             ))}
          </div>

          <Chip name="W65C22" pins={40} className="h-48 w-16 md:w-20" />

          {/* Port B LEDS */}
          <div className="flex flex-col items-start gap-1">
             <span className="text-[9px] font-bold text-neutral-500 mb-1">PORT B (DATA)</span>
             {getBits(portB).reverse().map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                   <Led on={!!b} color="green" small />
                   <span className="text-[8px] font-mono text-neutral-500">PB{7-i}</span>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};
