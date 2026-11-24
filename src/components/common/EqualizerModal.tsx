import React, { useState } from 'react';
import { X, Sliders, RotateCcw } from 'lucide-react';
import { EQ_FREQUENCIES, EQ_PRESETS } from '../../audio/audioEngine';
import { useSettingsStore } from '../../stores/settingsStore';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'TONE' | 'GRAPHIC'>('TONE');
  const {
    toneX,
    toneY,
    setTonePad,
    eqGains,
    setEqGain,
    selectedPreset,
    setPreset,
  } = useSettingsStore();

  if (!isOpen) return null;

  const updateToneFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setTonePad(
      Math.max(-1, Math.min(1, Number(x.toFixed(2)))),
      Math.max(-1, Math.min(1, Number(y.toFixed(2))))
    );
  };

  const updateBandFromPointer = (idx: number, e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const db = Math.round(ratio * 24 - 12);
    setEqGain(idx, Math.max(-12, Math.min(12, db)));
  };

  const puckLeft = ((toneX + 1) / 2) * 100;
  const puckTop = ((-toneY + 1) / 2) * 100;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl liquid-glass rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5 backdrop-blur-3xl border border-white/15 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-red/15 border border-accent-red/30 flex items-center justify-center">
              <Sliders className="w-4 h-4 text-accent-red" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">Equalizer & Audio DSP</h3>
              <p className="text-[11px] text-white/45">Real-time Web Audio shaping</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Equalizer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="flex bg-white/[0.06] p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setTab('TONE')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              tab === 'TONE'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/55 hover:text-white/80'
            }`}
          >
            Dynamic Tone Pad
          </button>
          <button
            onClick={() => setTab('GRAPHIC')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              tab === 'GRAPHIC'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/55 hover:text-white/80'
            }`}
          >
            Graphic 10-Band EQ
          </button>
        </div>

        {/* Tone Pad View */}
        {tab === 'TONE' && (
          <div className="flex flex-col items-center gap-4 py-1">
            <div className="relative flex flex-col items-center gap-2">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
                Vocal Presence +
              </span>

              <div
                className="relative w-64 h-64 sm:w-72 sm:h-72 bg-white/[0.04] border border-white/15 rounded-3xl cursor-crosshair overflow-hidden touch-none shadow-inner"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  updateToneFromPointer(e);
                }}
                onPointerMove={(e) => {
                  if (e.buttons === 1) {
                    updateToneFromPointer(e);
                  }
                }}
              >
                {/* Ambient glow following puck */}
                <div
                  className="absolute w-40 h-40 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 blur-2xl opacity-35 transition-all duration-75"
                  style={{
                    left: `${puckLeft}%`,
                    top: `${puckTop}%`,
                    background: 'radial-gradient(circle, #FA2D48 0%, transparent 70%)',
                  }}
                />

                {/* Subtle grid lines & center ring */}
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/10 pointer-events-none" />
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/10 pointer-events-none" />
                <div className="absolute left-1/2 top-1/2 w-24 h-24 rounded-full border border-white/[0.06] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute left-1/2 top-1/2 w-48 h-48 rounded-full border border-white/[0.04] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                {/* Puck */}
                <div
                  className="absolute w-6 h-6 rounded-full bg-accent-red shadow-[0_0_16px_rgba(250,45,72,0.8)] border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    left: `${puckLeft}%`,
                    top: `${puckTop}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between w-64 sm:w-72 text-[10px] text-white/45 uppercase tracking-widest font-mono pt-1">
                <span>Warmer / Bass</span>
                <span>Brighter / Treble</span>
              </div>
            </div>

            {(toneX !== 0 || toneY !== 0) && (
              <button
                onClick={() => setTonePad(0, 0)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-white/75 hover:text-white transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Center</span>
              </button>
            )}
          </div>
        )}

        {/* Graphic 10-Band EQ View */}
        {tab === 'GRAPHIC' && (
          <div className="flex flex-col gap-5">
            {/* Presets Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {EQ_PRESETS.map((p) => {
                const isActive = selectedPreset === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => setPreset(p.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-accent-red text-white shadow-md shadow-accent-red/30'
                        : 'bg-white/[0.06] hover:bg-white/12 text-white/70 hover:text-white border border-white/10'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>

            {/* 10-Band Vertical Faders (fully fitted inside modal) */}
            <div className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-2 sm:px-4 py-4">
              <div className="grid grid-cols-10 gap-1 sm:gap-2 items-center">
                {EQ_FREQUENCIES.map((freq, idx) => {
                  const gain = eqGains[idx] || 0;
                  const percent = ((gain + 12) / 24) * 100;
                  const fillBottom = gain >= 0 ? 50 : percent;
                  const fillHeight = Math.abs(percent - 50);

                  return (
                    <div key={freq} className="flex flex-col items-center gap-2.5 min-w-0">
                      {/* dB Readout */}
                      <span
                        className={`text-[10px] font-mono tabular-nums ${
                          gain !== 0 ? 'text-white font-semibold' : 'text-white/40'
                        }`}
                      >
                        {gain > 0 ? `+${gain}` : gain}
                      </span>

                      {/* Custom Vertical Fader Track */}
                      <div
                        className="relative w-7 sm:w-8 h-36 flex items-center justify-center cursor-ns-resize touch-none select-none"
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          updateBandFromPointer(idx, e);
                        }}
                        onPointerMove={(e) => {
                          if (e.buttons === 1) {
                            updateBandFromPointer(idx, e);
                          }
                        }}
                        onDoubleClick={() => setEqGain(idx, 0)}
                        title={`${freq >= 1000 ? `${freq / 1000}kHz` : `${freq}Hz`}: ${gain > 0 ? `+${gain}` : gain} dB (double-click to reset)`}
                      >
                        {/* Rail */}
                        <div className="relative w-1.5 h-full rounded-full bg-white/15 overflow-hidden">
                          {/* Active dB fill from center 0dB */}
                          <div
                            className="absolute left-0 right-0 bg-accent-red rounded-full transition-all duration-75"
                            style={{
                              bottom: `${fillBottom}%`,
                              height: `${fillHeight}%`,
                            }}
                          />
                        </div>

                        {/* Center 0dB tick */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-[1px] bg-white/25 pointer-events-none" />

                        {/* Fader Thumb */}
                        <div
                          className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-accent-red shadow-[0_0_8px_rgba(250,45,72,0.6)] pointer-events-none transition-all duration-75"
                          style={{
                            bottom: `${percent}%`,
                          }}
                        />
                      </div>

                      {/* Frequency Label */}
                      <span className="text-[10px] text-white/55 font-mono">
                        {freq >= 1000 ? `${freq / 1000}k` : freq}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

