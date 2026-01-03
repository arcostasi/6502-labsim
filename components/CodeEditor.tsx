
import React, { useRef, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  activeLine?: number;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, activeLine, readOnly }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const bgLayerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = () => {
    if (textareaRef.current) {
      const newScrollTop = textareaRef.current.scrollTop;
      setScrollTop(newScrollTop);
      if (backdropRef.current) backdropRef.current.scrollTop = newScrollTop;
      if (bgLayerRef.current) bgLayerRef.current.scrollTop = newScrollTop;
    }
  };

  // Simple syntax highlighting regex
  const highlight = (text: string) => {
    let highlighted = text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll(/;(.*)$/gm, '<span class="text-green-600 italic">;$1</span>');

    const mnemonics = [
      'ADC', 'AND', 'ASL', 'BCC', 'BCS', 'BEQ', 'BIT', 'BMI', 'BNE', 'BPL',
      'BRK', 'BVC', 'BVS', 'CLC', 'CLD', 'CLI', 'CLV', 'CMP', 'CPX', 'CPY',
      'DEC', 'DEX', 'DEY', 'EOR', 'INC', 'INX', 'INY', 'JMP', 'JSR', 'LDA',
      'LDX', 'LDY', 'LSR', 'NOP', 'ORA', 'PHA', 'PHP', 'PLA', 'PLP', 'ROL',
      'ROR', 'RTI', 'RTS', 'SBC', 'SEC', 'SED', 'SEI', 'STA', 'STX', 'STY',
      'TAX', 'TAY', 'TSX', 'TXA', 'TXS', 'TYA'
    ];

    for (const mnemonic of mnemonics) {
      highlighted = highlighted.replaceAll(
        new RegExp(String.raw`\b${mnemonic}\b`, 'gim'),
        `<span class="text-blue-400 font-bold">${mnemonic}</span>`
      );
    }

    return highlighted
      .replaceAll(/\b([A-Z][A-Z0-9_]*):/gim, '<span class="text-yellow-500 font-bold">$1:</span>')
      .replaceAll(/(\$[0-9A-F]{1,4}|%[01]{8}|#\d+)/gim, '<span class="text-purple-400">$1</span>')
      .replaceAll(/\.ORG/gim, '<span class="text-pink-500 font-bold">.ORG</span>');
  };

  const lines = value.split('\n');

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLine !== undefined && activeLine !== -1 && textareaRef.current) {
       // Estimate line height ~ 21px
       const lineHeight = 21;
       // Calculate target scroll position to center the active line
       const scrollPos = (activeLine * lineHeight) - (textareaRef.current.clientHeight / 2) + (lineHeight / 2);

       textareaRef.current.scrollTo({ top: scrollPos, behavior: 'smooth' });
    }
  }, [activeLine]);

  return (
    <div className="relative w-full h-full flex bg-[#1e1e1e] overflow-hidden font-mono">
      {/* Line Numbers & Execution Indicator */}
      <div className="w-10 shrink-0 bg-[#252526] text-neutral-500 text-xs text-right border-r border-neutral-700 pt-4 pb-4 select-none">
        <div className="relative" style={{ transform: `translateY(-${scrollTop}px)` }}>
            {Array.from({ length: lines.length }, (_, lineNumber) => lineNumber).map((lineNumber) => (
            <div key={`line-${lineNumber + 1}`} className={`h-5.25 pr-2 flex items-center justify-end relative ${activeLine === lineNumber ? 'text-yellow-400 font-bold' : ''}`}>
              {activeLine === lineNumber && (
                    <ArrowRight size={10} className="absolute left-1 text-yellow-500" />
                )}
              {lineNumber + 1}
            </div>
            ))}
        </div>
      </div>

      {/* Editor Container */}
      <div className="relative flex-1 h-full">

        {/* Background Layer (Active Line Highlight) */}
        <div
          ref={bgLayerRef}
          className="absolute inset-0 pt-4 pb-4 pointer-events-none overflow-hidden"
        >
           {activeLine !== undefined && activeLine !== -1 && (
             <div
               className="w-full bg-[#252526] border-l-2 border-yellow-500/50"
               style={{
                 height: '21px',
                 transform: `translateY(${activeLine * 21 - scrollTop}px)`,
                 transition: 'transform 0.05s linear'
               }}
             />
           )}
        </div>

        {/* Highlight Backdrop */}
        <div
            ref={backdropRef}
            className="absolute inset-0 p-4 font-mono text-sm leading-5.25 whitespace-pre-wrap pointer-events-none text-gray-300 overflow-hidden"
            dangerouslySetInnerHTML={{ __html: highlight(value) + '<br/>' }} // extra break for scrolling
        ></div>

        {/* Real Textarea */}
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => !readOnly && onChange(e.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            readOnly={readOnly}
            className={`absolute inset-0 w-full h-full p-4 font-mono text-sm leading-5.25 bg-transparent text-gray-300 resize-none outline-none caret-white whitespace-pre-wrap ${readOnly ? 'cursor-not-allowed opacity-80' : ''}`}
            style={{ color: 'transparent', caretColor: 'white' }}
        />
      </div>
    </div>
  );
};
