import React, { useState, useCallback, useRef } from 'react';
import { Play, Square, CheckCircle2, XCircle, Clock, Loader2, RotateCcw, ChevronDown, ChevronRight, Cpu } from 'lucide-react';
import { Computer } from '../services/computer';

// Test file definitions
interface TestFile {
  name: string;
  path: string;
  category: string;
  description: string;
  successAddress?: number; // Address that indicates success (PC loops here)
  maxCycles: number;
}

type TestStatus = 'pending' | 'running' | 'success' | 'failed' | 'timeout';

interface TestResult {
  status: TestStatus;
  cycles: number;
  duration: number;
  error?: string;
  finalPC?: number;
}

// Define all test files
const ROOT_TESTS: TestFile[] = [
  { name: '6502_functional_test', path: '/6502_functional_test.bin', category: 'Functional', description: 'Klaus Dormann Full Functional Test', successAddress: 0x3469, maxCycles: 100_000_000 },
  { name: '6502_decimal_test', path: '/6502_decimal_test.bin', category: 'Decimal', description: 'Decimal Mode Test', successAddress: 0x044B, maxCycles: 50_000_000 },
  { name: '6502DecimalMode', path: '/6502DecimalMode.bin', category: 'Decimal', description: 'Decimal Mode Validation', successAddress: 0x8133, maxCycles: 50_000_000 },
  { name: 'AllSuiteA', path: '/AllSuiteA.bin', category: 'Suite', description: 'All Suite A Tests', successAddress: 0x45C0, maxCycles: 10_000_000 },
  { name: 'avery', path: '/avery.bin', category: 'Avery', description: 'Avery Test Suite', successAddress: 0x20DB, maxCycles: 5_000_000 },
  { name: 'avery2', path: '/avery2.bin', category: 'Avery', description: 'Avery Test Suite 2', successAddress: 0x20FA, maxCycles: 10_000_000 },
  { name: 'avery3', path: '/avery3.bin', category: 'Avery', description: 'Avery Test Suite 3', successAddress: 0x209D, maxCycles: 10_000_000 },
  { name: 'bird6502', path: '/bird6502.bin', category: 'Suite', description: 'Bird 6502 Test', successAddress: 0x861C, maxCycles: 5_000_000 },
  { name: 'cpu_decimal', path: '/cpu_decimal.bin', category: 'Decimal', description: 'CPU Decimal Test', successAddress: 0x302F, maxCycles: 50_000_000 },
  { name: 'cpu_las', path: '/cpu_las.bin', category: 'Illegal', description: 'LAS Instruction Test', successAddress: 0x304F, maxCycles: 5_000_000 },
  { name: 'cycles', path: '/cycles.bin', category: 'Timing', description: 'Cycle Timing Test', successAddress: 0x200A, maxCycles: 5_000_000 },
  { name: 'ttl6502', path: '/ttl6502.bin', category: 'Suite', description: 'TTL 6502 Test', successAddress: 0xF5EA, maxCycles: 10_000_000 },
];

