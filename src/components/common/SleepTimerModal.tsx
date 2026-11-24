import React, { useState } from 'react';
import { Moon, X, Clock, Play, Plus, Minus, StopCircle, Check, Sparkles, Volume2 } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_MINUTES = [5, 10, 15, 30, 45, 60];

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ isOpen, onClose }) => {
  const {
    currentSong,
    currentPalette,
    currentTime,
    duration,
    sleepTimerEndTime,
    sleepTimerDurationMinutes,
    sleepTimerEndOfTrack,
    sleepTimerRemainingSeconds,
    setSleepTimer,
    setSleepTimerEndOfTrack,
    cancelSleepTimer,
    addSleepTimerMinutes,
  } = usePlayerStore();

  const { accentColor } = useSettingsStore();
  const [customMinutes, setCustomMinutes] = useState<number>(20);

  if (!isOpen) return null;

  const isTimerRunning = Boolean(sleepTimerEndTime || sleepTimerEndOfTrack);

  const formatRemaining = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getTargetEndTimeString = (endTimeMs: number): string => {
    const date = new Date(endTimeMs);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minsStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${minsStr} ${ampm}`;
  };

  const trackRemainingSec = duration > currentTime ? Math.max(0, Math.round(duration - currentTime)) : 0;

  // Circular countdown progress (for active timer)
  const totalSec = (sleepTimerDurationMinutes || 1) * 60;
  const progressRatio =
    !sleepTimerEndOfTrack && sleepTimerRemainingSeconds !== null && totalSec > 0
      ? Math.max(0, Math.min(1, sleepTimerRemainingSeconds / totalSec))
      : 1;
  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference * (1 - progressRatio);

  const customPercent = ((customMinutes - 1) / 119) * 100;
  const themeGlow = currentPalette?.dominant || accentColor || '#FA2D48';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-2xl animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md liquid-glass rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto scrollbar-none border border-white/20 animate-scale-in overflow-hidden"
      >
        {/* Nocturnal / Song-Themed Ambient Glow */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none blur-3xl opacity-25"
          style={{ background: `radial-gradient(circle, ${themeGlow} 0%, transparent 70%)` }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full pointer-events-none blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)' }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-red/20 border border-accent-red/40 flex items-center justify-center text-accent-red shadow-[0_0_18px_rgba(250,45,72,0.3)]">
              <Moon className="w-5 h-5 fill-accent-red/30 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Sleep Timer</span>
                <Sparkles className="w-3.5 h-3.5 text-accent-red/80" />
              </h3>
              <p className="text-[11px] text-white/50">Gentle fade-out before pausing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ACTIVE TIMER VIEW */}
        {isTimerRunning ? (
          <div className="relative z-10 flex flex-col items-center justify-center py-3 gap-4">
            {/* Nocturnal Circular Countdown Ring */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="6"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={ringRadius}
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-700 ease-out"
                  style={{ filter: `drop-shadow(0 0 8px ${accentColor}88)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Moon className="w-7 h-7 text-accent-red fill-accent-red/25 mb-1" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  {sleepTimerEndOfTrack ? '1 Track' : 'Active'}
                </span>
              </div>
            </div>

            {/* Countdown / Status Text */}
            <div className="text-center">
              {sleepTimerEndOfTrack ? (
                <>
                  <div className="text-lg font-bold text-white">Stopping at End of Track</div>
                  <div className="text-xs text-white/55 mt-1 max-w-xs truncate">
                    {currentSong ? `${currentSong.title} • ${formatRemaining(trackRemainingSec)} left` : 'When song completes'}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-extrabold text-white tracking-tight tabular-nums drop-shadow-md">
                    {formatRemaining(sleepTimerRemainingSeconds)}
                  </div>
                  <div className="text-xs text-white/55 mt-1.5 flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-white/45" />
                    <span>
                      {sleepTimerEndTime ? `Stops at ${getTargetEndTimeString(sleepTimerEndTime)}` : 'Timer active'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Fade-out indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] text-white/55">
              <Volume2 className="w-3.5 h-3.5 text-accent-red" />
              <span>Smooth 5s audio fade-out enabled</span>
            </div>

            {/* Quick Extension Buttons */}
            {!sleepTimerEndOfTrack && (
              <div className="flex items-center gap-2 mt-1">
                {[1, 5, 15].map((addMins) => (
                  <button
                    key={addMins}
                    onClick={() => addSleepTimerMinutes(addMins)}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.07] hover:bg-white/15 active:scale-95 text-xs font-semibold text-white/90 hover:text-white border border-white/15 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-accent-red" />
                    <span>{addMins}m</span>
                  </button>
                ))}
              </div>
            )}

            {/* Cancel Button */}
            <button
              onClick={cancelSleepTimer}
              className="w-full mt-1 py-3 rounded-2xl bg-accent-red/15 hover:bg-accent-red/25 border border-accent-red/35 active:scale-[0.98] text-accent-red font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <StopCircle className="w-4 h-4" />
              <span>Turn Off Timer</span>
            </button>
          </div>
        ) : (
          /* TIMER SETUP VIEW */
          <div className="relative z-10 flex flex-col gap-4">
            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-2">
              {PRESET_MINUTES.map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setSleepTimer(mins);
                    onClose();
                  }}
                  className="py-3 px-2 rounded-2xl bg-white/[0.05] hover:bg-white/12 active:scale-95 border border-white/10 hover:border-accent-red/40 transition-all flex flex-col items-center justify-center cursor-pointer group"
                >
                  <span className="text-base font-bold text-white group-hover:text-accent-red transition-colors tabular-nums">
                    {mins}
                  </span>
                  <span className="text-[10px] text-white/45 group-hover:text-white/70 transition-colors uppercase tracking-wider">
                    Minutes
                  </span>
                </button>
              ))}
            </div>

            {/* End of Current Track Option */}
            <button
              onClick={() => {
                setSleepTimerEndOfTrack();
                onClose();
              }}
              disabled={!currentSong}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-left cursor-pointer group ${
                currentSong
                  ? 'bg-white/[0.05] hover:bg-white/10 active:scale-[0.99] border-white/15 hover:border-accent-red/40'
                  : 'bg-white/5 opacity-40 border-white/5 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-accent-red/15 border border-accent-red/30 flex items-center justify-center shrink-0 text-accent-red">
                  <Play className="w-4 h-4 fill-accent-red" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-accent-red transition-colors">
                    End of current track
                  </div>
                  <div className="text-[11px] text-white/50 truncate">
                    {currentSong
                      ? `${currentSong.title}${trackRemainingSec > 0 ? ` (${formatRemaining(trackRemainingSec)} left)` : ''}`
                      : 'Play a song first'}
                  </div>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/45 group-hover:text-white group-hover:bg-accent-red/25 transition-all shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Custom Minutes Card with Steppers & Target Clock Preview */}
            <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white/85 block">Custom duration</span>
                  <span className="text-[10px] text-white/45 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Stops at {getTargetEndTimeString(Date.now() + customMinutes * 60 * 1000)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCustomMinutes((m) => Math.max(1, m - 5))}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/75 hover:text-white cursor-pointer active:scale-90 transition-all"
                    aria-label="Decrease 5 minutes"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold font-mono text-accent-red min-w-[48px] text-center">
                    {customMinutes} min
                  </span>
                  <button
                    onClick={() => setCustomMinutes((m) => Math.min(120, m + 5))}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/75 hover:text-white cursor-pointer active:scale-90 transition-all"
                    aria-label="Increase 5 minutes"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <input
                type="range"
                min={1}
                max={120}
                step={1}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(parseInt(e.target.value, 10))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent-red [&::-webkit-slider-thumb]:shadow-md"
                style={{
                  background: `linear-gradient(to right, ${accentColor} ${customPercent}%, rgba(255,255,255,0.14) ${customPercent}%)`,
                }}
              />

              <button
                onClick={() => {
                  setSleepTimer(customMinutes);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-accent-red hover:bg-accent-red/90 active:scale-[0.98] text-white font-bold text-xs shadow-[0_0_16px_rgba(250,45,72,0.4)] transition-all cursor-pointer"
              >
                Start {customMinutes} Minute Timer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
