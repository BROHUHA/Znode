import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LyricLine } from '../../types';
import { lyricsService } from '../../services/lyricsService';
import { usePlayerStore } from '../../stores/playerStore';
import { Music2, ChevronDown, Sparkles, RotateCw } from 'lucide-react';

interface MainLyricsViewProps {
  onClose?: () => void;
}

export const MainLyricsView: React.FC<MainLyricsViewProps> = () => {
  const { currentSong, currentTime, duration, seek } = usePlayerStore();

  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isLyricsLoading, setIsLyricsLoading] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(true);
  const [lyricsSource, setLyricsSource] = useState<string>('LRCLIB');
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(-1);
  const [isUserScrolling, setIsUserScrolling] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch lyrics whenever currentSong changes
  useEffect(() => {
    if (!currentSong) {
      setLyrics([]);
      return;
    }

    let isMounted = true;
    setIsLyricsLoading(true);
    setActiveLyricIndex(-1);
    setIsUserScrolling(false);

    lyricsService
      .getLyrics(currentSong.title, currentSong.artist, duration, currentSong.videoId)
      .then((data) => {
        if (!isMounted) return;
        const lines = data.lines || [];
        setLyrics(lines);
        const hasTimestamps = lines.some((l, idx) => idx > 0 && l.startTimeMs > 0);
        setIsSynced(!!data.synced && hasTimestamps);
        setLyricsSource(data.source || 'LRCLIB');
        setIsLyricsLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to load lyrics in MainLyricsView', err);
        if (isMounted) setIsLyricsLoading(false);
      });

    return () => {
      isMounted = false;
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    };
  }, [currentSong?.videoId, currentSong?.title, currentSong?.artist, duration]);

  const scrollToLyricIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (index < 0 || !containerRef.current) return;
    const lineEl = document.getElementById(`main-lyric-line-${index}`);
    const container = containerRef.current;
    if (lineEl && container) {
      const lineRect = lineEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const currentScrollTop = container.scrollTop;
      const lineRelativeTop = lineRect.top - containerRect.top;
      const targetScrollTop =
        currentScrollTop + lineRelativeTop - container.clientHeight / 2 + lineRect.height / 2;
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior,
      });
    }
  }, []);

  // Track active lyric based on currentTime
  useEffect(() => {
    if (!lyrics.length || !isSynced) return;
    const currentMs = currentTime * 1000;
    const idx = lyrics.findIndex(
      (line, i) =>
        currentMs >= line.startTimeMs &&
        (i === lyrics.length - 1 || currentMs < lyrics[i + 1].startTimeMs)
    );

    if (idx !== activeLyricIndex) {
      setActiveLyricIndex(idx);
      if (idx !== -1 && !isUserScrolling) {
        scrollToLyricIndex(idx, 'smooth');
      }
    }
  }, [currentTime, lyrics, activeLyricIndex, isSynced, isUserScrolling, scrollToLyricIndex]);

  const handleUserInteraction = () => {
    setIsUserScrolling(true);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 4000);
  };

  const handleLyricClick = (line: LyricLine, idx: number) => {
    if (line.startTimeMs >= 0) {
      seek(line.startTimeMs / 1000);
      setActiveLyricIndex(idx);
      setIsUserScrolling(false);
      scrollToLyricIndex(idx, 'smooth');
    }
  };

  const retryFetch = () => {
    if (!currentSong) return;
    setIsLyricsLoading(true);
    lyricsService
      .getLyrics(currentSong.title, currentSong.artist, duration, currentSong.videoId)
      .then((data) => {
        const lines = data.lines || [];
        setLyrics(lines);
        const hasTimestamps = lines.some((l, idx) => idx > 0 && l.startTimeMs > 0);
        setIsSynced(!!data.synced && hasTimestamps);
        setLyricsSource(data.source || 'LRCLIB');
        setIsLyricsLoading(false);
      })
      .catch(() => setIsLyricsLoading(false));
  };

  if (!currentSong) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-white/50">
        <Music2 className="w-12 h-12 mb-3 text-white/30" />
        <p className="text-base font-semibold">No song currently playing</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col relative px-4 md:px-8 lg:px-12 pt-1 pb-16 overflow-hidden select-none">
      {/* Fitted Status Row: Synced Badge + Hint + Reload */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-xs shrink-0 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2">
          {isSynced ? (
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/30">
              <Sparkles className="w-3 h-3" />
              Real-Time Synced
            </span>
          ) : lyrics.length > 0 ? (
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">
              {lyricsSource === 'MUSIXMATCH' ? 'Official' : lyricsSource || 'Plain Text'}
            </span>
          ) : null}
          <span className="text-white/30 hidden sm:inline">•</span>
          <span className="text-white/50 text-xs truncate hidden sm:inline">Click any line to jump to that moment</span>
        </div>

        <button
          onClick={retryFetch}
          disabled={isLyricsLoading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 text-[11px] font-medium text-white/60 hover:text-white transition-colors cursor-pointer border border-white/10"
          title="Refresh Lyrics"
        >
          <RotateCw className={`w-3 h-3 ${isLyricsLoading ? 'animate-spin' : ''}`} />
          <span>Reload</span>
        </button>
      </div>

      {/* Lyrics Body */}
      {isLyricsLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/60 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-accent-red animate-spin" />
          <span className="text-sm font-semibold tracking-wider uppercase text-white/50">
            Finding Synchronized Lyrics...
          </span>
        </div>
      ) : lyrics.length > 0 ? (
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          <div
            ref={containerRef}
            onScroll={handleUserInteraction}
            onWheel={handleUserInteraction}
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
            }}
            className="flex-1 overflow-y-auto scrollbar-none flex flex-col gap-6 sm:gap-7 py-12 px-4 scroll-smooth max-w-4xl mx-auto w-full"
          >
            {/* Instrumental Intro indicator */}
            {isSynced && lyrics[0]?.startTimeMs > 4000 && currentTime * 1000 < lyrics[0].startTimeMs && (
              <div className="text-sm font-bold text-white/40 tracking-widest uppercase text-center py-8 animate-pulse flex items-center justify-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-red animate-ping" />
                ••• Instrumental Intro •••
              </div>
            )}

            {lyrics.map((line, idx) => {
              const isActive = isSynced && idx === activeLyricIndex;
              const isPassed = isSynced && activeLyricIndex > -1 && idx < activeLyricIndex;

              return (
                <p
                  id={`main-lyric-line-${idx}`}
                  key={idx}
                  onClick={() => handleLyricClick(line, idx)}
                  className={`text-2xl sm:text-3xl md:text-4xl font-extrabold cursor-pointer transition-all duration-300 leading-snug tracking-tight select-none ${
                    isActive
                      ? 'text-white scale-[1.03] origin-left drop-shadow-[0_0_32px_rgba(255,255,255,0.85)] py-2'
                      : isPassed
                      ? 'text-white/35 hover:text-white/70 py-1'
                      : isSynced
                      ? 'text-white/20 hover:text-white/60 py-1'
                      : 'text-white/80 hover:text-white py-1'
                  }`}
                >
                  {line.words}
                </p>
              );
            })}
          </div>

          {/* Floating Re-Sync Button */}
          {isUserScrolling && activeLyricIndex >= 0 && (
            <button
              onClick={() => {
                setIsUserScrolling(false);
                scrollToLyricIndex(activeLyricIndex, 'smooth');
              }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-2xl border border-white/25 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
              <span>Sync with Song</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-white/40 text-sm gap-4">
          <Music2 className="w-12 h-12 opacity-30 text-white" />
          <span className="text-center font-medium max-w-sm text-base text-white/60">
            No lyrics found for &quot;{currentSong.title}&quot;.
          </span>
          <button
            onClick={retryFetch}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/20 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Search</span>
          </button>
        </div>
      )}
    </div>
  );
};
