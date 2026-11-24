/**
 * Znode Music Web - Core Audio Engine
 * High-fidelity hybrid engine providing:
 * - Direct YouTube Audio Stream Engine (100% reliable for all YouTube Music tracks)
 * - HTML5 Web Audio API Graph (10-Band EQ, Tone Pad, Crossfade)
 * - MediaSession API integration (OS lockscreen / media keys)
 */

import { Song, EqualizerPreset } from '../types';

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: EqualizerPreset[] = [
  { name: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Boost', gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Reducer', gains: [-6, -5, -4, -2, 0, 0, 0, 0, 0, 0] },
  { name: 'Treble Boost', gains: [0, 0, 0, 0, 0, 1, 2, 4, 5, 6] },
  { name: 'Treble Reducer', gains: [0, 0, 0, 0, 0, -1, -2, -4, -5, -6] },
  { name: 'Vocal Boost', gains: [-2, -2, 0, 3, 5, 4, 3, 1, 0, -2] },
  { name: 'Electronic', gains: [5, 4, 2, 0, -2, 2, 1, 3, 4, 5] },
  { name: 'Rock', gains: [4, 3, -1, -2, 1, 2, 3, 4, 4, 4] },
  { name: 'Pop', gains: [-1, 1, 3, 4, 3, 1, -1, -1, 1, 2] },
  { name: 'Acoustic', gains: [3, 2, 1, 1, 2, 2, 3, 3, 2, 1] },
];

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

export class AudioEngine {
  private mode: 'YOUTUBE' | 'HTML5' | 'DIRECT' = 'HTML5';

  // HTML5 Web Audio API components (Dual-Deck for seamless crossfade blending)
  private ctx: AudioContext | null = null;
  private decks: [HTMLAudioElement, HTMLAudioElement];
  private directAudio: HTMLAudioElement;
  private activeDeckIndex: 0 | 1 = 0;
  private deckSourceNodes: [MediaElementAudioSourceNode | null, MediaElementAudioSourceNode | null] = [null, null];
  private deckGainNodes: [GainNode | null, GainNode | null] = [null, null];
  private gainNode: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private toneLowShelf: BiquadFilterNode | null = null;
  private toneHighShelf: BiquadFilterNode | null = null;
  private toneMidPeak: BiquadFilterNode | null = null;
  private crossfadeDuration: number = 4;
  private repeatOne: boolean = false;
  private hasTriggeredCrossfade: boolean = false;
  private hasStartedYtFadeOut: boolean = false;
  private isCrossfadingOut: boolean = false;
  private fadeOutTimer: any = null;
  private fadeOutDeckIndex: 0 | 1 | null = null;
  private ytFadeOutTimer: any = null;
  private playGeneration: number = 0;
  private isLoadingNewVideo: boolean = false;
  private intendedPlaying: boolean = false;
  private lastMediaPosUpdate: number = 0;

  private get audio(): HTMLAudioElement {
    return this.decks[this.activeDeckIndex];
  }

  // Stored DSP Settings for real-time Web Audio API execution
  private currentEqGains: number[] = new Array(10).fill(0);
  private currentToneX: number = 0;
  private currentToneY: number = 0;
  private currentVolume: number = 0.8;

  // YouTube Audio Player components
  private ytPlayer: any = null;
  private ytReady: boolean = false;
  private ytTicker: any = null;
  private ytPendingVideoId: string | null = null;
  private ytPendingStartTime: number = 0;
  private currentPlayingVideoId: string | null = null;
  private isAdMuted: boolean = false;

  // HTML5 Stall Detection: auto-recover to YouTube when CDN stream freezes
  private stallDetectorHandle: any = null;
  private lastTimeUpdateAt: number = 0;
  private lastTimeUpdateValue: number = -1;
  private stallRecoveryAttempted: boolean = false;

  // Preload & Advance Download Engine for Instant 0ms Fast Track Switching
  private preloadAudio: HTMLAudioElement;
  private preloadedStreamUrl: string | null = null;
  private preloadedVideoId: string | null = null;
  private preloadedReady: boolean = false;

  // Callbacks
  private onTimeUpdateCallback?: (currentTime: number, duration: number) => void;
  private onEndedCallback?: () => void;
  private onTrackLoadedCallback?: () => void;
  private onErrorCallback?: (err: any) => void;
  private onPlayStateChangeCallback?: (isPlaying: boolean) => void;
  private onCrossfadeCallback?: () => void;

