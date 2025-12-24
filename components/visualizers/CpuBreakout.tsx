
import React from 'react';
import { Chip } from '../Chip';
import { Led } from '../ui/Led';
import { RegisterDisplay } from '../ui/RegisterDisplay';
import { CpuRegisters } from '../../types';

interface CpuBreakoutProps {
  cpu: CpuRegisters;
  lastInstruction: string;
}

export const CpuBreakout: React.FC<CpuBreakoutProps> = ({ cpu, lastInstruction }) => {
   const flagState = {
      N: cpu.flags.N,
      V: cpu.flags.V,
      '-': false,
      B: cpu.flags.B,
      D: cpu.flags.D,
      I: cpu.flags.I,
      Z: cpu.flags.Z,
      C: cpu.flags.C,
   } as const;

  return (
    <div className="visualizer-panel relative bg-[#202520] p-4 pt-8 rounded-xl shadow-2xl border border-neutral-700 flex flex-col items-center gap-6 cursor-default min-w-[320px] w-[320px]">
      <div className="absolute top-2 left-3 text-[10px] font-bold text-neutral-600 tracking-widest uppercase">CPU Breakout</div>

      {/* Top Section: Registers */}
      <div className="flex gap-2 w-full justify-between px-2 mt-2">
         <RegisterDisplay label="A" value={cpu.a} />
         <RegisterDisplay label="X" value={cpu.x} />
         <RegisterDisplay label="Y" value={cpu.y} />
         <RegisterDisplay label="SP" value={cpu.sp} />
      </div>

      <div className="flex items-center gap-4">
        {/* Left: Flags */}
        <div className="flex flex-col gap-2 bg-black/20 p-2 rounded">
           <span className="text-[9px] text-center text-neutral-500 font-bold">FLAGS</span>
           <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {['N','V','-','B','D','I','Z','C'].map((f) => (
                <div key={f} className="flex items-center justify-between gap-2">
                   <span className="text-[9px] font-mono text-neutral-400 w-2">{f}</span>
                   <Led on={flagState[f as keyof typeof flagState]} color="red" small />
                </div>
              ))}
           </div>
        </div>

        {/* Center: The Chip */}
        <div className="relative z-10">
           <Chip name="W65C02" pins={40} className="h-48 w-16 md:w-20" />
        </div>

        {/* Right: PC & Instruction */}
        <div className="flex flex-col gap-3">
           <RegisterDisplay label="PROG CNTR" value={cpu.pc} width={2} />
           <div className="bg-black/40 p-1.5 rounded border border-neutral-700 flex flex-col items-center w-25">
              <span className="text-[9px] text-neutral-500 font-bold mb-0.5">INSTRUCTION</span>
              <span className="font-mono text-green-400 text-xs font-bold whitespace-nowrap drop-shadow-[0_0_3px_rgba(74,222,128,0.5)] truncate max-w-full">
                 {lastInstruction}
              </span>
           </div>
        </div>
      </div>
    </div>
  );
};
