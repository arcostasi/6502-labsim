
import React, { useRef, useEffect, useState } from 'react';
import { Chip } from '../Chip';
import { Led } from '../ui/Led';
import { AciaState } from '../../types';
import { BAUD_RATES } from '../../services/acia';
import { Terminal, Send, Trash2, Keyboard, Cpu, MonitorDot } from 'lucide-react';

interface AciaBreakoutProps {
  acia: AciaState;
  onSendChar: (char: number) => void;
  onClearTerminal: () => void;
}

type TabType = 'registers' | 'terminal';

export const AciaBreakout: React.FC<AciaBreakoutProps> = ({ acia, onSendChar, onClearTerminal }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [terminalContent, setTerminalContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('terminal');

  // Convert TX buffer to displayable text
  useEffect(() => {
    const text = acia.txBuffer
      .map(code => {
        if (code === 13) return '\n';
        if (code === 10) return '';
        if (code === 8) return '\b';
        if (code === 127) return '\b';
        if (code >= 32 && code <= 126) return String.fromCodePoint(code);
        return '';
      })
      .join('');
    setTerminalContent(text);
  }, [acia.txBuffer]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalContent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      for (const char of inputValue) {
        const code = char.codePointAt(0);
        if (code !== undefined) onSendChar(code);
      }
      onSendChar(13);
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue.length === 0) {
      onSendChar(8);
    }
  };

  const handleSendClick = () => {
    for (const char of inputValue) {
      const code = char.codePointAt(0);
      if (code !== undefined) onSendChar(code);
    }
    onSendChar(13);
    setInputValue('');
    inputRef.current?.focus();
  };

  const getBaudRate = () => BAUD_RATES[acia.control & 0x0F] || 0;
  const getWordLength = () => [8, 7, 6, 5][(acia.control & 0x60) >> 5];
  const getStopBits = () => (acia.control & 0x80) ? 2 : 1;
  const getParity = () => {
    if ((acia.command & 0x20) === 0) return 'N';
    return ['O', 'E', 'M', 'S'][(acia.command & 0xE0) >> 5 & 0x03] || 'N';
  };
  const getBits = (val: number) => Array.from({ length: 8 }, (_, bitOffset) => {
    const bit = 7 - bitOffset;
    return {
      key: `b${bit}`,
      value: (val >> bit) & 1
    };
  });

  return (
    <div className="visualizer-panel relative bg-[#151515] p-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] border border-neutral-800 flex flex-col cursor-default w-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase">ACIA 6551</div>
        <div className="flex items-center gap-1.5">
          <Led on={acia.txEmpty} color="green" small />
          <Led on={acia.rxFull} color="yellow" small />
          <Led on={acia.irq} color="red" small />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setActiveTab('registers')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold transition-colors ${
            activeTab === 'registers'
              ? 'bg-purple-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
          }`}
        >
          <Cpu size={12} />
          REGISTERS
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-bold transition-colors ${
            activeTab === 'terminal'
              ? 'bg-cyan-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
          }`}
        >
          <MonitorDot size={12} />
          TERMINAL
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'registers' ? (
        <div className="flex gap-4 px-2">
          {/* Left: Chip + Config */}
          <div className="flex flex-col items-center gap-2">
            <Chip name="W65C51" pins={28} className="h-28 w-12" />
            <div className="text-[9px] font-mono text-cyan-400 text-center">
              {getBaudRate()} baud<br/>
              {getWordLength()}-{getParity()}-{getStopBits()}
            </div>
          </div>

          {/* Right: Status & Registers */}
          <div className="flex-1 flex flex-col gap-2">
            {/* Status LEDs */}
            <div className="bg-black/30 p-2 rounded border border-neutral-700">
              <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                <div className="flex items-center gap-1">
                  <Led on={acia.txEmpty} color="green" small />
                  <span className="text-[7px] font-mono text-neutral-400">TDRE</span>
                </div>
                <div className="flex items-center gap-1">
                  <Led on={acia.rxFull} color="yellow" small />
                  <span className="text-[7px] font-mono text-neutral-400">RDRF</span>
                </div>
                <div className="flex items-center gap-1">
                  <Led on={acia.irq} color="red" small />
                  <span className="text-[7px] font-mono text-neutral-400">IRQ</span>
                </div>
                <div className="flex items-center gap-1">
                  <Led on={acia.overrun} color="red" small />
                  <span className="text-[7px] font-mono text-neutral-400">OVR</span>
                </div>
                <div className="flex items-center gap-1">
                  <Led on={(acia.command & 0x01) !== 0} color="green" small />
                  <span className="text-[7px] font-mono text-neutral-400">DTR</span>
                </div>
                <div className="flex items-center gap-1">
                  <Led on={true} color="green" small />
                  <span className="text-[7px] font-mono text-neutral-400">DSR</span>
                </div>
              </div>
            </div>

            {/* TX/RX Data */}
            <div className="grid grid-cols-2 gap-1">
              <div className="bg-black/30 p-1.5 rounded border border-neutral-700 text-center">
                <span className="text-[7px] text-neutral-500 block">TX</span>
                <div className="flex gap-px justify-center mb-0.5">
                  {getBits(acia.dataTx).map((bit) => (
                    <div key={`tx-${bit.key}`} className={`w-1.5 h-1.5 rounded-full ${bit.value ? 'bg-green-400' : 'bg-green-900/40'}`} />
                  ))}
                </div>
                <span className="font-mono text-green-400 text-[10px]">${acia.dataTx.toString(16).toUpperCase().padStart(2, '0')}</span>
              </div>
              <div className="bg-black/30 p-1.5 rounded border border-neutral-700 text-center">
                <span className="text-[7px] text-neutral-500 block">RX</span>
                <div className="flex gap-px justify-center mb-0.5">
                  {getBits(acia.dataRx).map((bit) => (
                    <div key={`rx-${bit.key}`} className={`w-1.5 h-1.5 rounded-full ${bit.value ? 'bg-yellow-400' : 'bg-yellow-900/40'}`} />
                  ))}
                </div>
                <span className="font-mono text-yellow-400 text-[10px]">${acia.dataRx.toString(16).toUpperCase().padStart(2, '0')}</span>
              </div>
            </div>

            {/* Register Values */}
            <div className="grid grid-cols-4 gap-1 text-center">
              <div className="bg-black/30 p-1 rounded border border-neutral-700">
                <span className="text-[6px] text-neutral-500 block">STAT</span>
                <span className="font-mono text-purple-400 text-[9px]">${acia.status.toString(16).toUpperCase().padStart(2, '0')}</span>
              </div>
              <div className="bg-black/30 p-1 rounded border border-neutral-700">
                <span className="text-[6px] text-neutral-500 block">CMD</span>
                <span className="font-mono text-purple-400 text-[9px]">${acia.command.toString(16).toUpperCase().padStart(2, '0')}</span>
              </div>
              <div className="bg-black/30 p-1 rounded border border-neutral-700">
                <span className="text-[6px] text-neutral-500 block">CTRL</span>
                <span className="font-mono text-purple-400 text-[9px]">${acia.control.toString(16).toUpperCase().padStart(2, '0')}</span>
              </div>
              <div className="bg-black/30 p-1 rounded border border-neutral-700">
                <span className="text-[6px] text-neutral-500 block">BUF</span>
                <span className="font-mono text-orange-400 text-[9px]">{acia.rxBuffer.length}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Terminal Display */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 text-[9px] text-neutral-500">
              <Terminal size={10} />
              <span>Output @ $5000</span>
            </div>
            <button
              onClick={() => { onClearTerminal(); setTerminalContent(''); }}
              className="p-1 hover:bg-white/10 rounded text-neutral-500 hover:text-red-400 transition-colors"
              title="Clear"
            >
              <Trash2 size={10} />
            </button>
          </div>

          <div
            ref={terminalRef}
            className="bg-black rounded border border-neutral-700 p-2 h-30 overflow-y-auto font-mono text-[11px] text-green-400 whitespace-pre-wrap break-all leading-tight"
          >
            {terminalContent || <span className="text-neutral-600 italic">Waiting for output...</span>}
          </div>

          {/* Input */}
          <div className="flex gap-1">
            <div className="flex-1 relative">
              <Keyboard size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type here..."
                className="w-full bg-black/50 border border-neutral-700 rounded px-2 py-1.5 pl-6 text-[10px] font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={handleSendClick}
              className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-white text-[9px] font-bold flex items-center gap-1 transition-colors"
            >
              <Send size={10} />
            </button>
          </div>

        </div>
      )}

      {/* Footer */}
      <div className="mt-2 text-neutral-600 text-[8px] font-mono tracking-widest uppercase text-center">
        W65C51 Serial Interface
      </div>
    </div>
  );
};