// Lorenz test suite (illegal opcodes)
const LORENZ_TESTS: TestFile[] = [
  { name: 'alrb', path: '/lorenz/alrb.bin', category: 'Lorenz', description: 'ALR Immediate', successAddress: 0x08AA, maxCycles: 10_000_000 },
  { name: 'ancb', path: '/lorenz/ancb.bin', category: 'Lorenz', description: 'ANC Immediate', successAddress: 0x08D8, maxCycles: 10_000_000 },
  { name: 'aneb', path: '/lorenz/aneb.bin', category: 'Lorenz', description: 'ANE Immediate', successAddress: 0x08CB, maxCycles: 10_000_000 },
  { name: 'arrb', path: '/lorenz/arrb.bin', category: 'Lorenz', description: 'ARR Immediate', successAddress: 0x0947, maxCycles: 10_000_000 },
  { name: 'dcp_dcma', path: '/lorenz/dcp_dcma.bin', category: 'Lorenz', description: 'DCP Absolute', successAddress: 0x088C, maxCycles: 10_000_000 },
  { name: 'dcp_dcmax', path: '/lorenz/dcp_dcmax.bin', category: 'Lorenz', description: 'DCP Absolute,X', successAddress: 0x08A2, maxCycles: 10_000_000 },
  { name: 'dcp_dcmay', path: '/lorenz/dcp_dcmay.bin', category: 'Lorenz', description: 'DCP Absolute,Y', successAddress: 0x08A2, maxCycles: 10_000_000 },
  { name: 'dcp_dcmix', path: '/lorenz/dcp_dcmix.bin', category: 'Lorenz', description: 'DCP (Indirect,X)', successAddress: 0x089C, maxCycles: 10_000_000 },
  { name: 'dcp_dcmiy', path: '/lorenz/dcp_dcmiy.bin', category: 'Lorenz', description: 'DCP (Indirect),Y', successAddress: 0x08A6, maxCycles: 10_000_000 },
  { name: 'dcp_dcmz', path: '/lorenz/dcp_dcmz.bin', category: 'Lorenz', description: 'DCP Zero Page', successAddress: 0x088F, maxCycles: 10_000_000 },
  { name: 'dcp_dcmzx', path: '/lorenz/dcp_dcmzx.bin', category: 'Lorenz', description: 'DCP Zero Page,X', successAddress: 0x0898, maxCycles: 10_000_000 },
  { name: 'isc_insa', path: '/lorenz/isc_insa.bin', category: 'Lorenz', description: 'ISC Absolute', successAddress: 0x088C, maxCycles: 10_000_000 },
  { name: 'isc_insax', path: '/lorenz/isc_insax.bin', category: 'Lorenz', description: 'ISC Absolute,X', successAddress: 0x08A2, maxCycles: 10_000_000 },
  { name: 'isc_insay', path: '/lorenz/isc_insay.bin', category: 'Lorenz', description: 'ISC Absolute,Y', successAddress: 0x08A2, maxCycles: 10_000_000 },
  { name: 'isc_insix', path: '/lorenz/isc_insix.bin', category: 'Lorenz', description: 'ISC (Indirect,X)', successAddress: 0x089C, maxCycles: 10_000_000 },
  { name: 'isc_insiy', path: '/lorenz/isc_insiy.bin', category: 'Lorenz', description: 'ISC (Indirect),Y', successAddress: 0x08A6, maxCycles: 10_000_000 },
  { name: 'isc_insz', path: '/lorenz/isc_insz.bin', category: 'Lorenz', description: 'ISC Zero Page', successAddress: 0x088F, maxCycles: 10_000_000 },
  { name: 'isc_inszx', path: '/lorenz/isc_inszx.bin', category: 'Lorenz', description: 'ISC Zero Page,X', successAddress: 0x0898, maxCycles: 10_000_000 },
  { name: 'lasay', path: '/lorenz/lasay.bin', category: 'Lorenz', description: 'LAS Absolute,Y', successAddress: 0x08F1, maxCycles: 10_000_000 },
  { name: 'laxa', path: '/lorenz/laxa.bin', category: 'Lorenz', description: 'LAX Absolute', successAddress: 0x088E, maxCycles: 10_000_000 },
  { name: 'laxay', path: '/lorenz/laxay.bin', category: 'Lorenz', description: 'LAX Absolute,Y', successAddress: 0x08A4, maxCycles: 10_000_000 },
  { name: 'laxix', path: '/lorenz/laxix.bin', category: 'Lorenz', description: 'LAX (Indirect,X)', successAddress: 0x089E, maxCycles: 10_000_000 },
  { name: 'laxiy', path: '/lorenz/laxiy.bin', category: 'Lorenz', description: 'LAX (Indirect),Y', successAddress: 0x08A8, maxCycles: 10_000_000 },
  { name: 'laxz', path: '/lorenz/laxz.bin', category: 'Lorenz', description: 'LAX Zero Page', successAddress: 0x0891, maxCycles: 10_000_000 },
  { name: 'laxzy', path: '/lorenz/laxzy.bin', category: 'Lorenz', description: 'LAX Zero Page,Y', successAddress: 0x089A, maxCycles: 10_000_000 },
  { name: 'lxab', path: '/lorenz/lxab.bin', category: 'Lorenz', description: 'LXA Immediate', successAddress: 0x08C2, maxCycles: 10_000_000 },
  { name: 'rlaa', path: '/lorenz/rlaa.bin', category: 'Lorenz', description: 'RLA Absolute', successAddress: 0x08AA, maxCycles: 10_000_000 },
  { name: 'rlaax', path: '/lorenz/rlaax.bin', category: 'Lorenz', description: 'RLA Absolute,X', successAddress: 0x08C0, maxCycles: 10_000_000 },
  { name: 'rlaay', path: '/lorenz/rlaay.bin', category: 'Lorenz', description: 'RLA Absolute,Y', successAddress: 0x08C0, maxCycles: 10_000_000 },
  { name: 'rlaix', path: '/lorenz/rlaix.bin', category: 'Lorenz', description: 'RLA (Indirect,X)', successAddress: 0x08BA, maxCycles: 10_000_000 },
  { name: 'rlaiy', path: '/lorenz/rlaiy.bin', category: 'Lorenz', description: 'RLA (Indirect),Y', successAddress: 0x08C4, maxCycles: 10_000_000 },
  { name: 'rlaz', path: '/lorenz/rlaz.bin', category: 'Lorenz', description: 'RLA Zero Page', successAddress: 0x08AD, maxCycles: 10_000_000 },
  { name: 'rlazx', path: '/lorenz/rlazx.bin', category: 'Lorenz', description: 'RLA Zero Page,X', successAddress: 0x08B6, maxCycles: 10_000_000 },
  { name: 'rraa', path: '/lorenz/rraa.bin', category: 'Lorenz', description: 'RRA Absolute', successAddress: 0x0887, maxCycles: 10_000_000 },
  { name: 'rraax', path: '/lorenz/rraax.bin', category: 'Lorenz', description: 'RRA Absolute,X', successAddress: 0x089D, maxCycles: 10_000_000 },
  { name: 'rraay', path: '/lorenz/rraay.bin', category: 'Lorenz', description: 'RRA Absolute,Y', successAddress: 0x089D, maxCycles: 10_000_000 },
  { name: 'rraix', path: '/lorenz/rraix.bin', category: 'Lorenz', description: 'RRA (Indirect,X)', successAddress: 0x0897, maxCycles: 10_000_000 },
  { name: 'rraiy', path: '/lorenz/rraiy.bin', category: 'Lorenz', description: 'RRA (Indirect),Y', successAddress: 0x08A1, maxCycles: 10_000_000 },
  { name: 'rraz', path: '/lorenz/rraz.bin', category: 'Lorenz', description: 'RRA Zero Page', successAddress: 0x088A, maxCycles: 10_000_000 },
  { name: 'rrazx', path: '/lorenz/rrazx.bin', category: 'Lorenz', description: 'RRA Zero Page,X', successAddress: 0x0893, maxCycles: 10_000_000 },
  { name: 'sax_axsa', path: '/lorenz/sax_axsa.bin', category: 'Lorenz', description: 'SAX Absolute', successAddress: 0x088D, maxCycles: 10_000_000 },
  { name: 'sax_axsix', path: '/lorenz/sax_axsix.bin', category: 'Lorenz', description: 'SAX (Indirect,X)', successAddress: 0x0897, maxCycles: 10_000_000 },
  { name: 'sax_axsz', path: '/lorenz/sax_axsz.bin', category: 'Lorenz', description: 'SAX Zero Page', successAddress: 0x0890, maxCycles: 10_000_000 },
  { name: 'sax_axszy', path: '/lorenz/sax_axszy.bin', category: 'Lorenz', description: 'SAX Zero Page,Y', successAddress: 0x0899, maxCycles: 10_000_000 },
  { name: 'sbxb', path: '/lorenz/sbxb.bin', category: 'Lorenz', description: 'SBX Immediate', successAddress: 0x08C3, maxCycles: 10_000_000 },
  { name: 'shaay', path: '/lorenz/shaay.bin', category: 'Lorenz', description: 'SHA Absolute,Y', successAddress: 0x08D6, maxCycles: 10_000_000 },
  { name: 'shaiy', path: '/lorenz/shaiy.bin', category: 'Lorenz', description: 'SHA (Indirect),Y', successAddress: 0x08D9, maxCycles: 10_000_000 },
  { name: 'shxay', path: '/lorenz/shxay.bin', category: 'Lorenz', description: 'SHX Absolute,Y', successAddress: 0x08B5, maxCycles: 10_000_000 },
  { name: 'shyax', path: '/lorenz/shyax.bin', category: 'Lorenz', description: 'SHY Absolute,X', successAddress: 0x08B5, maxCycles: 10_000_000 },
  { name: 'slo_asoa', path: '/lorenz/slo_asoa.bin', category: 'Lorenz', description: 'SLO Absolute', successAddress: 0x08B3, maxCycles: 10_000_000 },
  { name: 'slo_asoax', path: '/lorenz/slo_asoax.bin', category: 'Lorenz', description: 'SLO Absolute,X', successAddress: 0x08CA, maxCycles: 10_000_000 },
  { name: 'slo_asoay', path: '/lorenz/slo_asoay.bin', category: 'Lorenz', description: 'SLO Absolute,Y', successAddress: 0x08CA, maxCycles: 10_000_000 },
  { name: 'slo_asoix', path: '/lorenz/slo_asoix.bin', category: 'Lorenz', description: 'SLO (Indirect,X)', successAddress: 0x08C4, maxCycles: 10_000_000 },
  { name: 'slo_asoiy', path: '/lorenz/slo_asoiy.bin', category: 'Lorenz', description: 'SLO (Indirect),Y', successAddress: 0x08CE, maxCycles: 10_000_000 },
  { name: 'slo_asoz', path: '/lorenz/slo_asoz.bin', category: 'Lorenz', description: 'SLO Zero Page', successAddress: 0x08B6, maxCycles: 10_000_000 },
  { name: 'slo_asozx', path: '/lorenz/slo_asozx.bin', category: 'Lorenz', description: 'SLO Zero Page,X', successAddress: 0x08C0, maxCycles: 10_000_000 },
  { name: 'sre_lsea', path: '/lorenz/sre_lsea.bin', category: 'Lorenz', description: 'SRE Absolute', successAddress: 0x08A8, maxCycles: 10_000_000 },
  { name: 'sre_lseax', path: '/lorenz/sre_lseax.bin', category: 'Lorenz', description: 'SRE Absolute,X', successAddress: 0x08BE, maxCycles: 10_000_000 },
  { name: 'sre_lseay', path: '/lorenz/sre_lseay.bin', category: 'Lorenz', description: 'SRE Absolute,Y', successAddress: 0x08BE, maxCycles: 10_000_000 },
  { name: 'sre_lseix', path: '/lorenz/sre_lseix.bin', category: 'Lorenz', description: 'SRE (Indirect,X)', successAddress: 0x08B8, maxCycles: 10_000_000 },
  { name: 'sre_lseiy', path: '/lorenz/sre_lseiy.bin', category: 'Lorenz', description: 'SRE (Indirect),Y', successAddress: 0x08C2, maxCycles: 10_000_000 },
  { name: 'sre_lsez', path: '/lorenz/sre_lsez.bin', category: 'Lorenz', description: 'SRE Zero Page', successAddress: 0x08AB, maxCycles: 10_000_000 },
  { name: 'sre_lsezx', path: '/lorenz/sre_lsezx.bin', category: 'Lorenz', description: 'SRE Zero Page,X', successAddress: 0x08B4, maxCycles: 10_000_000 },
  { name: 'tas_shsay', path: '/lorenz/tas_shsay.bin', category: 'Lorenz', description: 'TAS Absolute,Y', successAddress: 0x08F5, maxCycles: 10_000_000 },
];

