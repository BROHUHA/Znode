import React, { useState, useEffect } from 'react';
import { Song } from '../../types';
import { usePlayerStore } from '../../stores/playerStore';
import { innertubeService } from '../../services/innertube';
import { jioSaavnService } from '../../services/jiosaavn';
import {
  ListMusic,
  Repeat,
  Shuffle,
  Trash2,
  GripVertical,
  X,
  RotateCw,
  Plus,
  Check,
  Play,
} from 'lucide-react';

interface MainQueueViewProps {
  onClose?: () => void;
}

export const MainQueueView: React.FC<MainQueueViewProps> = () => {
  const {
    currentSong,
    queue,
    queueIndex,
    playSong,
    moveQueueItem,
    removeFromQueue,
    clearQueue,
    shuffleQueue,
    addToQueue,
    addMultipleToQueue,
    repeatMode,
    setPlaybackMode,
    refreshRelatedQueue,
    queueSubTab,
  } = usePlayerStore();

  const [relatedSongs, setRelatedSongs] = useState<Song[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState<Record<string, boolean>>({});
  const [addedAllFeedback, setAddedAllFeedback] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!currentSong?.videoId) {
      setRelatedSongs([]);
      return;
    }

    let isMounted = true;
    setIsLoadingRelated(true);

    const loadRelated = async () => {
      try {
        const songs = await innertubeService.getNext(currentSong.videoId);
        let list = (songs || []).filter((s) => s.videoId !== currentSong.videoId);

        if (list.length < 6) {
          try {
            const saavnList = await jioSaavnService.search(currentSong.artist || currentSong.title);
            if (saavnList?.length) {
              const saavnSongs: Song[] = saavnList
                .filter((r) => r.id !== currentSong.videoId && !list.some((s) => s.title.toLowerCase() === r.title.toLowerCase()))
                .map((r) => ({
                  videoId: r.id,
                  title: r.title,
                  artist: r.artist,
                  thumbnailUrl: r.image || '/logo.svg',
                  fromAutoplay: true,
                }));
              list = [...list, ...saavnSongs].slice(0, 25);
            }
          } catch (err) {
            console.warn('Saavn related fallback failed', err);
          }
        }

        if (isMounted) {
          setRelatedSongs(list);
          setIsLoadingRelated(false);
        }
      } catch (e) {
        console.warn('Failed to load related songs', e);
        if (isMounted) setIsLoadingRelated(false);
      }
    };

    loadRelated();

    return () => {
      isMounted = false;
    };
  }, [currentSong?.videoId, currentSong?.title, currentSong?.artist]);

  const handleAddRelatedToQueue = (song: Song) => {
    addToQueue(song);
    setAddedFeedback((prev) => ({ ...prev, [song.videoId]: true }));
    setTimeout(() => {
      setAddedFeedback((prev) => ({ ...prev, [song.videoId]: false }));
    }, 1500);
  };

  const handleAddAllRelated = () => {
    if (relatedSongs.length === 0) return;
    addMultipleToQueue(relatedSongs);
    setAddedAllFeedback(true);
    setTimeout(() => {
      setAddedAllFeedback(false);
    }, 2000);
  };

  const handleRefreshRelated = async () => {
    if (!currentSong || isLoadingRelated) return;
    setIsLoadingRelated(true);
    await refreshRelatedQueue();
    const fresh = usePlayerStore.getState().queue.filter((s) => s.videoId !== currentSong.videoId && s.fromAutoplay);
    if (fresh.length > 0) {
      setRelatedSongs(fresh);
    }
    setIsLoadingRelated(false);
  };

  if (!currentSong) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-white/50">
        <ListMusic className="w-12 h-12 mb-3 text-white/30" />
        <p className="text-base font-semibold">No active queue</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full px-3 sm:px-6 pt-1 pb-6 select-none">
      {/* SUB-TAB 1: Up Next Queue */}
      {queueSubTab === 'QUEUE' && (
        <div className="flex flex-col w-full">
          {/* Controls Bar (scrolls naturally under AppShell's top-fade-blur like Listen Now) */}
          <div className="flex items-center justify-between px-2 py-2.5 text-xs text-white/70">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-white/80">
                {queue.length > 1 ? `${queue.length} songs in queue` : '1 song playing'}
              </span>
              <button
                onClick={() => {
                  setPlaybackMode(repeatMode === 'ALL' ? 'CONTINUE' : 'REPEAT_ALL');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer active:scale-95 border ${
                  repeatMode === 'ALL'
                    ? 'bg-accent-red text-white border-accent-red shadow-sm'
                    : 'bg-white/10 hover:bg-white/15 text-white/80 hover:text-white border-white/15'
                }`}
              >
                <Repeat className="w-3 h-3" />
                <span>{repeatMode === 'ALL' ? 'Queue Mode: On' : 'Queue Mode: Off'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {queue.length > 1 && (
                <button
                  onClick={shuffleQueue}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/85 hover:text-white text-xs font-semibold transition-all cursor-pointer active:scale-95 border border-white/10"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Shuffle</span>
                </button>
              )}
              {queue.length > 1 && (
                <button
                  onClick={clearQueue}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 hover:text-accent-red text-xs font-semibold transition-all cursor-pointer active:scale-95 border border-white/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Queue Items List */}
          <div className="flex flex-col gap-1.5 py-1">
            {queue.map((item, idx) => {
              const isCurrent = idx === queueIndex;
              const isDragging = draggedIdx === idx;
              const isDragOver = dragOverIdx === idx && draggedIdx !== null && draggedIdx !== idx;
              return (
                <div
                  key={`${item.videoId}-${idx}`}
                  data-queue-idx={idx}
                  draggable={!isCurrent}
                  onDragStart={(e) => {
                    if (isCurrent) {
                      e.preventDefault();
                      return;
                    }
                    setDraggedIdx(idx);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(idx));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverIdx !== idx) {
                      setDragOverIdx(idx);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedIdx !== null && draggedIdx !== idx) {
                      moveQueueItem(draggedIdx, idx);
                    }
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all duration-150 group ${
                    isDragging
                      ? 'opacity-40 scale-[0.98] bg-white/10 border border-white/25'
                      : isDragOver
                      ? 'bg-white/[0.12] border border-accent-red/60 shadow-[0_0_16px_rgba(250,45,72,0.2)]'
                      : isCurrent
                      ? 'bg-white/[0.14] border border-white/25 text-white font-semibold shadow-xl'
                      : 'hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] text-white/75'
                  }`}
                >
                  <div
                    onClick={() => playSong(item)}
                    className="flex items-center gap-3.5 overflow-hidden flex-1 cursor-pointer min-w-0"
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10">
                      <img
                        src={
                          item.thumbnailUrl ||
                          (item.videoId ? `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg` : '/logo.svg')
                        }
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = '/logo.svg';
                        }}
                        className="w-full h-full object-cover"
                      />
                      {isCurrent ? (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-accent-red animate-ping" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                        </div>
                      )}
                    </div>

                    <div className="overflow-hidden flex-1 min-w-0">
                      <p className="text-sm sm:text-[15px] truncate leading-tight font-medium">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 overflow-hidden">
                        {item.isExplicit && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-white/20 text-white/90 uppercase tracking-wider shrink-0">
                            E
                          </span>
                        )}
                        <p className="text-xs text-white/50 truncate">{item.artist}</p>
                        {item.durationText && (
                          <>
                            <span className="text-white/30 text-[10px] shrink-0">•</span>
                            <span className="text-xs text-white/40 shrink-0 font-mono">
                              {item.durationText}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Drag Handle & Remove controls */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {isCurrent ? (
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-accent-red/25 text-accent-red border border-accent-red/40">
                        Playing
                      </span>
                    ) : (
                      <>
                        <div
                          onTouchStart={() => setDraggedIdx(idx)}
                          onTouchMove={(e) => {
                            const touch = e.touches[0];
                            if (!touch) return;
                            const el = document.elementFromPoint(touch.clientX, touch.clientY);
                            const row = el?.closest('[data-queue-idx]');
                            const targetIdx = row ? parseInt(row.getAttribute('data-queue-idx') || '', 10) : NaN;
                            if (!isNaN(targetIdx)) {
                              setDragOverIdx(targetIdx);
                            }
                          }}
                          onTouchEnd={() => {
                            if (draggedIdx !== null && dragOverIdx !== null && draggedIdx !== dragOverIdx) {
                              moveQueueItem(draggedIdx, dragOverIdx);
                            }
                            setDraggedIdx(null);
                            setDragOverIdx(null);
                          }}
                          className="p-1.5 rounded-lg text-white/35 hover:text-white/80 hover:bg-white/10 cursor-grab active:cursor-grabbing touch-none transition-colors"
                          title="Drag to reorder"
                          aria-label="Drag to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <button
                          onClick={() => removeFromQueue(idx)}
                          className="p-1.5 rounded-lg hover:bg-white/15 text-white/40 hover:text-accent-red transition-all cursor-pointer"
                          title="Remove from Queue"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Related Tracks */}
      {queueSubTab === 'RELATED' && (
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between px-2 py-2.5 text-xs text-white/70">
            <span className="truncate">
              Recommended songs based on <strong className="text-white">{currentSong.title}</strong>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRefreshRelated}
                disabled={isLoadingRelated}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 border border-white/10"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoadingRelated ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              {relatedSongs.length > 0 && (
                <button
                  onClick={handleAddAllRelated}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    addedAllFeedback
                      ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                      : 'bg-accent-red hover:bg-accent-red/90 text-white shadow-md'
                  }`}
                >
                  {addedAllFeedback ? 'Added All!' : 'Add All to Queue'}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 py-1">
            {relatedSongs.map((song) => {
              const isAdded = addedFeedback[song.videoId];
              return (
                <div
                  key={song.videoId}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-all group"
                >
                  <div
                    onClick={() => playSong(song)}
                    className="flex items-center gap-3.5 overflow-hidden flex-1 cursor-pointer min-w-0"
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10">
                      <img
                        src={
                          song.thumbnailUrl ||
                          (song.videoId ? `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg` : '/logo.svg')
                        }
                        alt={song.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                      </div>
                    </div>
                    <div className="overflow-hidden flex-1 min-w-0">
                      <p className="text-sm sm:text-[15px] truncate font-medium text-white/90 group-hover:text-white">
                        {song.title}
                      </p>
                      <p className="text-xs text-white/50 truncate mt-0.5">{song.artist}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddRelatedToQueue(song)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ml-3 ${
                      isAdded
                        ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
