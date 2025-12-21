
import React from 'react';

interface SwitchProps {
  label: string;
  active: boolean;
  onClick: () => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  type?: 'momentary' | 'toggle';
}

export const Switch: React.FC<SwitchProps> = ({ 
  label, 
  active, 
  onClick, 
  onMouseDown, 
  onMouseUp, 
  type = 'toggle' 
}) => {
  // For momentary buttons: when pressed (active=true), show indicator at bottom
  // For toggle switches: active=true means switch is ON (indicator at top)
  const getIndicatorPosition = () => {
    if (type === 'momentary') {
      return active ? 'bottom-0.5' : 'top-0.5';
    }
    return active ? 'top-0.5' : 'bottom-0.5';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div 
        className={`w-4 h-8 bg-neutral-800 rounded border-2 cursor-pointer relative shadow-md transition-all ${type === 'momentary' && active ? 'shadow-inner bg-neutral-900' : ''}`}
        onClick={type === 'toggle' ? onClick : undefined}
        onMouseDown={type === 'momentary' ? onMouseDown : undefined}
        onMouseUp={type === 'momentary' ? onMouseUp : undefined}
        onMouseLeave={type === 'momentary' && onMouseUp ? onMouseUp : undefined}
        style={{ borderColor: '#555' }}
      >
        <div className={`absolute left-0.5 right-0.5 h-3 bg-neutral-400 rounded-sm transition-all duration-200 ${getIndicatorPosition()}`}></div>
      </div>
      <span className="text-[8px] font-bold text-neutral-500 uppercase">{label}</span>
    </div>
  );
};