const ALL_TESTS = [...ROOT_TESTS, ...LORENZ_TESTS];

// Group tests by category
const groupTestsByCategory = (tests: TestFile[]) => {
  const groups: Record<string, TestFile[]> = {};
  tests.forEach(test => {
    if (!groups[test.category]) groups[test.category] = [];
    groups[test.category].push(test);
  });
  return groups;
};

interface TestRunnerProps {
  onClose: () => void;
}

export const TestRunner: React.FC<TestRunnerProps> = ({ onClose }) => {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Functional': true,
    'Decimal': true,
    'Suite': true,
    'Avery': false,
    'Timing': false,
    'Illegal': false,
    'Lorenz': false,
  });
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set(ROOT_TESTS.map(t => t.name)));
  const abortRef = useRef(false);
  const computerRef = useRef<Computer | null>(null);

  const groupedTests = groupTestsByCategory(ALL_TESTS);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleTestSelection = (testName: string) => {
    setSelectedTests(prev => {
      const next = new Set(prev);
      if (next.has(testName)) next.delete(testName);
      else next.add(testName);
      return next;
    });
  };

  const selectAllInCategory = (category: string, select: boolean) => {
    setSelectedTests(prev => {
      const next = new Set(prev);
      groupedTests[category].forEach(test => {
        if (select) next.add(test.name);
        else next.delete(test.name);
      });
      return next;
    });
  };

  const loadTestBinary = async (path: string): Promise<Uint8Array> => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  };

  const createSuccessResult = (cycles: number, startTime: number, pc: number): TestResult => ({
    status: 'success',
    cycles,
    duration: performance.now() - startTime,
    finalPC: pc
  });

  const createTrapResult = (cycles: number, startTime: number, pc: number): TestResult => ({
    status: 'failed',
    cycles,
    duration: performance.now() - startTime,
    error: `Trapped at $${pc.toString(16).toUpperCase().padStart(4, '0')}`,
    finalPC: pc
  });

  const getProgressResult = (cycles: number, startTime: number, aborted: boolean): TestResult => {
    if (aborted) {
      return {
        status: 'failed',
        cycles,
        duration: performance.now() - startTime,
        error: 'Aborted'
      };
    }

    return {
      status: 'timeout',
      cycles,
      duration: performance.now() - startTime,
      error: `Timeout after ${cycles.toLocaleString()} cycles`
    };
  };

  const evaluateCycleState = (
    test: TestFile,
    pc: number,
    cycles: number,
    startTime: number,
    lastPC: number,
    sameCount: number,
    sameThreshold: number,
  ) => {
    if (test.successAddress && pc === test.successAddress) {
      return {
        result: createSuccessResult(cycles, startTime, pc),
        nextLastPC: lastPC,
        nextSameCount: sameCount,
      };
    }

    if (pc !== lastPC) {
      return {
        result: null as TestResult | null,
        nextLastPC: pc,
        nextSameCount: 0,
      };
    }

    const nextSameCount = sameCount + 1;
    if (nextSameCount >= sameThreshold) {
      return {
        result: createTrapResult(cycles, startTime, pc),
        nextLastPC: lastPC,
        nextSameCount,
      };
    }

    return {
      result: null as TestResult | null,
      nextLastPC: lastPC,
      nextSameCount,
    };
  };

  const runBatch = (
    computer: Computer,
    test: TestFile,
    startTime: number,
    initialState: { cycles: number; lastPC: number; sameCount: number },
    sameThreshold: number,
    batchSize: number,
  ) => {
    let cycles = initialState.cycles;
    let lastPC = initialState.lastPC;
    let sameCount = initialState.sameCount;

    for (let batch = 0; batch < batchSize && cycles < test.maxCycles; batch++) {
      computer.clock();
      cycles++;

      const pc = computer.getPC();
      const state = evaluateCycleState(test, pc, cycles, startTime, lastPC, sameCount, sameThreshold);
      if (state.result) {
        return { cycles, lastPC: state.nextLastPC, sameCount: state.nextSameCount, result: state.result };
      }

      lastPC = state.nextLastPC;
      sameCount = state.nextSameCount;
    }

    return { cycles, lastPC, sameCount, result: null as TestResult | null };
  };

  const runTestCycles = async (computer: Computer, test: TestFile, startTime: number): Promise<TestResult> => {
    let cycles = 0;
    let sameCount = 0;
    let lastPC = -1;
    const SAME_THRESHOLD = 3;
    const BATCH_SIZE = 50000;
    const UI_UPDATE_INTERVAL = 500000;

    while (cycles < test.maxCycles && !abortRef.current) {
      const batch = runBatch(
        computer,
        test,
        startTime,
        { cycles, lastPC, sameCount },
        SAME_THRESHOLD,
        BATCH_SIZE,
      );
      cycles = batch.cycles;
      lastPC = batch.lastPC;
      sameCount = batch.sameCount;
      if (batch.result) return batch.result;

      if (cycles % UI_UPDATE_INTERVAL === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    if (abortRef.current) {
      return getProgressResult(cycles, startTime, true);
    }

    return getProgressResult(cycles, startTime, false);
  };

  const runSingleTest = async (test: TestFile): Promise<TestResult> => {
    const startTime = performance.now();

    try {
      const binary = await loadTestBinary(test.path);

      if (!computerRef.current) {
        computerRef.current = new Computer();
      }
      const computer = computerRef.current;

      // Load the test binary as a full 64KB image
      computer.loadFullImage(binary);
      return runTestCycles(computer, test, startTime);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        status: 'failed',
        cycles: 0,
        duration: performance.now() - startTime,
        error: message
      };
    }
  };

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    abortRef.current = false;

    const testsToRun = ALL_TESTS.filter(t => selectedTests.has(t.name));

    for (const test of testsToRun) {
      if (abortRef.current) break;

      setCurrentTest(test.name);
      setResults(prev => ({
        ...prev,
        [test.name]: { status: 'running', cycles: 0, duration: 0 }
      }));

      const result = await runSingleTest(test);

      setResults(prev => ({
        ...prev,
        [test.name]: result
      }));
    }

    setCurrentTest(null);
    setIsRunning(false);
  }, [selectedTests]);

  const stopTests = useCallback(() => {
    abortRef.current = true;
  }, []);

  const resetResults = useCallback(() => {
    setResults({});
    setCurrentTest(null);
  }, []);

  // Calculate stats
  const resultValues = Object.keys(results).map((key) => results[key]);
  const stats = {
    total: selectedTests.size,
    passed: resultValues.filter(r => r.status === 'success').length,
    failed: resultValues.filter(r => r.status === 'failed').length,
    timeout: resultValues.filter(r => r.status === 'timeout').length,
    pending: selectedTests.size - Object.keys(results).length,
  };

  const progressPercent = stats.total > 0
    ? ((stats.passed + stats.failed + stats.timeout) / stats.total) * 100
    : 0;

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'failed': return <XCircle className="text-red-500" size={16} />;
      case 'timeout': return <Clock className="text-yellow-500" size={16} />;
      case 'running': return <Loader2 className="text-blue-400 animate-spin" size={16} />;
      default: return <div className="w-4 h-4 rounded-full border border-neutral-600" />;
    }
  };

  const getStatusBg = (status: TestStatus) => {
    switch (status) {
      case 'success': return 'bg-green-500/10 border-green-500/30';
      case 'failed': return 'bg-red-500/10 border-red-500/30';
      case 'timeout': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'running': return 'bg-blue-500/10 border-blue-500/30';
      default: return 'bg-neutral-800/50 border-neutral-700';
    }
  };

  return (
    <div className="h-full flex flex-col bg-chip-black text-gray-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <Cpu className="text-cyan-400" size={20} />
          <h2 className="text-lg font-bold text-white">6502 Test Runner</h2>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white transition-colors text-xl px-2"
        >
          ×
        </button>
      </div>

      {/* Stats Bar */}
      <div className="px-4 py-3 bg-[#1e1e1e] border-b border-neutral-800">
        <div className="flex items-center gap-6 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 text-sm">Total:</span>
            <span className="text-white font-mono font-bold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-green-500" size={14} />
            <span className="text-green-400 font-mono">{stats.passed}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="text-red-500" size={14} />
            <span className="text-red-400 font-mono">{stats.failed}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="text-yellow-500" size={14} />
            <span className="text-yellow-400 font-mono">{stats.timeout}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: stats.failed > 0
                ? 'linear-gradient(90deg, #22c55e, #ef4444)'
                : 'linear-gradient(90deg, #22c55e, #3b82f6)'
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-2 bg-[#1e1e1e] border-b border-neutral-800 flex items-center gap-2">
        {isRunning ? (
          <button
            onClick={stopTests}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-sm transition-colors"
          >
            <Square size={16} />
            Stop
          </button>
        ) : (
          <button
            onClick={runAllTests}
            disabled={selectedTests.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded font-bold text-sm transition-colors"
          >
            <Play size={16} />
            Run Selected Tests
          </button>
        )}
        <button
          onClick={resetResults}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-white rounded text-sm transition-colors"
        >
          <RotateCcw size={14} />
          Reset
        </button>

        {currentTest && (
          <div className="ml-4 flex items-center gap-2 text-sm text-neutral-400">
            <Loader2 className="animate-spin text-blue-400" size={14} />
            Running: <span className="text-cyan-400 font-mono">{currentTest}</span>
          </div>
        )}
      </div>

      {/* Test List */}
      <div className="flex-1 overflow-auto p-4">
        {Object.entries(groupedTests).map(([category, tests]) => (
          <div key={category} className="mb-4">
            {/* Category Header */}
            <div className="flex items-center gap-2 py-2 px-3 bg-[#252526] rounded-t hover:bg-[#2a2a2a] transition-colors">
              <button
                type="button"
                className="flex items-center gap-2 text-left"
                onClick={() => toggleCategory(category)}
              >
                {expandedCategories[category] ? (
                  <ChevronDown size={16} className="text-neutral-400" />
                ) : (
                  <ChevronRight size={16} className="text-neutral-400" />
                )}
                <span className="font-bold text-white">{category}</span>
                <span className="text-neutral-500 text-sm">({tests.length} tests)</span>
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllInCategory(category, true);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  All
                </button>
                <span className="text-neutral-600">|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllInCategory(category, false);
                  }}
                  className="text-xs text-neutral-400 hover:text-neutral-300"
                >
                  None
                </button>
              </div>
            </div>

            {/* Tests in Category */}
            {expandedCategories[category] && (
              <div className="border border-neutral-800 border-t-0 rounded-b overflow-hidden">
                {tests.map((test, idx) => {
                  const result = results[test.name];
                  const status = result?.status || 'pending';
                  const isSelected = selectedTests.has(test.name);

                  return (
                    <div
                      key={test.name}
                      className={`flex items-center gap-3 px-3 py-2 border-b border-neutral-800 last:border-b-0 ${getStatusBg(status)} transition-colors`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTestSelection(test.name)}
                        disabled={isRunning}
                        className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-green-500 focus:ring-green-500 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed accent-green-500"
                      />

                      {getStatusIcon(status)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-white truncate">{test.name}</span>
                          <span className="text-neutral-500 text-xs truncate hidden sm:inline">{test.description}</span>
                        </div>
                      </div>

                      {result && (
                        <div className="flex items-center gap-4 text-xs font-mono">
                          {result.cycles > 0 && (
                            <span className="text-neutral-400">
                              {result.cycles.toLocaleString()} cycles
                            </span>
                          )}
                          {result.duration > 0 && (
                            <span className="text-neutral-500">
                              {(result.duration / 1000).toFixed(2)}s
                            </span>
                          )}
                          {result.finalPC !== undefined && (
                            <span className={status === 'success' ? 'text-green-400' : 'text-red-400'}>
                              PC: ${result.finalPC.toString(16).toUpperCase().padStart(4, '0')}
                            </span>
                          )}
                          {result.error && status !== 'success' && (
                            <span className="text-red-400 truncate max-w-50" title={result.error}>
                              {result.error}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestRunner;
