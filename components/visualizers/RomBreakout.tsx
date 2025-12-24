
import React, { useRef } from 'react';
import { Chip } from '../Chip';
import { Led } from '../ui/Led';
import { Upload, Trash2, HardDrive } from 'lucide-react';

interface RomBreakoutProps {
  addressBus: number;
  onLoadRom?: (data: Uint8Array, name: string) => void;
  loadedRomName?: string | null;
}

export const RomBreakout: React.FC<RomBreakoutProps> = ({ addressBus, onLoadRom, loadedRomName }) => {
  const selected = addressBus >= 0x8000;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLoadRom) {
      file.arrayBuffer().then(buffer => {
        onLoadRom(new Uint8Array(buffer), file.name);
      });
    }
  };

  return (
     <div className="visualizer-panel relative bg-[#252020] p-4 pt-8 rounded-xl shadow-2xl border border-neutral-700 flex flex-col items-center cursor-default min-w-65 w-65">
        {/* Header with title and CS indicator */}
        <div className="absolute top-2 left-3 right-3 flex items-center justify-between">
          <span className="text-[10px] font-bold text-neutral-600 tracking-widest uppercase">EEPROM / CART</span>
          <div className="flex items-center gap-1.5 bg-black/30 px-2 py-0.5 rounded-full border border-neutral-800">
            <span className="text-[8px] font-bold text-neutral-500">CS</span>
            <Led on={selected} color="green" small />
          </div>
        </div>

        {/* Main Content - ZIF Socket with Chip */}
        <div className="flex items-center gap-4 mt-1">

           {/* Left: Address Lines Indicator */}
           <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] font-bold text-neutral-500 mb-1">ADDR</span>
              {[15,14,13,12,11,10,9,8].map((bit) => (
                <div key={bit} className="flex items-center gap-2">
                   <span className="text-[8px] font-mono text-neutral-500">A{bit}</span>
                   <Led on={!!((addressBus >> bit) & 1)} color="yellow" small />
                </div>
              ))}
           </div>

           {/* Center: The Chip */}
           <div className="relative z-10">
              <Chip name="AT28C256" pins={28} className="h-44 w-16 md:w-20" />
           </div>

           {/* Right: Data Lines Indicator */}
           <div className="flex flex-col items-start gap-1">
              <span className="text-[9px] font-bold text-neutral-500 mb-1">DATA</span>
              {[7,6,5,4,3,2,1,0].map((bit) => (
                <div key={bit} className="flex items-center gap-2">
                   <Led on={selected} color="green" small />
                   <span className="text-[8px] font-mono text-neutral-500">D{bit}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Cartridge Loader UI */}
        <div className="mt-2 w-full flex flex-col gap-1">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                onClick={(e) => (e.target as HTMLInputElement).value = ''}
                accept=".bin,.rom,.a26"
                className="hidden"
            />

            <div className="flex gap-2">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-[#333] hover:bg-[#444] text-xs py-1.5 rounded border border-neutral-600 flex items-center justify-center gap-2 transition-colors group"
                >
                    <Upload size={12} className="text-neutral-400 group-hover:text-white" />
                    <span className="font-bold text-neutral-300">LOAD ROM</span>
                </button>
                {loadedRomName && (
                    <button
                        onClick={() => onLoadRom?.(new Uint8Array(0), "")}
                        className="w-8 bg-[#331111] hover:bg-[#551111] text-xs py-1.5 rounded border border-red-900 flex items-center justify-center transition-colors"
                        title="Eject Cartridge"
                    >
                        <Trash2 size={12} className="text-red-400" />
                    </button>
                )}
            </div>
            {loadedRomName && (
                <div className="flex items-center justify-center gap-1 opacity-70">
                    <HardDrive size={10} className="text-yellow-600"/>
                    <span className="text-[9px] font-mono text-yellow-600 truncate max-w-40">{loadedRomName}</span>
                </div>
            )}
        </div>

     </div>
  );
};
