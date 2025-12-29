import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Music, Volume2, VolumeX } from 'lucide-react';
import { Computer } from '../../services/computer';
import { TIA_WRITE } from '../../services/tiaRegisters';

interface TiaAudioKeyboardProps {
  computerRef: React.RefObject<Computer>;
  audioEnabled: boolean;
  onToggleAudio: () => void;
}

type NoteConfig = {
  id: string;
  label: string;
  freq: number;
  isBlack?: boolean;
  whiteIndex?: number;
};

const WHITE_NOTES: NoteConfig[] = [
  { id: 'do', label: 'Dó', freq: 261.63 },
  { id: 're', label: 'Ré', freq: 293.66 },
  { id: 'mi', label: 'Mi', freq: 329.63 },
  { id: 'fa', label: 'Fá', freq: 349.23 },
  { id: 'sol', label: 'Sol', freq: 392 },
  { id: 'la', label: 'Lá', freq: 440 },
  { id: 'si', label: 'Si', freq: 493.88 }
];

const BLACK_NOTES: NoteConfig[] = [
  { id: 'do#', label: 'Dó#', freq: 277.18, isBlack: true, whiteIndex: 0 },
  { id: 're#', label: 'Ré#', freq: 311.13, isBlack: true, whiteIndex: 1 },
  { id: 'fa#', label: 'Fá#', freq: 369.99, isBlack: true, whiteIndex: 3 },
  { id: 'sol#', label: 'Sol#', freq: 415.3, isBlack: true, whiteIndex: 4 },
  { id: 'la#', label: 'Lá#', freq: 466.16, isBlack: true, whiteIndex: 5 }
];

