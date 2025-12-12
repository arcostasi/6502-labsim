
// Robust 2-Pass Assembler for 6502
// Supports Ben Eater style syntax

const MNEMONICS = new Set([
  'ADC', 'AND', 'ASL', 'BCC', 'BCS', 'BEQ', 'BIT', 'BMI', 'BNE', 'BPL', 'BRK',
  'BVC', 'BVS', 'CLC', 'CLD', 'CLI', 'CLV', 'CMP', 'CPX', 'CPY', 'DEC', 'DEX',
  'DEY', 'EOR', 'INC', 'INX', 'INY', 'JMP', 'JSR', 'LDA', 'LDX', 'LDY', 'LSR',
  'NOP', 'ORA', 'PHA', 'PHP', 'PLA', 'PLP', 'ROL', 'ROR', 'RTI', 'RTS', 'SBC',
  'SEC', 'SED', 'SEI', 'STA', 'STX', 'STY', 'TAX', 'TAY', 'TSX', 'TXA', 'TXS', 'TYA'
]);

type AddressingMode =
  | 'implied' | 'accumulator' | 'immediate' | 'zeropage' | 'zeropage_x' | 'zeropage_y'
  | 'absolute' | 'absolute_x' | 'absolute_y' | 'indirect' | 'indirect_x' | 'indirect_y' | 'relative';

interface Instruction {
  mnemonic: string;
  opcode: number;
  mode: AddressingMode;
  length: number;
}