  constructor() {
    const createDeck = () => {
      const el = new Audio();
      el.preload = 'auto';
      el.crossOrigin = 'anonymous'; // Essential for Web Audio API DSP pipeline
      el.playbackRate = 1.0;
      el.defaultPlaybackRate = 1.0;
      (el as any).preservesPitch = true;
      (el as any).playsInline = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
      el.setAttribute('x-webkit-airplay', 'allow');
      return el;
    };

    this.decks = [createDeck(), createDeck()];

    // Non-CORS HTML5 audio element for direct googlevideo.com streams (enables mobile background playback)
    this.directAudio = new Audio();
    this.directAudio.preload = 'auto';
    this.directAudio.playbackRate = 1.0;
    this.directAudio.defaultPlaybackRate = 1.0;
    (this.directAudio as any).preservesPitch = true;
    (this.directAudio as any).playsInline = true;
    this.directAudio.setAttribute('playsinline', '');
    this.directAudio.setAttribute('webkit-playsinline', '');
    this.directAudio.setAttribute('x-webkit-airplay', 'allow');

    this.preloadAudio = new Audio();
    this.preloadAudio.preload = 'auto';
    this.preloadAudio.crossOrigin = 'anonymous';
    this.preloadAudio.volume = 0; // Kept silent during advance buffering
    this.preloadAudio.playbackRate = 1.0;
    this.preloadAudio.defaultPlaybackRate = 1.0;
    (this.preloadAudio as any).preservesPitch = true;
    (this.preloadAudio as any).playsInline = true;
    this.preloadAudio.setAttribute('playsinline', '');
    this.preloadAudio.setAttribute('webkit-playsinline', '');

    this.preloadAudio.addEventListener('canplaythrough', () => {
      this.preloadedReady = true;
    });
    this.preloadAudio.addEventListener('loadeddata', () => {
      this.preloadedReady = true;
    });

    try {
      const savedVol = typeof localStorage !== 'undefined'
        ? (localStorage.getItem('znode_volume') || localStorage.getItem('yz_volume'))
        : null;
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.currentVolume = parsed;
        }
      }
    } catch {}
    this.decks[0].volume = this.currentVolume;
    this.decks[1].volume = this.currentVolume;
    this.directAudio.volume = this.currentVolume;

    this.setupHtml5Listeners(0);
    this.setupHtml5Listeners(1);
    this.setupDirectListeners();
    this.setupBackgroundAudioKeepAlive();
    this.loadYouTubeIframeAPI();
  }

  private setupDirectListeners() {
    this.directAudio.addEventListener('timeupdate', () => {
      if (this.mode !== 'DIRECT') return;
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.directAudio.currentTime, this.directAudio.duration || 0);
      }
    });
    this.directAudio.addEventListener('play', () => {
      if (this.mode === 'DIRECT' && this.onPlayStateChangeCallback) {
        this.onPlayStateChangeCallback(true);
      }
    });
    this.directAudio.addEventListener('pause', () => {
      if (this.mode === 'DIRECT' && this.onPlayStateChangeCallback) {
        this.onPlayStateChangeCallback(false);
      }
    });
    this.directAudio.addEventListener('ended', () => {
      if (this.mode === 'DIRECT' && this.onEndedCallback) {
        this.onEndedCallback();
      }
    });
    this.directAudio.addEventListener('loadedmetadata', () => {
      if (this.mode === 'DIRECT' && this.onTrackLoadedCallback) {
        this.onTrackLoadedCallback();
      }
    });
    this.directAudio.addEventListener('error', () => {
      if (this.mode === 'DIRECT' && this.currentPlayingVideoId) {
        this.playVideo(this.currentPlayingVideoId, 0).catch(console.error);
      }
    });
  }

  private setupBackgroundAudioKeepAlive() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const keepAlive = () => {
      if (!this.intendedPlaying) return;
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'playing';
        } catch {}
      }
      if (this.mode === 'YOUTUBE') {
        if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
          try {
            if (typeof this.ytPlayer.getPlayerState === 'function' && this.ytPlayer.getPlayerState() !== 1) {
              this.ytPlayer.playVideo();
            }
          } catch {}
        }
        return;
      }
      if (this.mode === 'DIRECT') {
        if (this.directAudio.paused && this.directAudio.src) {
          this.directAudio.play().catch(() => {});
        }
        return;
      }
      if (this.ctx && this.ctx.state !== 'running') {
        this.ctx.resume().catch(() => {});
      }
      if (this.audio.paused && this.audio.src) {
        this.audio.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', keepAlive);
    window.addEventListener('pageshow', keepAlive);
    window.addEventListener('focus', keepAlive);
  }

  // ---- YouTube Player Integration ----

  private loadYouTubeIframeAPI() {
    if (typeof window === 'undefined') return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousOnReady) previousOnReady();
      this.initYouTubePlayer();
    };

    // Polling fallback to guarantee initialization even if onYouTubeIframeAPIReady fired early
    const checkYT = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkYT);
        this.initYouTubePlayer();
      }
    }, 50);

    // Timeout poll after 10 seconds
    setTimeout(() => clearInterval(checkYT), 10000);
  }

  private initYouTubePlayer() {
    // Allow re-creation if ytPlayer was constructed but onReady never fired
    if (this.ytReady || !window.YT || !window.YT.Player) return;

    // If a previous player object exists but never became ready, destroy it first
    if (this.ytPlayer && !this.ytReady) {
      try {
        if (typeof this.ytPlayer.destroy === 'function') {
          this.ytPlayer.destroy();
        }
      } catch {}
      this.ytPlayer = null;

      // Re-create the container div since YT.Player replaces it with an iframe
      const existing = document.getElementById('yt-audio-player');
      if (!existing) {
        const parent = document.querySelector('.yt-audio-container') || document.body;
        const div = document.createElement('div');
        div.id = 'yt-audio-player';
        parent.appendChild(div);
      }
    }

    const container = document.getElementById('yt-audio-player');
    if (!container) return;

    try {
      this.ytPlayer = new window.YT.Player('yt-audio-player', {
        height: '250',
        width: '250',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          iv_load_policy: 3,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            this.ytReady = true;
            try {
              this.ytPlayer.unMute();
              this.ytPlayer.setVolume(Math.round(this.currentVolume * 100));
            } catch (e) {
              console.warn('Volume init', e);
            }
            if (this.ytPendingVideoId) {
              const pendingId = this.ytPendingVideoId;
              const pendingStart = this.ytPendingStartTime;
              this.ytPendingVideoId = null;
              this.ytPendingStartTime = 0;
              this.playVideo(pendingId, pendingStart);
            }
          },
          onStateChange: (event: any) => {
            // Immediately inspect and suppress any ads on state change
            this.checkAndSkipAds();

            // YT.PlayerState: PLAYING = 1, ENDED = 0, PAUSED = 2, BUFFERING = 3
            if (event.data === 1) {
              this.isLoadingNewVideo = false;
              if (!this.isAdMuted) {
                try {
                  // Strictly enforce 1.0x normal speed (prevents persistent 2x speed)
                  if (typeof this.ytPlayer.getPlaybackRate === 'function' && this.ytPlayer.getPlaybackRate() !== 1) {
                    this.ytPlayer.setPlaybackRate(1);
                  }
                  if (!this.isCrossfadingOut && !this.ytFadeOutTimer) {
                    this.ytPlayer.setVolume(Math.round(this.currentVolume * 100));
                  }
                } catch {}
                if (this.onPlayStateChangeCallback) this.onPlayStateChangeCallback(true);
                if (this.onTrackLoadedCallback) this.onTrackLoadedCallback();
              }
              this.startTicker();
            } else if (event.data === 0) {
              this.stopTicker();
              if (this.isLoadingNewVideo || this.hasTriggeredCrossfade) {
                return;
              }
              if (this.onPlayStateChangeCallback) this.onPlayStateChangeCallback(false);
              if (this.onEndedCallback) this.onEndedCallback();
            } else if (event.data === 2) {
              this.stopTicker();
              if (
                this.intendedPlaying &&
                this.mode === 'YOUTUBE' &&
                !this.isLoadingNewVideo &&
                !this.ytFadeOutTimer &&
                typeof document !== 'undefined' &&
                document.visibilityState === 'hidden'
              ) {
                setTimeout(() => {
                  if (
                    this.intendedPlaying &&
                    this.mode === 'YOUTUBE' &&
                    this.ytPlayer &&
                    typeof this.ytPlayer.playVideo === 'function'
                  ) {
                    try {
                      this.ytPlayer.playVideo();
                    } catch {}
                  }
                }, 60);
                return;
              }
              if (!this.isLoadingNewVideo && !this.ytFadeOutTimer && this.mode === 'YOUTUBE') {
                if (this.onPlayStateChangeCallback) this.onPlayStateChangeCallback(false);
              }
            }
          },
          onError: (err: any) => {
            const code = err?.data;
            console.warn('YouTube Player error code:', code, err);
            // Error codes: 2=invalid param, 5=HTML5 error, 100=not found, 101/150=restricted embed
            // Always fire the error callback so playerStore can handle recovery
            if (this.onErrorCallback) this.onErrorCallback(err);
          },
        },
      });
    } catch (e) {
      console.error('Failed to create YouTube Player instance', e);
    }
  }

  public async playVideo(videoId: string, startTime: number = 0, fromCrossfade: boolean = false): Promise<void> {
    const gen = ++this.playGeneration;
    this.intendedPlaying = true;
    this.mode = 'YOUTUBE';
    this.currentPlayingVideoId = videoId;
    this.isAdMuted = false;
    this.hasTriggeredCrossfade = false;
    this.hasStartedYtFadeOut = false;
    this.isCrossfadingOut = false;
    this.isLoadingNewVideo = true;
    this.stopStallDetector();

    if (!fromCrossfade) {
      this.cancelCrossfade();
    } else {
      // Stop any previous YT fade-out timer since we are reusing the single YT player
      if (this.ytFadeOutTimer) {
        clearInterval(this.ytFadeOutTimer);
        this.ytFadeOutTimer = null;
      }
      // Pause any non-fading HTML5 deck, but let an actively fading-out HTML5 deck finish blending
      const otherDeck = this.activeDeckIndex === 0 ? 1 : 0;
      if (this.fadeOutDeckIndex !== this.activeDeckIndex) {
        this.decks[this.activeDeckIndex].pause();
        this.decks[this.activeDeckIndex].removeAttribute('src');
      }
      if (this.fadeOutDeckIndex !== otherDeck) {
        this.decks[otherDeck].pause();
        this.decks[otherDeck].removeAttribute('src');
      }
    }

    if (!this.ytReady || !this.ytPlayer || typeof this.ytPlayer.loadVideoById !== 'function') {
      this.ytPendingVideoId = videoId;
      this.ytPendingStartTime = startTime;

      // If YT player isn't ready yet, try to init it and wait up to 8s
      this.initYouTubePlayer();
      await new Promise<void>((resolve) => {
        let waited = 0;
        const check = setInterval(() => {
          if (gen !== this.playGeneration) {
            clearInterval(check);
            resolve();
            return;
          }
          waited += 100;
          if (this.ytReady && this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
            clearInterval(check);
            resolve();
          } else if (waited >= 8000) {
            clearInterval(check);
            console.warn('YouTube IFrame player not ready after 8s for', videoId);
            if (this.onErrorCallback && gen === this.playGeneration) {
              this.onErrorCallback({ data: -1, message: 'YT player init timeout' });
            }
            resolve();
          }
        }, 100);
      });
      return;
    }

    if (gen !== this.playGeneration) return;

    try {
      this.ytPlayer.unMute();
      // Always start at full target volume immediately (no fade-in)
      this.ytPlayer.setVolume(Math.round(this.currentVolume * 100));
      // Reset playback speed to 1.0x on every video load
      try {
        this.ytPlayer.setPlaybackRate?.(1);
      } catch {}
      this.ytPlayer.loadVideoById({
        videoId,
        startSeconds: startTime,
      });
      this.ytPlayer.playVideo();
    } catch (e) {
      console.warn('playVideo invocation error:', e);
    }
  }

  private startTicker() {
    this.stopTicker();
    this.ytTicker = setInterval(() => {
      // Continuous Ad Guard Check
      this.checkAndSkipAds();

      if (this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        const cur = this.ytPlayer.getCurrentTime() || 0;
        const dur = this.ytPlayer.getDuration() || 0;
        if (this.onTimeUpdateCallback && !this.isAdMuted) {
          this.onTimeUpdateCallback(cur, dur);
        }

        // Crossfade blend trigger when approaching track end (skip when Repeat One is active)
        if (!this.repeatOne && this.crossfadeDuration > 0 && dur > 10 && cur > 0 && !this.isAdMuted) {
          const remaining = dur - cur;
          if (remaining <= this.crossfadeDuration && remaining > 0.4 && !this.hasStartedYtFadeOut) {
            this.hasStartedYtFadeOut = true;
            this.startYtCrossfadeOut(Math.min(this.crossfadeDuration, remaining));
          }
          if (remaining <= Math.min(1.5, this.crossfadeDuration) && remaining > 0.3 && !this.hasTriggeredCrossfade) {
            this.hasTriggeredCrossfade = true;
            if (this.onCrossfadeCallback) {
              this.onCrossfadeCallback();
            }
          }
        }
      }
    }, 150);
  }

  /**
   * Automated Ad Skip Guard:
   * Suppresses ads instantly, seeks to finish them, and restores user audio.
   */
  private checkAndSkipAds(): void {
    if (!this.ytPlayer || typeof this.ytPlayer.getVideoData !== 'function') return;

    try {
      const videoData = this.ytPlayer.getVideoData();
      const currentId = videoData?.video_id;
      const duration = typeof this.ytPlayer.getDuration === 'function' ? this.ytPlayer.getDuration() : 0;

      // Ad Detection Criteria:
      // 1. Current video id does not match requested song video id
      // 2. Video metadata explicitly flagged as ad
      // 3. Short duration <= 35s when loaded song is different
      const isAd = Boolean(
        (currentId && this.currentPlayingVideoId && currentId !== this.currentPlayingVideoId) ||
        (videoData && (videoData as any).isAd) ||
        (duration > 0 && duration <= 35 && currentId && currentId !== this.currentPlayingVideoId)
      );

      if (isAd) {
        if (!this.isAdMuted) {
          this.isAdMuted = true;
          // Mute ad immediately to eliminate ad sound
          this.ytPlayer.mute();
        }

        // Instantly seek to duration to trigger YouTube's auto-advance past the ad
        if (duration > 0) {
          this.ytPlayer.seekTo(duration, true);
        }
      } else {
        // Song is playing normally: strictly enforce 1.0x playback rate
        try {
          if (typeof this.ytPlayer.getPlaybackRate === 'function' && this.ytPlayer.getPlaybackRate() !== 1) {
            this.ytPlayer.setPlaybackRate(1);
          }
        } catch {}

        if (this.isAdMuted) {
          this.isAdMuted = false;
          try {
            this.ytPlayer.unMute();
            this.ytPlayer.setVolume(Math.round(this.currentVolume * 100));
          } catch {}
        }
      }
    } catch {}
  }

  private stopTicker() {
    if (this.ytTicker) {
      clearInterval(this.ytTicker);
      this.ytTicker = null;
    }
  }

  // ---- HTML5 Web Audio API ----

  public initAudioContext() {
    if (this.ctx && this.deckSourceNodes[0] && this.deckSourceNodes[1]) return;
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.ctx) {
        this.ctx = new AudioCtx({ latencyHint: 'playback' });
        this.ctx.onstatechange = () => {
          if (this.ctx && this.ctx.state !== 'running' && this.intendedPlaying && this.mode === 'HTML5') {
            this.ctx.resume().catch(() => {});
          }
        };
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      if (!this.gainNode) {
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = 1.0;

        // Build 10-Band EQ Filters
        this.eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
          const filter = this.ctx!.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1.4;
          filter.gain.value = this.currentEqGains[idx] || 0;
          return filter;
        });

        // Build Tone Pad Filters
        this.toneLowShelf = this.ctx.createBiquadFilter();
        this.toneLowShelf.type = 'lowshelf';
        this.toneLowShelf.frequency.value = 250;
        this.toneLowShelf.gain.value = -this.currentToneX * 8.0;

        this.toneHighShelf = this.ctx.createBiquadFilter();
        this.toneHighShelf.type = 'highshelf';
        this.toneHighShelf.frequency.value = 4000;
        this.toneHighShelf.gain.value = this.currentToneX * 8.0;

        this.toneMidPeak = this.ctx.createBiquadFilter();
        this.toneMidPeak.type = 'peaking';
        this.toneMidPeak.frequency.value = 1000;
        this.toneMidPeak.Q.value = 1.0;
        this.toneMidPeak.gain.value = this.currentToneY * 6.0;

        let current: AudioNode = this.eqFilters[0];
        for (let i = 1; i < this.eqFilters.length; i++) {
          current.connect(this.eqFilters[i]);
          current = this.eqFilters[i];
        }

        current.connect(this.toneLowShelf);
        this.toneLowShelf.connect(this.toneHighShelf);
        this.toneHighShelf.connect(this.toneMidPeak);
        this.toneMidPeak.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);
      }

      const eqEntryNode = this.eqFilters[0] || this.gainNode;

      for (const idx of [0, 1] as const) {
        if (!this.deckGainNodes[idx]) {
          const dg = this.ctx.createGain();
          dg.gain.value = 1.0;
          dg.connect(eqEntryNode);
          this.deckGainNodes[idx] = dg;
        }
        if (!this.deckSourceNodes[idx]) {
          const src = this.ctx.createMediaElementSource(this.decks[idx]);
          src.connect(this.deckGainNodes[idx]!);
          this.deckSourceNodes[idx] = src;
        }
      }
    } catch (e) {
      console.warn('Web Audio API not fully available, falling back to direct HTML5 Audio', e);
    }
  }

  private setupHtml5Listeners(deckIndex: 0 | 1) {
    const deck = this.decks[deckIndex];

    deck.addEventListener('timeupdate', () => {
      if (this.mode === 'HTML5' && this.activeDeckIndex === deckIndex) {
        // Update stall detector: stream is alive
        this.lastTimeUpdateAt = Date.now();
        this.lastTimeUpdateValue = deck.currentTime;
        const cur = deck.currentTime;
        const dur = deck.duration || 0;

        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(cur, dur);
        }

        // Crossfade blend trigger when approaching track end (skip when Repeat One is active)
        if (!this.repeatOne && this.crossfadeDuration > 0 && dur > 10 && cur > 0) {
          const remaining = dur - cur;
          if (remaining <= this.crossfadeDuration && remaining > 0.4 && !this.hasTriggeredCrossfade) {
            this.hasTriggeredCrossfade = true;
            this.startHtml5CrossfadeOut(deckIndex, remaining);
            if (this.onCrossfadeCallback) {
              this.onCrossfadeCallback();
            }
          }
        }
      }
    });

    deck.addEventListener('play', () => {
      if (this.mode === 'HTML5' && this.activeDeckIndex === deckIndex) {
        this.startStallDetector();
        if (this.onPlayStateChangeCallback) {
          this.onPlayStateChangeCallback(true);
        }
      }
    });

    deck.addEventListener('pause', () => {
      if (this.mode === 'HTML5' && this.activeDeckIndex === deckIndex) {
        this.stopStallDetector();
        if (this.onPlayStateChangeCallback) {
          this.onPlayStateChangeCallback(false);
        }
      }
    });

    deck.addEventListener('ended', () => {
      if (this.mode === 'HTML5' && this.activeDeckIndex === deckIndex) {
        this.stopStallDetector();
        if (!this.hasTriggeredCrossfade && this.onEndedCallback) {
          this.onEndedCallback();
        }
      }
    });

    deck.addEventListener('loadedmetadata', () => {
      if (this.mode === 'HTML5' && this.activeDeckIndex === deckIndex && this.onTrackLoadedCallback) {
        this.onTrackLoadedCallback();
      }
    });

    // 'stalled' fires when the browser is trying to fetch but getting no data
    deck.addEventListener('stalled', () => {
      if (this.mode === 'HTML5' && this.activeDeckIndex === deckIndex) {
        console.warn('HTML5 audio stalled event — stream download interrupted');
        // Give it 5 seconds to recover before switching to YouTube
        this.lastTimeUpdateAt = Date.now();
      }
    });

    // 'waiting' fires when playback stopped due to lack of buffered data
    deck.addEventListener('waiting', () => {
      if (this.mode === 'HTML5' && this.activeDeckIndex === deckIndex) {
        console.warn('HTML5 audio waiting event — buffering');
      }
    });

    deck.addEventListener('error', (e) => {
      if (this.mode === 'HTML5' && this.activeDeckIndex === deckIndex) {
        console.warn('HTML5 audio error event triggered:', e);
        this.stopStallDetector();
        // Auto-recover: switch to YouTube IFrame player for the same videoId
        if (this.currentPlayingVideoId) {
          console.log('Auto-recovering to YouTube player for videoId:', this.currentPlayingVideoId);
          this.playVideo(this.currentPlayingVideoId, 0).catch(console.error);
        }
      }
    });
  }

  /**
   * Stall Detector: monitors HTML5 audio for frozen streams.
   * If currentTime hasn't advanced for 5 seconds while not paused,
   * the CDN stream is dead — auto-recover to YouTube IFrame.
   */
  private startStallDetector() {
    this.stopStallDetector();
    this.lastTimeUpdateAt = Date.now();
    this.lastTimeUpdateValue = this.audio.currentTime;
    this.stallRecoveryAttempted = false;

    this.stallDetectorHandle = setInterval(() => {
      if (this.mode !== 'HTML5' || this.audio.paused) return;

      const timeSinceUpdate = Date.now() - this.lastTimeUpdateAt;
      const timeAdvanced = Math.abs(this.audio.currentTime - this.lastTimeUpdateValue) > 0.1;

      if (timeAdvanced) {
        // Stream is alive — reset
        this.lastTimeUpdateAt = Date.now();
        this.lastTimeUpdateValue = this.audio.currentTime;
        return;
      }

      // No time progress for 5+ seconds — stream is frozen
      if (timeSinceUpdate > 5000 && !this.stallRecoveryAttempted) {
        this.stallRecoveryAttempted = true;
        console.warn('HTML5 audio stall detected: no progress for 5s, switching to YouTube for videoId:', this.currentPlayingVideoId);
        this.stopStallDetector();
        if (this.currentPlayingVideoId) {
          this.playVideo(this.currentPlayingVideoId, this.audio.currentTime || 0).catch(console.error);
        }
      }
    }, 1000);
  }

  private stopStallDetector() {
    if (this.stallDetectorHandle) {
      clearInterval(this.stallDetectorHandle);
      this.stallDetectorHandle = null;
    }
  }

  /**
   * Pre-downloads the upcoming track in advance for instant 0ms switching
   */
  public preloadNextTrack(streamUrl?: string | null, videoId?: string | null): void {
    if (streamUrl) {
      if (this.preloadedStreamUrl === streamUrl && this.preloadedReady) {
        return;
      }
      this.preloadedStreamUrl = streamUrl;
      this.preloadedVideoId = videoId || null;
      this.preloadedReady = false;

      try {
        this.preloadAudio.src = streamUrl;
        this.preloadAudio.load();

        // Range request for first 1MB ensures the browser disk/memory cache stores the media chunks in advance
        if (typeof fetch !== 'undefined') {
          fetch(streamUrl, {
            headers: { Range: 'bytes=0-1048576' },
            mode: 'cors',
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('Preload audio error:', err);
      }
    } else if (videoId) {
      this.preloadedVideoId = videoId;
      if (typeof Image !== 'undefined') {
        const preImg = new Image();
        preImg.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
  }

  public async playUrl(
    streamUrl: string,
    startTime: number = 0,
    videoId?: string,
    fromCrossfade: boolean = false
  ): Promise<void> {
    if (videoId) {
      this.currentPlayingVideoId = videoId;
    }

    if (!streamUrl) {
      if (this.currentPlayingVideoId) {
        return this.playVideo(this.currentPlayingVideoId, startTime, fromCrossfade);
      }
      return;
    }

    // Route googlevideo.com streams through same-origin /api/stream (IP-matched + Range-enabled)
    // so HTML5 <audio> plays seamlessly in Chrome mobile background without 403 or iframe suspension.
    let effectiveUrl = streamUrl;
    if (streamUrl.includes('googlevideo.com') && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
      effectiveUrl = `/api/stream?url=${encodeURIComponent(streamUrl)}`;
    } else if (streamUrl.includes('googlevideo.com')) {
      const gen = ++this.playGeneration;
      this.intendedPlaying = true;
      this.hasTriggeredCrossfade = false;
      this.hasStartedYtFadeOut = false;
      this.isCrossfadingOut = false;
      this.mode = 'DIRECT';
      this.stopTicker();
      this.stopStallDetector();
      this.cancelCrossfade();
      this.decks[0].pause();
      this.decks[1].pause();
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        try {
          this.ytPlayer.pauseVideo();
        } catch {}
      }
      try {
        this.directAudio.src = streamUrl;
        this.directAudio.volume = this.currentVolume;
        this.directAudio.currentTime = startTime;
        this.directAudio.load();
        await this.directAudio.play();
        if (gen !== this.playGeneration) {
          this.directAudio.pause();
          return;
        }
        if (this.onPlayStateChangeCallback) {
          this.onPlayStateChangeCallback(true);
        }
        return;
      } catch (err) {
        if (gen === this.playGeneration && this.currentPlayingVideoId) {
          return this.playVideo(this.currentPlayingVideoId, startTime, fromCrossfade);
        }
        throw err;
      }
    }

    this.directAudio.pause();

    const gen = ++this.playGeneration;
    this.intendedPlaying = true;
    this.hasTriggeredCrossfade = false;
    this.hasStartedYtFadeOut = false;
    this.isCrossfadingOut = false;
    this.mode = 'HTML5';
    this.stopTicker();
    this.stallRecoveryAttempted = false;

    if (!fromCrossfade) {
      this.cancelCrossfade();
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        try {
          this.ytPlayer.pauseVideo();
        } catch {}
      }
    } else {
      // If crossfading from HTML5, switch to the OTHER deck so the outgoing deck finishes fading out
      if (this.fadeOutDeckIndex !== null) {
        this.activeDeckIndex = this.fadeOutDeckIndex === 0 ? 1 : 0;
      }
      // If crossfading from YouTube, let ytFadeOutTimer finish fading out & pausing ytPlayer
      if (!this.ytFadeOutTimer && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        try {
          this.ytPlayer.pauseVideo();
        } catch {}
      }
    }

    this.initAudioContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }

    if (gen !== this.playGeneration) return;

    const deck = this.decks[this.activeDeckIndex];
    const deckGain = this.deckGainNodes[this.activeDeckIndex];

    try {
      // If preloaded in advance, audio chunks are already in cache
      if (this.preloadedStreamUrl === streamUrl) {
        this.preloadAudio.pause();
        this.preloadAudio.removeAttribute('src');
      }

      if (deckGain && this.ctx) {
        deckGain.gain.cancelScheduledValues(this.ctx.currentTime);
        deckGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      }

      deck.src = effectiveUrl;
      // Always start at full target volume immediately (no fade-in)
      deck.volume = this.currentVolume;
      deck.playbackRate = 1.0;
      deck.defaultPlaybackRate = 1.0;
      deck.currentTime = startTime;
      await deck.play();

      if (gen !== this.playGeneration) {
        deck.pause();
        return;
      }

      this.startStallDetector();
      if (this.onPlayStateChangeCallback) {
        this.onPlayStateChangeCallback(true);
      }
    } catch (err) {
      console.warn('Play error in HTML5, falling back to YouTube', err);
      if (gen === this.playGeneration && this.currentPlayingVideoId) {
        return this.playVideo(this.currentPlayingVideoId, startTime, fromCrossfade);
      }
      throw err;
    }
  }

  // ---- Unified Transport Controls ----

  public pause(): void {
    this.intendedPlaying = false;
    if (this.mode === 'YOUTUBE' && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      this.ytPlayer.pauseVideo();
      this.stopTicker();
    } else if (this.mode === 'DIRECT') {
      this.directAudio.pause();
    } else {
      this.audio.pause();
    }
  }

  public resume(): Promise<void> {
    this.intendedPlaying = true;
    if (this.mode === 'YOUTUBE' && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      this.ytPlayer.playVideo();
      this.startTicker();
      return Promise.resolve();
    } else if (this.mode === 'DIRECT') {
      return this.directAudio.play();
    } else {
      if (this.ctx && this.ctx.state !== 'running') {
        this.ctx.resume().catch(() => {});
      }
      return this.audio.play();
    }
  }

  public seek(seconds: number): void {
    this.hasTriggeredCrossfade = false;
    this.hasStartedYtFadeOut = false;
    if (seconds <= 1) {
      this.cancelCrossfade();
      this.setVolume(this.currentVolume);
    }
    if (this.mode === 'YOUTUBE' && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      this.ytPlayer.seekTo(seconds, true);
    } else if (this.mode === 'DIRECT') {
      this.directAudio.currentTime = seconds;
    } else {
      this.audio.currentTime = seconds;
    }
  }

  public setRepeatOne(enabled: boolean): void {
    this.repeatOne = enabled;
    if (enabled) {
      this.hasTriggeredCrossfade = false;
      this.hasStartedYtFadeOut = false;
      this.cancelCrossfade();
      this.setVolume(this.currentVolume);
    }
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.currentVolume = clamped;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('znode_volume', String(clamped));
      }
    } catch {}

    if (this.mode === 'YOUTUBE' && this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      try {
        this.ytPlayer.setVolume(Math.round(clamped * 100));
      } catch {}
    } else if (this.mode === 'DIRECT') {
      this.directAudio.volume = clamped;
    } else {
      this.audio.volume = clamped;
    }
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public setCrossfadeDuration(seconds: number): void {
    this.crossfadeDuration = Math.max(0, Math.min(12, seconds));
  }

  public getCrossfadeDuration(): number {
    return this.crossfadeDuration;
  }

  public setEqGain(bandIndex: number, gainDb: number): void {
    this.currentEqGains[bandIndex] = gainDb;
    this.initAudioContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.eqFilters[bandIndex]) {
      const now = this.ctx?.currentTime || 0;
      this.eqFilters[bandIndex].gain.setTargetAtTime(gainDb, now, 0.05);
    }
  }

  public applyEqPreset(preset: EqualizerPreset): void {
    this.initAudioContext();
    preset.gains.forEach((gain, idx) => {
      this.setEqGain(idx, gain);
    });
  }

  public setTonePad(toneX: number, toneY: number): void {
    this.currentToneX = toneX;
    this.currentToneY = toneY;
    this.initAudioContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.toneLowShelf && this.toneHighShelf && this.toneMidPeak) {
      const now = this.ctx?.currentTime || 0;
      this.toneLowShelf.gain.setTargetAtTime(-toneX * 8.0, now, 0.05);
      this.toneHighShelf.gain.setTargetAtTime(toneX * 8.0, now, 0.05);
      this.toneMidPeak.gain.setTargetAtTime(toneY * 6.0, now, 0.05);
    }
  }

  public getPreloadedVideoId(): string | null {
    return this.preloadedVideoId;
  }

  public get isLossless(): boolean {
    return this.mode === 'HTML5' || this.mode === 'DIRECT';
  }

  public get playbackMode(): 'HTML5' | 'DIRECT' | 'YOUTUBE' {
    return this.mode;
  }

  public onTimeUpdate(cb: (currentTime: number, duration: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  public onEnded(cb: () => void) {
    this.onEndedCallback = cb;
  }

  public onTrackLoaded(cb: () => void) {
    this.onTrackLoadedCallback = cb;
  }

  public onError(cb: (err: any) => void) {
    this.onErrorCallback = cb;
  }

  public onPlayStateChange(cb: (isPlaying: boolean) => void) {
    this.onPlayStateChangeCallback = cb;
  }

  public onCrossfade(cb: () => void) {
    this.onCrossfadeCallback = cb;
  }

  public get wasCrossfaded(): boolean {
    return this.hasTriggeredCrossfade;
  }

  public cancelCrossfade(): void {
    this.isCrossfadingOut = false;
    if (this.fadeOutTimer) {
      clearInterval(this.fadeOutTimer);
      this.fadeOutTimer = null;
    }
    if (this.fadeOutDeckIndex !== null) {
      const d = this.decks[this.fadeOutDeckIndex];
      const g = this.deckGainNodes[this.fadeOutDeckIndex];
      d.pause();
      d.removeAttribute('src');
      d.volume = this.currentVolume;
      if (g && this.ctx) {
        g.gain.cancelScheduledValues(this.ctx.currentTime);
        g.gain.setValueAtTime(1.0, this.ctx.currentTime);
      }
      this.fadeOutDeckIndex = null;
    }
    if (this.ytFadeOutTimer) {
      clearInterval(this.ytFadeOutTimer);
      this.ytFadeOutTimer = null;
      if (this.mode !== 'YOUTUBE' && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        try {
          this.ytPlayer.pauseVideo();
        } catch {}
      }
    }
  }

  private startHtml5CrossfadeOut(deckIndex: 0 | 1, durationSec: number): void {
    if (this.fadeOutTimer) {
      clearInterval(this.fadeOutTimer);
      this.fadeOutTimer = null;
    }
    if (this.fadeOutDeckIndex !== null && this.fadeOutDeckIndex !== deckIndex) {
      const prevDeck = this.decks[this.fadeOutDeckIndex];
      prevDeck.pause();
      prevDeck.removeAttribute('src');
      prevDeck.volume = this.currentVolume;
    }

    this.isCrossfadingOut = true;
    this.fadeOutDeckIndex = deckIndex;

    const deck = this.decks[deckIndex];
    const deckGain = this.deckGainNodes[deckIndex];
    const steps = 20;
    const interval = Math.max(25, (durationSec * 1000) / steps);
    let step = 0;
    const startVol = this.currentVolume;

    this.fadeOutTimer = setInterval(() => {
      step++;
      const ratio = Math.max(0, 1 - step / steps);
      // Equal-power-like smooth curve for natural blending
      const curved = ratio * ratio;
      if (deckGain && this.ctx) {
        deckGain.gain.setValueAtTime(curved, this.ctx.currentTime);
      } else {
        deck.volume = Math.max(0, Math.min(1, startVol * curved));
      }

      if (step >= steps) {
        clearInterval(this.fadeOutTimer);
        this.fadeOutTimer = null;
        this.isCrossfadingOut = false;
        if (this.fadeOutDeckIndex === deckIndex) {
          this.fadeOutDeckIndex = null;
        }
        // Only pause if this deck is no longer the active deck
        if (this.activeDeckIndex !== deckIndex || this.mode !== 'HTML5') {
          deck.pause();
          deck.removeAttribute('src');
        }
        deck.volume = this.currentVolume;
        if (deckGain && this.ctx) {
          deckGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        }
      }
    }, interval);
  }

  private startYtCrossfadeOut(durationSec: number): void {
    if (this.ytFadeOutTimer) {
      clearInterval(this.ytFadeOutTimer);
      this.ytFadeOutTimer = null;
    }
    this.isCrossfadingOut = true;

    const steps = 16;
    const interval = Math.max(25, (durationSec * 1000) / steps);
    let step = 0;
    const startVol = this.currentVolume;

    this.ytFadeOutTimer = setInterval(() => {
      step++;
      const ratio = Math.max(0, 1 - step / steps);
      const v = startVol * ratio * ratio;
      if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
        try {
          this.ytPlayer.setVolume(Math.max(0, Math.round(v * 100)));
        } catch {}
      }

      if (step >= steps) {
        clearInterval(this.ytFadeOutTimer);
        this.ytFadeOutTimer = null;
        this.isCrossfadingOut = false;
        if (this.mode !== 'YOUTUBE' && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
          try {
            this.ytPlayer.pauseVideo();
            this.ytPlayer.setVolume(Math.round(this.currentVolume * 100));
          } catch {}
        }
      }
    }, interval);
  }

  public updateMediaSession(song: Song) {
    if (!('mediaSession' in navigator)) return;

    try {
      const art = song.thumbnailUrl || '/logo-zn.png';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.albumName || 'Znode Music',
        artwork: [
          { src: art, sizes: '96x96', type: 'image/jpeg' },
          { src: art, sizes: '192x192', type: 'image/jpeg' },
          { src: art, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch (e) {
      console.warn('Failed to update MediaSession metadata', e);
    }
  }

  public updateMediaSessionPlaybackState(isPlaying: boolean) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {}
  }

  public updateMediaSessionPosition(currentTime: number, duration: number) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (typeof navigator.mediaSession.setPositionState !== 'function') return;
    const now = Date.now();
    if (now - this.lastMediaPosUpdate < 900) return;
    this.lastMediaPosUpdate = now;

    if (duration > 0 && isFinite(duration) && isFinite(currentTime)) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1.0,
          position: Math.max(0, Math.min(currentTime, duration)),
        });
      } catch {}
    }
  }

  public get duration(): number {
    if (this.mode === 'YOUTUBE' && this.ytPlayer && typeof this.ytPlayer.getDuration === 'function') {
      return this.ytPlayer.getDuration() || 0;
    }
    if (this.mode === 'DIRECT') return this.directAudio.duration || 0;
    return this.audio.duration || 0;
  }

  public get currentTime(): number {
    if (this.mode === 'YOUTUBE' && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
      return this.ytPlayer.getCurrentTime() || 0;
    }
    if (this.mode === 'DIRECT') return this.directAudio.currentTime || 0;
    return this.audio.currentTime || 0;
  }

  public get isPaused(): boolean {
    if (this.mode === 'YOUTUBE' && this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
      return this.ytPlayer.getPlayerState() !== 1;
    }
    if (this.mode === 'DIRECT') return this.directAudio.paused;
    return this.audio.paused;
  }
}

export const audioEngine = new AudioEngine();
