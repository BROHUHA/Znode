import React from 'react';
import { X, User, ChevronRight, Keyboard, Moon, Settings, Check, Sparkles, Volume2 } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { usePlayerStore } from '../../stores/playerStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAccount?: () => void;
  onOpenShortcuts?: () => void;
  onOpenSleepTimer?: () => void;
}

const ACCENT_PRESETS = [
  { name: 'Apple Red', color: '#FA2D48' },
  { name: 'Electric Blue', color: '#3B82F6' },
  { name: 'Emerald', color: '#10B981' },
  { name: 'Vibrant Purple', color: '#8B5CF6' },
  { name: 'Amber Glow', color: '#F59E0B' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenAccount,
  onOpenShortcuts,
  onOpenSleepTimer,
}) => {
  const { isSignedIn, account } = useAuthStore();
  const { sleepTimerEndTime, sleepTimerEndOfTrack, sleepTimerRemainingSeconds } = usePlayerStore();
  const {
    accentColor,
    setAccentColor,
    crossfadeSeconds,
    setCrossfadeSeconds,
    audioQuality,
    setAudioQuality,
  } = useSettingsStore();

  if (!isOpen) return null;

  const crossfadePercent = (crossfadeSeconds / 12) * 100;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg liquid-glass rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5 max-h-[85vh] overflow-y-auto scrollbar-none backdrop-blur-3xl border border-white/15"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-red/15 border border-accent-red/30 flex items-center justify-center">
              <Settings className="w-4 h-4 text-accent-red" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">Settings</h3>
              <p className="text-[11px] text-white/45">Account, audio & personalization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Section */}
        <section className="flex flex-col gap-2">
          <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider px-1">Account</h4>
          <button
            onClick={() => {
              onClose();
              onOpenAccount?.();
            }}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {isSignedIn && account?.thumbnailUrl ? (
                <img
                  src={account.thumbnailUrl}
                  alt={account.name}
                  className="w-11 h-11 rounded-full object-cover border border-white/20 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/60 shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-white group-hover:text-accent-red transition-colors truncate">
                  {isSignedIn && account ? account.name : 'Not signed in'}
                </p>
                <p className="text-xs text-white/50 truncate">
                  {isSignedIn && account ? account.email || 'YouTube Music Account' : 'Tap to sign in with YouTube Music'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </section>

        {/* Playback & Audio Section */}
        <section className="flex flex-col gap-2.5">
          <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider px-1">Playback & Audio</h4>

          {/* Song Blending / Crossfade */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-red" />
                <span className="text-sm font-semibold text-white">Song Blending (Crossfade)</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-accent-red/15 text-accent-red border border-accent-red/25">
                {crossfadeSeconds === 0 ? 'Off' : `${crossfadeSeconds}s`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={crossfadeSeconds}
              onChange={(e) => setCrossfadeSeconds(parseInt(e.target.value, 10))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent-red [&::-webkit-slider-thumb]:shadow-md"
              style={{
                background: `linear-gradient(to right, ${accentColor} ${crossfadePercent}%, rgba(255,255,255,0.14) ${crossfadePercent}%)`,
              }}
            />
            <p className="text-[11px] text-white/45">
              {crossfadeSeconds === 0
                ? 'Tracks play to the end without overlapping'
                : `Smoothly fades out the ending track over ${crossfadeSeconds}s into the next song`}
            </p>
          </div>

          {/* Audio Quality */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-white/70" />
              <div>
                <p className="text-sm font-semibold text-white">Audio Quality</p>
                <p className="text-[11px] text-white/45">
                  {audioQuality === 'LOSSLESS'
                    ? 'Best quality — 320kbps AAC CDN with YouTube Opus fallback'
                    : audioQuality === 'HIGH'
                    ? 'High quality — 320kbps AAC when available'
                    : 'Standard — YouTube stream only (data saver)'}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 bg-white/[0.06] p-1 rounded-xl border border-white/[0.06]">
              {(
                [
                  { id: 'LOSSLESS', label: 'Lossless' },
                  { id: 'HIGH', label: 'High' },
                  { id: 'LOW', label: 'Standard' },
                ] as const
              ).map((q) => (
                <button
                  key={q.id}
                  onClick={() => setAudioQuality(q.id)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    audioQuality === q.id
                      ? 'bg-accent-red/20 text-accent-red border border-accent-red/35 shadow-sm'
                      : 'text-white/55 hover:text-white/80'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sleep Timer */}
          {onOpenSleepTimer && (
            <button
              onClick={() => {
                onClose();
                onOpenSleepTimer();
              }}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent-red/15 border border-accent-red/30 flex items-center justify-center text-accent-red shrink-0">
                  <Moon className="w-4 h-4 fill-accent-red/30" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-accent-red transition-colors">
                    Sleep Timer
                  </div>
                  <div className="text-xs text-white/50">
                    {sleepTimerEndOfTrack
                      ? 'Stopping at end of current track'
                      : sleepTimerEndTime
                      ? `Active: ${Math.ceil((sleepTimerRemainingSeconds || 0) / 60)}m left`
                      : 'Automatically pause playback'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(sleepTimerEndTime || sleepTimerEndOfTrack) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/30">
                    Active
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          )}
        </section>

        {/* Appearance Section */}
        <section className="flex flex-col gap-2">
          <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider px-1">Appearance</h4>
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-semibold text-white block">Accent Color</span>
              <span className="text-[11px] text-white/45">
                {ACCENT_PRESETS.find((p) => p.color === accentColor)?.name || 'Custom'}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              {ACCENT_PRESETS.map((p) => {
                const isSelected = accentColor === p.color;
                return (
                  <button
                    key={p.color}
                    onClick={() => setAccentColor(p.color)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                      isSelected ? 'scale-115 ring-2 ring-white ring-offset-2 ring-offset-black/40' : 'hover:scale-110 opacity-85 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                    aria-label={p.name}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Keyboard Controls */}
        {onOpenShortcuts && (
          <section className="flex flex-col gap-2">
            <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider px-1">Controls</h4>
            <button
              onClick={() => {
                onClose();
                onOpenShortcuts();
              }}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white/80 shrink-0 group-hover:scale-105 transition-transform">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-accent-red transition-colors">
                    Keyboard Shortcuts
                  </p>
                  <p className="text-xs text-white/50">
                    Spacebar, arrow keys & playback hotkeys
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