// Opcode Map (Partial for brevity, covers Ben Eater usage)
const OPCODES: Record<string, Record<string, number>> = {
  'ADC': { 'immediate': 0x69, 'zeropage': 0x65, 'zeropage_x': 0x75, 'absolute': 0x6D, 'absolute_x': 0x7D, 'absolute_y': 0x79, 'indirect_x': 0x61, 'indirect_y': 0x71 },
  'AND': { 'immediate': 0x29, 'zeropage': 0x25, 'zeropage_x': 0x35, 'absolute': 0x2D, 'absolute_x': 0x3D, 'absolute_y': 0x39, 'indirect_x': 0x21, 'indirect_y': 0x31 },
  'ASL': { 'accumulator': 0x0A, 'zeropage': 0x06, 'zeropage_x': 0x16, 'absolute': 0x0E, 'absolute_x': 0x1E },
  'BCC': { 'relative': 0x90 },
  'BCS': { 'relative': 0xB0 },
  'BEQ': { 'relative': 0xF0 },
  'BIT': { 'zeropage': 0x24, 'absolute': 0x2C },
  'BMI': { 'relative': 0x30 },
  'BNE': { 'relative': 0xD0 },
  'BPL': { 'relative': 0x10 },
  'BRK': { 'implied': 0x00 },
  'BVC': { 'relative': 0x50 },
  'BVS': { 'relative': 0x70 },
  'CLC': { 'implied': 0x18 },
  'CLD': { 'implied': 0xD8 },
  'CLI': { 'implied': 0x58 },
  'CLV': { 'implied': 0xB8 },
  'CMP': { 'immediate': 0xC9, 'zeropage': 0xC5, 'zeropage_x': 0xD5, 'absolute': 0xCD, 'absolute_x': 0xDD, 'absolute_y': 0xD9, 'indirect_x': 0xC1, 'indirect_y': 0xD1 },
  'CPX': { 'immediate': 0xE0, 'zeropage': 0xE4, 'absolute': 0xEC },
  'CPY': { 'immediate': 0xC0, 'zeropage': 0xC4, 'absolute': 0xCC },
  'DEC': { 'zeropage': 0xC6, 'zeropage_x': 0xD6, 'absolute': 0xCE, 'absolute_x': 0xDE },
  'DEX': { 'implied': 0xCA },
  'DEY': { 'implied': 0x88 },
  'EOR': { 'immediate': 0x49, 'zeropage': 0x45, 'zeropage_x': 0x55, 'absolute': 0x4D, 'absolute_x': 0x5D, 'absolute_y': 0x59, 'indirect_x': 0x41, 'indirect_y': 0x51 },
  'INC': { 'zeropage': 0xE6, 'zeropage_x': 0xF6, 'absolute': 0xEE, 'absolute_x': 0xFE },
  'INX': { 'implied': 0xE8 },
  'INY': { 'implied': 0xC8 },
  'JMP': { 'absolute': 0x4C, 'indirect': 0x6C },
  'JSR': { 'absolute': 0x20 },
  'LDA': { 'immediate': 0xA9, 'zeropage': 0xA5, 'zeropage_x': 0xB5, 'absolute': 0xAD, 'absolute_x': 0xBD, 'absolute_y': 0xB9, 'indirect_x': 0xA1, 'indirect_y': 0xB1 },
  'LDX': { 'immediate': 0xA2, 'zeropage': 0xA6, 'zeropage_y': 0xB6, 'absolute': 0xAE, 'absolute_y': 0xBE },
  'LDY': { 'immediate': 0xA0, 'zeropage': 0xA4, 'zeropage_x': 0xB4, 'absolute': 0xAC, 'absolute_x': 0xBC },
  'LSR': { 'accumulator': 0x4A, 'zeropage': 0x46, 'zeropage_x': 0x56, 'absolute': 0x4E, 'absolute_x': 0x5E },
  'NOP': { 'implied': 0xEA },
  'ORA': { 'immediate': 0x09, 'zeropage': 0x05, 'zeropage_x': 0x15, 'absolute': 0x0D, 'absolute_x': 0x1D, 'absolute_y': 0x19, 'indirect_x': 0x01, 'indirect_y': 0x11 },
  'PHA': { 'implied': 0x48 },
  'PHP': { 'implied': 0x08 },
  'PLA': { 'implied': 0x68 },
  'PLP': { 'implied': 0x28 },
  'ROL': { 'accumulator': 0x2A, 'zeropage': 0x26, 'zeropage_x': 0x36, 'absolute': 0x2E, 'absolute_x': 0x3E },
  'ROR': { 'accumulator': 0x6A, 'zeropage': 0x66, 'zeropage_x': 0x76, 'absolute': 0x6E, 'absolute_x': 0x7E },
  'RTI': { 'implied': 0x40 },
  'RTS': { 'implied': 0x60 },
  'SBC': { 'immediate': 0xE9, 'zeropage': 0xE5, 'zeropage_x': 0xF5, 'absolute': 0xED, 'absolute_x': 0xFD, 'absolute_y': 0xF9, 'indirect_x': 0xE1, 'indirect_y': 0xF1 },
  'SEC': { 'implied': 0x38 },
  'SED': { 'implied': 0xF8 },
  'SEI': { 'implied': 0x78 },
  'STA': { 'zeropage': 0x85, 'zeropage_x': 0x95, 'absolute': 0x8D, 'absolute_x': 0x9D, 'absolute_y': 0x99, 'indirect_x': 0x81, 'indirect_y': 0x91 },
  'STX': { 'zeropage': 0x86, 'zeropage_y': 0x96, 'absolute': 0x8E },
  'STY': { 'zeropage': 0x84, 'zeropage_x': 0x94, 'absolute': 0x8C },
  'TAX': { 'implied': 0xAA },
  'TAY': { 'implied': 0xA8 },
  'TSX': { 'implied': 0xBA },
  'TXA': { 'implied': 0x8A },
  'TXS': { 'implied': 0x9A },
  'TYA': { 'implied': 0x98 },
};

export interface AssembledOutput {
  binary: Uint8Array;
  mapping: Record<number, string>;
  lineMapping: Record<number, number>; // Maps PC -> Line Index
  error?: string;
}

