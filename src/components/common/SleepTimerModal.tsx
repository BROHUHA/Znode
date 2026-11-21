import React, { useState } from 'react';
import { Moon, X, Clock, Play, Plus, StopCircle, Check } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_MINUTES = [5, 10, 15, 30, 45, 60];

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ isOpen, onClose }) => {
  const {
    currentSong,
    sleepTimerEndTime,
    sleepTimerEndOfTrack,
    sleepTimerRemainingSeconds,
    setSleepTimer,
    setSleepTimerEndOfTrack,
    cancelSleepTimer,
    addSleepTimerMinutes,
  } = usePlayerStore();

  const [customMinutes, setCustomMinutes] = useState<number>(20);

  if (!isOpen) return null;

  const isTimerRunning = Boolean(sleepTimerEndTime || sleepTimerEndOfTrack);

  const formatRemaining = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md liquid-glass rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto scrollbar-none border border-white/20 animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-red/20 border border-accent-red/40 flex items-center justify-center text-accent-red shadow-[0_0_15px_rgba(250,45,72,0.3)]">
              <Moon className="w-5 h-5 fill-accent-red/30 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">Sleep Timer</h3>
              <p className="text-xs text-white/50">Stop audio playback smoothly</p>
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
          <div className="flex flex-col items-center justify-center py-4 gap-4">
            {/* Pulsing Moon Ring */}
            <div className="relative w-28 h-28 rounded-full flex items-center justify-center bg-white/5 border border-white/15 shadow-[0_0_30px_rgba(250,45,72,0.2)]">
              <div className="absolute inset-0 rounded-full border-2 border-accent-red/50 animate-ping opacity-25" />
              <Moon className="w-12 h-12 text-accent-red fill-accent-red/20" />
            </div>

            {/* Countdown / Status Text */}
            <div className="text-center">
              {sleepTimerEndOfTrack ? (
                <>
                  <div className="text-xl font-bold text-white">Stopping at End of Track</div>
                  <div className="text-xs text-white/50 mt-1 max-w-xs truncate">
                    {currentSong ? `Playing: ${currentSong.title}` : 'When song completes'}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-extrabold text-white tracking-tight tabular-nums drop-shadow-md">
                    {formatRemaining(sleepTimerRemainingSeconds)}
                  </div>
                  <div className="text-xs text-white/50 mt-1.5 flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-white/40" />
                    <span>
                      {sleepTimerEndTime ? `Turns off at ${getTargetEndTimeString(sleepTimerEndTime)}` : 'Timer active'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Quick Extension Buttons */}
            {!sleepTimerEndOfTrack && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => addSleepTimerMinutes(5)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-xs font-semibold text-white/90 hover:text-white border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-accent-red" />
                  <span>+5 min</span>
                </button>
                <button
                  onClick={() => addSleepTimerMinutes(15)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-xs font-semibold text-white/90 hover:text-white border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-accent-red" />
                  <span>+15 min</span>
                </button>
              </div>
            )}

            {/* Cancel Button */}
            <button
              onClick={() => {
                cancelSleepTimer();
              }}
              className="w-full mt-2 py-3 rounded-2xl bg-accent-red/15 hover:bg-accent-red/25 border border-accent-red/35 active:scale-98 text-accent-red font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <StopCircle className="w-4 h-4" />
              <span>Turn Off Timer</span>
            </button>
          </div>
        ) : (
          /* TIMER SETUP VIEW */
          <div className="flex flex-col gap-4">
            <p className="text-xs text-white/60">Choose a preset duration or stop when the current song finishes:</p>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-2">
              {PRESET_MINUTES.map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setSleepTimer(mins);
                    onClose();
                  }}
                  className="py-3 px-2 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 border border-white/10 hover:border-white/25 transition-all flex flex-col items-center justify-center cursor-pointer group"
                >
                  <span className="text-base font-bold text-white group-hover:text-accent-red transition-colors">
                    {mins}
                  </span>
                  <span className="text-[10px] text-white/40 group-hover:text-white/60 transition-colors uppercase tracking-wider">
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
                  ? 'bg-white/5 hover:bg-white/10 active:scale-[0.99] border-white/15 hover:border-accent-red/40'
                  : 'bg-white/5 opacity-40 border-white/5 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center shrink-0 text-accent-red">
                  <Play className="w-4 h-4 fill-accent-red" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-accent-red transition-colors">
                    End of this track
                  </div>
                  <div className="text-[11px] text-white/50 truncate">
                    {currentSong ? currentSong.title : 'Play a song first'}
                  </div>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-accent-red/20 transition-all shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Custom Minutes Slider & Input */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/80">Custom duration</span>
                <span className="text-xs font-bold text-accent-red">{customMinutes} minutes</span>
              </div>
              <input
                type="range"
                min={1}
                max={120}
                step={1}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(parseInt(e.target.value, 10))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/20 accent-accent-red"
              />
              <div className="flex items-center justify-between text-[10px] text-white/40">
                <span>1 min</span>
                <span>60 min</span>
                <span>120 min</span>
              </div>
              <button
                onClick={() => {
                  setSleepTimer(customMinutes);
                  onClose();
                }}
                className="w-full mt-1 py-2.5 rounded-xl bg-accent-red hover:bg-accent-red/90 active:scale-98 text-white font-bold text-xs shadow-[0_0_16px_rgba(250,45,72,0.4)] transition-all cursor-pointer"
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
