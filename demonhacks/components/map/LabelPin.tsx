// LabelPin — Airbnb-style white pill pin with text label
// Uses raw HTML elements since it lives inside Mapbox Marker DOM overlays.
// CSS transitions handle smooth state changes (selection, hover).

import { useRef, useEffect } from 'react';
import type { PinLabel } from '@/lib/types';

let stylesInjected = false;

function injectLabelPinStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;

  const sheet = document.createElement('style');
  sheet.textContent = `
    .label-pin {
      padding: 4px 10px;
      border-radius: 16px;
      background: #fff;
      border: 1.5px solid #ddd;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      cursor: pointer;
      font-family: 'Satoshi-Bold', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #1A1A1A;
      white-space: nowrap;
      user-select: none;
      transition: transform 0.15s ease, background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      will-change: transform;
    }
    .label-pin:hover {
      transform: scale(1.08);
      border-color: #374DF5;
    }
    .label-pin--selected {
      background: #374DF5;
      color: #fff;
      border-color: #374DF5;
    }
    .label-pin--highlighted {
      transform: scale(1.15);
      border-color: #374DF5;
      box-shadow: 0 0 0 3px rgba(55, 77, 245, 0.2), 0 2px 6px rgba(0,0,0,0.15);
    }
    .label-pin--dimmed {
      opacity: 0.35;
      transform: scale(0.8);
      pointer-events: none;
    }
  `;
  document.head.appendChild(sheet);
}

interface LabelPinProps {
  label: PinLabel;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function LabelPin({
  label,
  isSelected,
  isHighlighted,
  isDimmed,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: LabelPinProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectLabelPinStyles();
  }, []);

  const classNames = [
    'label-pin',
    isSelected && 'label-pin--selected',
    isHighlighted && !isSelected && 'label-pin--highlighted',
    isDimmed && 'label-pin--dimmed',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={classNames}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {label.text}
    </div>
  );
}