const parseOperand = (op: string, labels: Record<string, number>, pc: number): { value: number, mode: AddressingMode } | null => {
  op = op.trim();
  let mode: AddressingMode = 'absolute'; // Default
  let valStr = op;

  // Immediate
  if (op.startsWith('#')) {
    mode = 'immediate';
    valStr = op.substring(1);
  }
  // Indirect
  else if (op.startsWith('(') && op.endsWith(')')) {
    mode = 'indirect';
    valStr = op.substring(1, op.length - 1);
  }
  // Indexed Indirect (X)
  else if (op.startsWith('(') && op.toUpperCase().endsWith(',X)')) {
    mode = 'indirect_x';
    valStr = op.substring(1, op.indexOf(','));
  }
  // Indirect Indexed (Y)
  else if (op.startsWith('(') && op.toUpperCase().endsWith('),Y')) {
    mode = 'indirect_y';
    valStr = op.substring(1, op.indexOf(')'));
  }
  // Absolute/ZP X (case insensitive)
  else if (op.toUpperCase().endsWith(',X')) {
    mode = 'absolute_x'; // Potentially ZP_X, resolved by value check
    valStr = op.substring(0, op.length - 2);
  }
  // Absolute/ZP Y (case insensitive)
  else if (op.toUpperCase().endsWith(',Y')) {
    mode = 'absolute_y'; // Potentially ZP_Y
    valStr = op.substring(0, op.length - 2);
  }

  // Accumulator
  else if (op === 'A') {
    return { value: 0, mode: 'accumulator' };
  }

  // Parse Value
  let value = 0;

  // Char literal: #'A' or "A"
  if (valStr.startsWith("'") || valStr.startsWith('"')) {
    // Normal char (empty/space char keeps value = 0)
    if (valStr.length > 2) {
        value = valStr.codePointAt(1) ?? 0;
    }
  }
  // Binary
  else if (valStr.startsWith('%')) {
    value = Number.parseInt(valStr.substring(1), 2);
  }
  // Hex
  else if (valStr.startsWith('$')) {
    value = Number.parseInt(valStr.substring(1), 16);
  }
  // Label
  else if (labels[valStr] !== undefined) {
    value = labels[valStr];
  }
  // Decimal
  else {
    const parsed = Number.parseInt(valStr, 10);
    if (Number.isNaN(parsed) && !labels[valStr]) {
       // If label not found yet (Pass 1), return 0 dummy
       return { value: 0xFFFF, mode }; // 0xFFFF placeholder
    }
    value = parsed;
  }

  // Refine Addressing Mode based on value size
  if (mode === 'absolute') {
    if (value <= 0xFF && value >= 0) mode = 'zeropage';
  } else if (mode === 'absolute_x') {
    if (value <= 0xFF && value >= 0) mode = 'zeropage_x';
  } else if (mode === 'absolute_y') {
    if (value <= 0xFF && value >= 0) mode = 'zeropage_y';
  }

  return { value, mode };
};

// Parse .BYTE directive data (supports strings, hex, decimal, binary)
const parseByteData = (dataStr: string): number[] => {
  const bytes: number[] = [];
  let i = 0;

  while (i < dataStr.length) {
    // Skip whitespace and commas
    while (i < dataStr.length && (dataStr[i] === ' ' || dataStr[i] === ',' || dataStr[i] === '\t')) i++;
    if (i >= dataStr.length) break;

    // String literal
    if (dataStr[i] === '"') {
      i++; // Skip opening quote
      while (i < dataStr.length && dataStr[i] !== '"') {
        bytes.push(dataStr.codePointAt(i) ?? 0);
        i++;
      }
      i++; // Skip closing quote
    }
    // Hex value $XX
    else if (dataStr[i] === '$') {
      i++;
      let hex = '';
      while (i < dataStr.length && /[0-9A-Fa-f]/.test(dataStr[i])) {
        hex += dataStr[i];
        i++;
      }
      if (hex) bytes.push(Number.parseInt(hex, 16) & 0xFF);
    }
    // Binary value %XXXXXXXX
    else if (dataStr[i] === '%') {
      i++;
      let bin = '';
      while (i < dataStr.length && /[01]/.test(dataStr[i])) {
        bin += dataStr[i];
        i++;
      }
      if (bin) bytes.push(Number.parseInt(bin, 2) & 0xFF);
    }
    // Decimal value
    else if (/\d/.test(dataStr[i])) {
      let dec = '';
      while (i < dataStr.length && /\d/.test(dataStr[i])) {
        dec += dataStr[i];
        i++;
      }
      if (dec) bytes.push(Number.parseInt(dec, 10) & 0xFF);
    }
    else {
      i++; // Skip unknown character
    }
  }

  return bytes;
};

