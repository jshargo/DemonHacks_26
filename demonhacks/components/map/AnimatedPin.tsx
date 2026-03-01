// AnimatedPin — SVG icon pin with CSS drop-bounce entrance animation
// Uses raw HTML elements (not RN Views) since these live inside Mapbox
// <Marker> DOM overlays. Animation uses only transform + opacity for GPU
// acceleration.

import { useRef, useEffect } from 'react';
import type { EntityType } from '@/lib/types';
import { ENTITY_TYPES, PIN_ICONS } from '@/lib/constants';
import { colors, shadows } from '@/lib/theme';

// ─── Inject keyframes into <head> once ───

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;

  const sheet = document.createElement('style');
  sheet.textContent = `
    @keyframes pin-drop-bounce {
      0% {
        transform: translateY(-80px) scale(0.6);
        opacity: 0;
      }
      50% {
        transform: translateY(4px) scale(1.05);
        opacity: 1;
      }
      70% {
        transform: translateY(-6px) scale(0.98);
        opacity: 1;
      }
      85% {
        transform: translateY(2px) scale(1.01);
        opacity: 1;
      }
      100% {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(sheet);
}

// ─── Component ───

interface AnimatedPinProps {
  entityType: EntityType;
  index: number;
  onClick?: () => void;
}

export default function AnimatedPin({ entityType, index, onClick }: AnimatedPinProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectStyles();
  }, []);

  // Remove will-change after animation completes to free GPU memory
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => {
      el.style.willChange = 'auto';
    };
    el.addEventListener('animationend', handler);
    return () => el.removeEventListener('animationend', handler);
  }, []);

  const color = ENTITY_TYPES[entityType]?.color ?? colors.textPrimary;
  const iconPath = PIN_ICONS[entityType];
  const delay = Math.min(index * 30, 600);

  // Build CSS box-shadow from theme shadow token
  const pinShadow = `${shadows.pin.shadowOffset.width}px ${shadows.pin.shadowOffset.height}px ${shadows.pin.shadowRadius}px rgba(0,0,0,${shadows.pin.shadowOpacity})`;

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        backgroundColor: color,
        border: `2.5px solid ${colors.white}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: pinShadow,
        animation: `pin-drop-bounce 0.5s ease-out ${delay}ms both`,
        willChange: 'transform, opacity',
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={iconPath} fill={colors.white} />
      </svg>
    </div>
  );
}
