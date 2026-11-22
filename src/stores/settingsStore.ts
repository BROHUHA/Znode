/**
 * Znode Music Web - User Settings Store (Zustand with localStorage persistence)
 * Faithful to AppSettings.kt
 */

import { create } from 'zustand';
import { audioEngine, EQ_PRESETS } from '../audio/audioEngine';

const getStorage = (key: string): string | null => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(`znode_${key}`) ?? localStorage.getItem(`yz_${key}`);
};

const setStorage = (key: string, val: string) => {
  try {
    localStorage.setItem(`znode_${key}`, val);
  } catch {}
};

interface SettingsState {
  themeMode: 'SYSTEM' | 'LIGHT' | 'DARK';
  accentColor: string;
  crossfadeSeconds: number;
  liquidGlass: boolean;
  syncedLyrics: boolean;
  audioQuality: 'LOSSLESS' | 'HIGH' | 'LOW';
  moduleIndexUrl: string;
  equalizerEnabled: boolean;
  toneX: number;
  toneY: number;
  eqGains: number[];
  selectedPreset: string;

  setThemeMode: (mode: 'SYSTEM' | 'LIGHT' | 'DARK') => void;
  setAccentColor: (color: string) => void;
  setCrossfadeSeconds: (secs: number) => void;
  setLiquidGlass: (enabled: boolean) => void;
  setSyncedLyrics: (enabled: boolean) => void;
  setAudioQuality: (quality: 'LOSSLESS' | 'HIGH' | 'LOW') => void;
  setModuleIndexUrl: (url: string) => void;
  setTonePad: (x: number, y: number) => void;
  setEqGain: (index: number, val: number) => void;
  setPreset: (presetName: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => {
  const savedAccent = getStorage('accent_color') || '#FA2D48';
  const savedCrossfade = parseInt(getStorage('crossfade') || '0', 10);
  const savedModuleIndex = getStorage('module_index_url') || 'https://yz-music-sources.vercel.app/index.json';
  
  // Default to LOSSLESS audio
  const savedQuality = (getStorage('quality') as any) || 'LOSSLESS';

  // Load Equalizer & Tone Pad DSP state
  const savedGainsRaw = getStorage('eq_gains');
  const savedGains: number[] = savedGainsRaw ? JSON.parse(savedGainsRaw) : new Array(10).fill(0);
  const savedPreset = getStorage('eq_preset') || 'Flat';
  const savedToneX = parseFloat(getStorage('tone_x') || '0');
  const savedToneY = parseFloat(getStorage('tone_y') || '0');

  // Apply default crossfade & initial DSP settings to engine
  audioEngine.setCrossfadeDuration(savedCrossfade);
  savedGains.forEach((g, idx) => audioEngine.setEqGain(idx, g));
  audioEngine.setTonePad(savedToneX, savedToneY);

  return {
    themeMode: (getStorage('theme') as any) || 'DARK',
    accentColor: savedAccent,
    crossfadeSeconds: savedCrossfade,
    liquidGlass: getStorage('liquid_glass') !== 'false',
    syncedLyrics: getStorage('synced_lyrics') !== 'false',
    audioQuality: savedQuality,
    moduleIndexUrl: savedModuleIndex,
    equalizerEnabled: true,
    toneX: savedToneX,
    toneY: savedToneY,
    eqGains: savedGains,
    selectedPreset: savedPreset,

    setThemeMode: (mode) => {
      setStorage('theme', mode);
      set({ themeMode: mode });
      if (mode === 'DARK' || (mode === 'SYSTEM' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    setAccentColor: (color) => {
      setStorage('accent_color', color);
      document.documentElement.style.setProperty('--accent-color', color);
      set({ accentColor: color });
    },

    setCrossfadeSeconds: (secs) => {
      setStorage('crossfade', secs.toString());
      audioEngine.setCrossfadeDuration(secs);
      set({ crossfadeSeconds: secs });
    },

    setLiquidGlass: (enabled) => {
      setStorage('liquid_glass', enabled ? 'true' : 'false');
      set({ liquidGlass: enabled });
    },

    setSyncedLyrics: (enabled) => {
      setStorage('synced_lyrics', enabled ? 'true' : 'false');
      set({ syncedLyrics: enabled });
    },

    setAudioQuality: (quality) => {
      setStorage('quality', quality);
      set({ audioQuality: quality });
      // Clear stream cache so next track uses the new quality preference
      try {
        (window as any).__znodeStreamCacheClear?.();
      } catch {}
    },

    setModuleIndexUrl: (url) => {
      setStorage('module_index_url', url);
      set({ moduleIndexUrl: url });
    },

    setTonePad: (x, y) => {
      setStorage('tone_x', x.toString());
      setStorage('tone_y', y.toString());
      audioEngine.setTonePad(x, y);
      set({ toneX: x, toneY: y });
    },

    setEqGain: (index, val) => {
      set((state) => {
        const next = [...state.eqGains];
        next[index] = val;
        setStorage('eq_gains', JSON.stringify(next));
        audioEngine.setEqGain(index, val);
        return { eqGains: next, selectedPreset: 'Custom' };
      });
    },

    setPreset: (presetName) => {
      const p = EQ_PRESETS.find((pr) => pr.name === presetName);
      if (p) {
        setStorage('eq_preset', presetName);
        setStorage('eq_gains', JSON.stringify(p.gains));
        audioEngine.applyEqPreset(p);
        set({ selectedPreset: presetName, eqGains: [...p.gains] });
      }
    },
  };
});