export const assemble = (source: string): AssembledOutput => {
  const binary = new Uint8Array(32768).fill(0xEA); // Fill with NOP
  const mapping: Record<number, string> = {};
  const lineMapping: Record<number, number> = {};
  const labels: Record<string, number> = {};
  const lines = source.split('\n');

  // Helper to get raw line content without comments
  const cleanLine = (line: string) => {
    let inQuote = false;
    let quoteChar = '';
    let commentIdx = -1;

    for(let i=0; i<line.length; i++) {
        const char = line[i];
        if (!inQuote && (char === '"' || char === "'")) {
            inQuote = true;
            quoteChar = char;
        } else if (inQuote && char === quoteChar) {
            inQuote = false;
        } else if (!inQuote && char === ';') {
            commentIdx = i;
            break;
        }
    }

    return (commentIdx >= 0 ? line.substring(0, commentIdx) : line).trim();
  };

  try {
    // PASS 1: Calculate Labels
    let pc = 0x8000;
    for (const rawLine of lines) {
      let line = cleanLine(rawLine);
      if (!line) continue;

      // .ORG Directive
      if (line.toUpperCase().startsWith('.ORG')) {
        const parts = line.split(/\s+/);
        const val = parts[1].replace('$', '0x');
        pc = Number.parseInt(val, 16);
        continue;
      }

      // Constant definition: LABEL = $XXXX or LABEL = value
      if (line.includes('=')) {
        const eqIdx = line.indexOf('=');
        const constName = line.substring(0, eqIdx).trim();
        const constVal = line.substring(eqIdx + 1).trim();
        let value = 0;
        if (constVal.startsWith('$')) {
          value = Number.parseInt(constVal.substring(1), 16);
        } else if (constVal.startsWith('%')) {
          value = Number.parseInt(constVal.substring(1), 2);
        } else {
          value = Number.parseInt(constVal, 10);
        }
        labels[constName] = value;
        continue;
      }

      // Check for Label first
      const parts = line.split(/\s+/);
      let potentialLabel = parts[0];

      if (potentialLabel.endsWith(':')) {
        const labelName = potentialLabel.slice(0, -1);
        labels[labelName] = pc;
        const rest = line.substring(potentialLabel.length).trim();
        if(!rest) continue;
        line = rest;
      } else if (!MNEMONICS.has(potentialLabel.toUpperCase()) && !potentialLabel.startsWith('.')) {
         labels[potentialLabel] = pc;
         const rest = line.substring(potentialLabel.length).trim();
         if(!rest) continue;
         line = rest;
      }

      // .BYTE Directive (Pass 1 - calculate size)
      if (line.toUpperCase().startsWith('.BYTE')) {
        const dataStr = line.substring(5).trim();
        pc += parseByteData(dataStr).length;
        continue;
      }

      // Instruction?
      const mnemonic = line.split(/\s+/)[0].toUpperCase();
      if (MNEMONICS.has(mnemonic)) {
        const operandStr = line.substring(mnemonic.length).trim();
        let length = 1;
        if (operandStr) {
           const ops = OPCODES[mnemonic];
           if (ops['relative']) {
             length = 2; // Branch instructions
           } else if (operandStr.startsWith('#')) {
             length = 2; // Immediate mode
           } else if (operandStr.startsWith('(')) {
             // Indirect modes - check for indirect_x or indirect_y (zp) vs indirect (abs)
             if (operandStr.toUpperCase().includes(',X)') || operandStr.toUpperCase().includes('),Y')) {
               length = 2; // Indirect X/Y use zero page
             } else {
               length = 3; // JMP indirect uses absolute
             }
           } else {
             // Check for zero page or absolute
             length = 3; // Default to absolute (3 bytes)
             // Zero page if $XX (2 hex digits max)
             if (operandStr.startsWith('$') && operandStr.replace(/,.*/, '').length <= 3) {
               length = 2;
             }
           }
        }
        pc += length;
      }
    }

    // PASS 2: Generate Code
    pc = 0x8000;
    for (let i = 0; i < lines.length; i++) {
      let line = cleanLine(lines[i]);
      if (!line) continue;

      const originalLine = line;

      // Handle .ORG
      if (line.toUpperCase().startsWith('.ORG')) {
        const parts = line.split(/\s+/);
        const val = parts[1].replace('$', '0x');
        pc = Number.parseInt(val, 16);
        continue;
      }

      // Skip constant definitions (already processed in Pass 1)
      if (line.includes('=')) {
        continue;
      }

      // Strip label if present first
      const parts = line.split(/\s+/);
      let mnemonic = parts[0].toUpperCase();

      if (line.includes(':')) {
         const labelEnd = line.indexOf(':');
         line = line.substring(labelEnd + 1).trim();
         if (!line) continue;
         mnemonic = line.split(/\s+/)[0].toUpperCase();
      } else if (!MNEMONICS.has(mnemonic) && !mnemonic.startsWith('.') && labels[parts[0]]) {
         line = line.substring(parts[0].length).trim();
         if (!line) continue;
         mnemonic = line.split(/\s+/)[0].toUpperCase();
      }

      // Handle .BYTE directive (Pass 2 - generate bytes)
      if (mnemonic === '.BYTE' || line.toUpperCase().startsWith('.BYTE')) {
        const dataStr = line.toUpperCase().startsWith('.BYTE')
          ? line.substring(5).trim()
          : line.substring(mnemonic.length).trim();
        const dataBytes = parseByteData(dataStr);
        for (const b of dataBytes) {
          binary[pc - 0x8000] = b;
          pc++;
        }
        continue;
      }

      if (!MNEMONICS.has(mnemonic)) continue;

      const operandStr = line.substring(mnemonic.length).trim();
      let opcode = 0;
      let operandBytes: number[] = [];

      const ops = OPCODES[mnemonic];

      if (operandStr) {
        const parsed = parseOperand(operandStr, labels, pc);
        if (!parsed) throw new Error(`Invalid operand: ${operandStr}`);

        let { value, mode } = parsed;

        if (ops['relative']) {
          mode = 'relative';
          const nextPc = pc + 2;
          let offset = value - nextPc;
          if (offset < -128 || offset > 127) throw new Error(`Branch out of range: ${offset}`);
          value = offset & 0xFF;
        }

        if (mode === 'zeropage' && !ops['zeropage']) mode = 'absolute';
        if (mode === 'zeropage_x' && !ops['zeropage_x']) mode = 'absolute_x';

        if (ops[mode]) {
          opcode = ops[mode];
        } else if (mode === 'zeropage' && ops['absolute']) {
           opcode = ops['absolute'];
           mode = 'absolute';
        } else {
           if (mode === 'zeropage') mode = 'absolute';
           if (mode === 'zeropage_x') mode = 'absolute_x';
           if (mode === 'zeropage_y') mode = 'absolute_y';
           if (ops[mode]) opcode = ops[mode];
           else throw new Error(`Mode ${mode} not supported for ${mnemonic}`);
        }

        if (mode === 'immediate' || mode === 'relative' || mode.startsWith('zeropage') || mode.startsWith('indirect_x') || mode.startsWith('indirect_y')) {
          operandBytes = [value & 0xFF];
        } else {
          operandBytes = [value & 0xFF, (value >> 8) & 0xFF];
        }
      } else if (ops['implied']) {
        opcode = ops['implied'];
      } else if (ops['accumulator']) {
        opcode = ops['accumulator'];
      } else {
        throw new Error(`Missing operand for ${mnemonic}`);
      }

      // Record Line Mapping
      lineMapping[pc] = i;

      if (pc >= 0x8000) {
        binary[pc - 0x8000] = opcode;
        operandBytes.forEach((b, idx) => binary[pc - 0x8000 + 1 + idx] = b);
      }
      mapping[pc] = originalLine;
      pc += (1 + operandBytes.length);
    }

    // Set Reset Vector
    binary[0x7FFC] = 0x00;
    binary[0x7FFD] = 0x80;

    return { binary, mapping, lineMapping };

  } catch (e: any) {
    return { binary: new Uint8Array(0), mapping: {}, lineMapping: {}, error: e.message };
  }
};
