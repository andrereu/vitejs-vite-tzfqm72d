import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  hexToHsl, hslToHex, hexToRgb, isValidHex, getHarmonyColors
} from '../utils/colorMath';
import type { HarmonyType } from '../utils/colorMath';

interface ColorWheelPickerProps {
  value: string; // hex válido — quem chama garante um fallback (ex: '#2E482A')
  onChange: (hex: string) => void;
}

const HARMONY_LABELS: Record<HarmonyType, string> = {
  complementar: 'Complementar',
  analoga: 'Análoga',
  triadica: 'Triádica',
  tetradica: 'Tetrádica',
};

// Roda de cores (matiz + saturação) + luminosidade + hex/rgb + combinações
// harmônicas, no estilo dos pickers de cor genéricos — só que dentro do
// visual do app, em vez do color picker nativo do sistema operacional.
export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({ value, onChange }) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [harmonyType, setHarmonyType] = useState<HarmonyType>('complementar');
  const [hexInput, setHexInput] = useState(value.toUpperCase());

  const hsl = hexToHsl(value) || { h: 150, s: 34, l: 22 };
  const rgb = hexToRgb(value) || { r: 0, g: 0, b: 0 };

  // Sincroniza o campo de hex quando a cor muda por outra via (roda, slider,
  // combinação). Enquanto a própria médica digita um hex válido, `value`
  // já reflete o que ela digitou, então isto só reconfirma o mesmo texto;
  // um hex incompleto não chega a mudar `value`, então não é sobrescrito.
  useEffect(() => {
    setHexInput(value.toUpperCase());
  }, [value]);

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
    const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const s = (dist / radius) * 100;
    onChange(hslToHex(angle, s, hsl.l));
  }, [hsl.l, onChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const harmonyColors = getHarmonyColors(value, harmonyType);

  // Posição do marcador na roda: ângulo = matiz, distância do centro = saturação.
  const markerRadiusPct = Math.min(hsl.s, 100) / 2;
  const angleRad = (hsl.h * Math.PI) / 180;
  const markerLeft = 50 + markerRadiusPct * Math.cos(angleRad);
  const markerTop = 50 + markerRadiusPct * Math.sin(angleRad);

  return (
    <div className="space-y-3">
      <div
        ref={wheelRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative w-36 h-36 mx-auto rounded-full cursor-crosshair shadow-inner border border-black/10 touch-none"
        style={{
          background:
            'radial-gradient(circle, #fff 0%, transparent 70%), ' +
            'conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
          backgroundBlendMode: 'screen',
        }}
      >
        <span
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${markerLeft}%`, top: `${markerTop}%`, background: value }}
        />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Luminosidade</label>
        <input
          type="range"
          min={5}
          max={95}
          value={Math.round(hsl.l)}
          onChange={(e) => onChange(hslToHex(hsl.h, hsl.s, Number(e.target.value)))}
          className="w-full cursor-pointer"
          style={{ accentColor: value }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Hex</label>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => {
              let v = e.target.value;
              if (v && !v.startsWith('#')) v = `#${v}`;
              v = v.slice(0, 7);
              setHexInput(v.toUpperCase());
              if (isValidHex(v)) onChange(v);
            }}
            spellCheck={false}
            className="w-full p-2 text-xs font-mono uppercase bg-gray-50 border rounded-lg"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">RGB</label>
          <div className="w-full p-2 text-xs font-mono bg-gray-50 border rounded-lg text-gray-600 truncate">
            {rgb.r}, {rgb.g}, {rgb.b}
          </div>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Combinação de cores</label>
        <select
          value={harmonyType}
          onChange={(e) => setHarmonyType(e.target.value as HarmonyType)}
          className="w-full p-2 text-xs bg-gray-50 border rounded-lg font-semibold cursor-pointer"
        >
          {(Object.keys(HARMONY_LABELS) as HarmonyType[]).map((t) => (
            <option key={t} value={t}>{HARMONY_LABELS[t]}</option>
          ))}
        </select>
        <div className="flex gap-1.5 mt-2">
          {harmonyColors.map((c, i) => (
            <button
              key={`${c}-${i}`}
              type="button"
              title={c}
              onClick={() => onChange(c)}
              className="flex-1 h-8 rounded-lg cursor-pointer hover:scale-105 transition-all border border-black/10"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