const AUDIO_MODE = 12; // AUDC0 = 12 (div6 pure tone)
const AUDIO_DIVISOR = 6; // matches AUDIO_MODE 12 in services/tia.ts
const BASE_CLOCK = 31400; // NTSC base clock used in TIA audio
const DEFAULT_VOLUME = 15; // 0-15

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const TiaAudioKeyboard: React.FC<TiaAudioKeyboardProps> = ({ computerRef, audioEnabled, onToggleAudio }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [lastWrite, setLastWrite] = useState({ audc0: 0, audf0: 0, audv0: 0, label: '' });
  const [isFocused, setIsFocused] = useState(false);

  const noteTable = useMemo(() => {
    return [...WHITE_NOTES, ...BLACK_NOTES].map(note => {
      const raw = (BASE_CLOCK / (note.freq * AUDIO_DIVISOR)) - 1;
      const audf0 = clamp(Math.round(raw), 0, 31);
      return { ...note, audf0 };
    });
  }, []);

  const whiteNotes = useMemo(() => noteTable.filter(note => !note.isBlack), [noteTable]);
  const blackNotes = useMemo(() => noteTable.filter(note => note.isBlack), [noteTable]);

  const ensureAudioOn = () => {
    computerRef.current?.setTiaAudio?.(true);
  };

  const writeTia = (reg: number, value: number) => {
    computerRef.current?.writeTiaRegister?.(reg, value);
  };

  const playNote = (note: { label: string; audf0: number }) => {
    if (!audioEnabled) onToggleAudio();
    ensureAudioOn();

    writeTia(TIA_WRITE.AUDC0, AUDIO_MODE);
    writeTia(TIA_WRITE.AUDF0, note.audf0);
    writeTia(TIA_WRITE.AUDV0, DEFAULT_VOLUME);

    setLastWrite({ audc0: AUDIO_MODE, audf0: note.audf0, audv0: DEFAULT_VOLUME, label: note.label });
  };

  const stopNote = () => {
    writeTia(TIA_WRITE.AUDV0, 0x00);
    setLastWrite(prev => ({ ...prev, audv0: 0 }));
  };

  const handlePress = (note: { id: string; label: string; audf0: number }) => {
    setActiveNoteId(note.id);
    playNote(note);
  };

  const handleRelease = () => {
    setActiveNoteId(null);
    stopNote();
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isFocused) return;
    const keyMap: Record<string, string> = {
      '1': 'do',
      '2': 're',
      '3': 'mi',
      '4': 'fa',
      '5': 'sol',
      '6': 'la',
      '7': 'si'
    };
    const noteId = keyMap[event.key];
    if (!noteId) return;
    const note = noteTable.find(item => item.id === noteId);
    if (!note || activeNoteId === note.id) return;
    event.preventDefault();
    handlePress(note);
  }, [activeNoteId, isFocused, noteTable]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!isFocused) return;
    const keyMap: Record<string, string> = {
      '1': 'do',
      '2': 're',
      '3': 'mi',
      '4': 'fa',
      '5': 'sol',
      '6': 'la',
      '7': 'si'
    };
    if (!keyMap[event.key]) return;
    event.preventDefault();
    handleRelease();
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused) return;
    globalThis.addEventListener('keydown', handleKeyDown);
    globalThis.addEventListener('keyup', handleKeyUp);
    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
      globalThis.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp, isFocused]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="TIA Audio Keyboard"
      className={`visualizer-panel relative bg-[#111417] p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] border flex flex-col gap-3 items-center cursor-default w-105 outline-none transition-colors ${
        isFocused ? 'border-cyan-500' : 'border-neutral-800'
      }`}
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={() => containerRef.current?.focus()}
      onKeyDown={() => { /* keyboard handled by globalThis listeners when focused */ }}
    >
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 tracking-widest uppercase">
          <Music size={12} />
          TIA AUDIO KEYBOARD
        </div>
        <button
          onClick={onToggleAudio}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-colors ${
            audioEnabled ? 'bg-green-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
          }`}
        >
          {audioEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
          {audioEnabled ? 'AUDIO ON' : 'AUDIO OFF'}
        </button>
      </div>

      <div className="w-full bg-black/40 rounded-lg border border-neutral-700 p-3">
        <div className="relative h-37.5 select-none">
          {/* White keys */}
          <div className="absolute inset-0 flex gap-0.5">
            {whiteNotes.map((note, index) => (
              <button
                key={note.id}
                onMouseDown={() => handlePress(note)}
                onMouseUp={handleRelease}
                onMouseLeave={handleRelease}
                onTouchStart={() => handlePress(note)}
                onTouchEnd={handleRelease}
                className={`relative flex-1 rounded-b-lg border border-neutral-400 bg-linear-to-b text-[11px] font-bold transition-all shadow-[inset_0_-4px_0_rgba(0,0,0,0.25)] ${
                  activeNoteId === note.id
                    ? 'from-neutral-200 to-neutral-400 text-black translate-y-0.5 shadow-[inset_0_-1px_0_rgba(0,0,0,0.3)]'
                    : 'from-white to-neutral-200 text-black hover:from-neutral-100'
                }`}
              >
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px]">
                  {note.label}
                </span>
                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-neutral-500">
                  {index + 1}
                </span>
              </button>
            ))}
          </div>

          {/* Black keys */}
          {blackNotes.map(note => {
            const whiteWidth = 100 / whiteNotes.length;
            const blackWidth = whiteWidth * 0.6;
            const left = ((note.whiteIndex ?? 0) + 1) * whiteWidth - blackWidth / 2;
            return (
              <button
                key={note.id}
                onMouseDown={() => handlePress(note)}
                onMouseUp={handleRelease}
                onMouseLeave={handleRelease}
                onTouchStart={() => handlePress(note)}
                onTouchEnd={handleRelease}
                style={{ left: `${left}%`, width: `${blackWidth}%` }}
                className={`absolute top-0 h-22.5 rounded-b-md border border-black bg-linear-to-b text-[9px] font-bold text-white shadow-[inset_0_-6px_0_rgba(0,0,0,0.6)] transition-all ${
                  activeNoteId === note.id
                    ? 'from-neutral-700 to-black translate-y-0.5 shadow-[inset_0_-2px_0_rgba(0,0,0,0.8)]'
                    : 'from-neutral-900 to-black'
                }`}
              >
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2">{note.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-[9px] text-neutral-500 text-center">
          Clique na board para ativar o teclado. Teclas 1-7: Dó, Ré, Mi, Fá, Sol, Lá, Si.
        </div>
      </div>

      <div className="w-full bg-black/40 rounded-lg border border-neutral-700 p-3">
        <div className="text-[9px] text-neutral-500 mb-1 uppercase tracking-widest">Instruções TIA</div>
        <div className="font-mono text-[11px] text-green-400 leading-relaxed">
          <div>; {lastWrite.label || 'Selecione uma nota'}</div>
          <div>LDA #$${lastWrite.audc0.toString(16).toUpperCase().padStart(2, '0')}  ; AUDC0</div>
          <div>STA $${TIA_WRITE.AUDC0.toString(16).toUpperCase().padStart(2, '0')}</div>
          <div>LDA #$${lastWrite.audf0.toString(16).toUpperCase().padStart(2, '0')}  ; AUDF0</div>
          <div>STA $${TIA_WRITE.AUDF0.toString(16).toUpperCase().padStart(2, '0')}</div>
          <div>LDA #$${lastWrite.audv0.toString(16).toUpperCase().padStart(2, '0')}  ; AUDV0</div>
          <div>STA $${TIA_WRITE.AUDV0.toString(16).toUpperCase().padStart(2, '0')}</div>
        </div>
      </div>
    </div>
  );
};
