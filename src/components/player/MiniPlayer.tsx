import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipForward, Heart, Music2 } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { Song } from '../../types';

interface MiniPlayerProps {
  isInline?: boolean;
  className?: string;
}

function getInitialThumb(song: Song | null): string {
  if (!song) return '/logo.svg';
  if (song.thumbnailUrl && song.thumbnailUrl !== '/logo.svg') {
    if (song.thumbnailUrl.includes('maxresdefault.jpg')) {
      return song.thumbnailUrl.replace('maxresdefault.jpg', 'hqdefault.jpg');
    }
    return song.thumbnailUrl;
  }
  if (song.videoId) {
    return `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`;
  }
  return '/logo.svg';
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ isInline = false, className = '' }) => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    next,
    prev,
    seek,
    likeStatuses,
    toggleLike,
    setNowPlayingOpen,
    currentPalette,
  } = usePlayerStore();

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [thumbSrc, setThumbSrc] = useState<string>(() => getInitialThumb(currentSong));
  const [isImgBroken, setIsImgBroken] = useState(false);

  useEffect(() => {
    setIsImgBroken(false);
    setThumbSrc(getInitialThumb(currentSong));
  }, [currentSong?.videoId, currentSong?.thumbnailUrl]);

  if (!currentSong) return null;

  const isLiked = likeStatuses[currentSong.videoId] === 'LIKE';
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const accentColor = currentPalette?.dominant || '#FA2D48';

  const handleThumbnailError = () => {
    if (!currentSong) {
      setIsImgBroken(true);
      return;
    }
    if (thumbSrc.includes('maxresdefault.jpg') || thumbSrc.includes('hq720.jpg')) {
      setThumbSrc(`https://i.ytimg.com/vi/${currentSong.videoId}/hqdefault.jpg`);
      return;
    }
    if (currentSong.videoId && !thumbSrc.includes(`vi/${currentSong.videoId}/hqdefault.jpg`)) {
      setThumbSrc(`https://i.ytimg.com/vi/${currentSong.videoId}/hqdefault.jpg`);
      return;
    }
    if (currentSong.videoId && !thumbSrc.includes(`vi/${currentSong.videoId}/mqdefault.jpg`)) {
      setThumbSrc(`https://i.ytimg.com/vi/${currentSong.videoId}/mqdefault.jpg`);
      return;
    }
    if (currentSong.thumbnailUrl && !thumbSrc.startsWith('/api/avatar')) {
      setThumbSrc(`/api/avatar?url=${encodeURIComponent(currentSong.thumbnailUrl)}`);
      return;
    }
    setIsImgBroken(true);
    setThumbSrc('/logo.svg');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isInline) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isInline || touchStartX.current === null) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    setOffsetX(Math.max(-50, Math.min(50, diffX * 0.45)));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isInline || touchStartX.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - (touchStartY.current || 0);

    if (Math.abs(diffX) > 38 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        next();
      } else {
        prev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    setOffsetX(0);
  };

  // Unified Single-Pill Layout: smoothly morphs artwork, artist line, and controls between Expanded & Inline without unmounting
  return (
    <div
      onClick={() => setNowPlayingOpen(true)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: offsetX !== 0 ? `translateX(${offsetX}px)` : undefined,
        transition: offsetX === 0 ? 'transform 0.38s cubic-bezier(0.34, 1.45, 0.64, 1)' : 'none',
      }}
      className={`relative w-full h-14 rounded-full liquid-glass-surface px-3 flex items-center justify-between cursor-pointer group active:scale-[1.03] transition-transform duration-200 ease-[cubic-bezier(0.34,1.45,0.64,1)] overflow-hidden ${className}`}
    >
      {/* Flush curved bottom seekbar */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          seek(ratio * duration);
        }}
        className="absolute bottom-0 inset-x-0 h-3 flex items-end cursor-pointer z-20 group/seek"
        title="Seek"
      >
        <div className="w-full h-[2.5px] group-hover/seek:h-[3.5px] bg-white/15 transition-all duration-150 overflow-hidden">
          <div
            className="h-full transition-[width] duration-200 ease-linear relative"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${accentColor} 0%, #FA2D48 85%, #ffffff 100%)`,
              boxShadow: `0 0 8px ${accentColor}99`,
            }}
          />
        </div>
      </div>

      {/* Ambient Palette Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 transition-opacity duration-700"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 30% 50%, ${accentColor} 0%, transparent 75%)`,
        }}
      />

      {/* Left Section: Artwork (40px -> 34px) + Title & Artist + EQ Waveform */}
      <div className="flex items-center min-w-0 flex-1 mr-2 relative z-10">
        <div
          className={`relative rounded-lg overflow-hidden shrink-0 shadow-md bg-white/10 border border-white/15 group-hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex items-center justify-center ${
            isInline ? 'w-[34px] h-[34px]' : 'w-10 h-10'
          }`}
        >
          {!isImgBroken ? (
            <img
              key={`thumb-expanded-${currentSong?.videoId || thumbSrc}`}
              src={thumbSrc}
              alt={currentSong.title}
              referrerPolicy="no-referrer"
              onError={handleThumbnailError}
              className="w-full h-full object-cover animate-artwork-fade"
              loading="eager"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white/70"
              style={{ backgroundColor: `${accentColor}33` }}
            >
              <Music2 className="w-5 h-5 text-accent-red" />
            </div>
          )}
        </div>

        <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${isInline ? 'ml-2.5' : 'ml-3'}`}>
          <div className="flex items-center gap-1.5">
            <h4
              className={`font-bold text-white truncate leading-tight tracking-tight drop-shadow-sm group-hover:text-accent-red transition-colors ${
                isInline ? 'text-[12.5px]' : 'text-[13.5px] sm:text-sm'
              }`}
            >
              {currentSong.title}
            </h4>

            {/* Live Equalizer Waveform Animation */}
            <div
              className="flex items-end justify-center gap-[2.5px] h-4 shrink-0 ml-1.5 pb-0.5"
              title={isPlaying ? 'Playing' : 'Paused'}
            >
              <div
                className={`w-[2.5px] rounded-full transition-all duration-300 ${
                  isPlaying ? 'playing-eq-bar-1' : 'h-1.5 opacity-50'
                }`}
                style={{ backgroundColor: accentColor }}
              />
              <div
                className={`w-[2.5px] rounded-full transition-all duration-300 ${
                  isPlaying ? 'playing-eq-bar-2' : 'h-3 opacity-50'
                }`}
                style={{ backgroundColor: accentColor }}
              />
              <div
                className={`w-[2.5px] rounded-full transition-all duration-300 ${
                  isPlaying ? 'playing-eq-bar-3' : 'h-2 opacity-50'
                }`}
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </div>

          <p
            className={`text-[11.5px] text-white/65 truncate leading-tight tracking-tight font-medium transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${
              isInline ? 'max-h-0 opacity-0 mt-0' : 'max-h-5 opacity-100 mt-0.5'
            }`}
          >
            {currentSong.artist}
          </p>
        </div>
      </div>

      {/* Right Controls: Like (collapses in inline), Play/Pause, Next (collapses in inline) */}
      <div
        className="flex items-center gap-1 shrink-0 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => toggleLike(currentSong.videoId)}
          className={`h-9 rounded-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-80 hover:bg-white/10 ${
            isInline ? 'w-0 opacity-0 scale-75 overflow-hidden pointer-events-none' : 'w-9 opacity-100 scale-100'
          } ${isLiked ? 'text-accent-red fill-accent-red animate-like' : 'text-white/60 hover:text-white'}`}
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart className={`w-[18px] h-[18px] ${isLiked ? 'fill-accent-red text-accent-red' : ''}`} />
        </button>

        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full liquid-glass-circle flex items-center justify-center text-white active:scale-90 hover:scale-105 transition-all cursor-pointer shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white ml-0.5" />
          )}
        </button>

        <button
          onClick={next}
          className={`h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-85 ${
            isInline ? 'w-0 opacity-0 scale-75 overflow-hidden pointer-events-none' : 'w-9 opacity-100 scale-100'
          }`}
          aria-label="Next track"
        >
          <SkipForward className="w-[18px] h-[18px] fill-current" />
        </button>
      </div>
    </div>
  );
};
