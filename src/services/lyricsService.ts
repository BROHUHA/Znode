/**
 * Znode Music Web - Synchronized & Multi-Source Lyrics Service
 * Provides line-by-line synced lyrics from YouTube Music & LRCLib
 */

import { LyricLine, LyricsData } from '../types';
import { innertubeService } from './innertube';

export class LyricsService {
  private cache: Map<string, LyricsData> = new Map();

  /**
   * Sanitizes title by removing video descriptors, parenthetical movies, remastered tags, etc.
   */
  public cleanTitle(rawTitle: string): string {
    let title = rawTitle || '';

    // If title has "Artist - Song", separate it
    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      if (parts.length >= 2 && parts[1].trim()) {
        title = parts.slice(1).join(' - ').trim();
      }
    }

    return title
      // Remove bracketed descriptors: (From "Movie"), (From Movie), [From ...], (Lyrical ...), (Official Video), etc.
      .replace(/\s*[\(\[](?:from\s*["“”]?[^()\[\]]+["“”]?|official\s*(?:music\s*video|video|audio|lyric\s*video|lyrics|visualizer|4k|hd|mv)?|video|audio|lyrics|visualizer|remastered(?:\s*\d{4})?|live|full\s*song|hd|4k|mv|explicit|clean|soundtrack|ost|original\s*motion\s*picture\s*soundtrack)[\)\]]/gi, '')
      .replace(/\s*[\(\[](?:feat\.?|ft\.?|with)\s*[^()\[\]]+[\)\]]/gi, '')
      .replace(/\s*[\(\[][^()\[\]]*(?:song|video|lyric|audio|movie|soundtrack|version|remix)[^()\[\]]*[\)\]]/gi, '')
      .replace(/\s*-\s*(?:from|lyrical|official|video|audio|remastered)[\s\S]*$/gi, '')
      .replace(/\|.*$/g, '')
      .replace(/["“”]/g, '')
      .trim();
  }

  /**
   * Sanitizes artist by removing topics, VEVO, and multiple artist suffixes
   */
  public cleanArtist(rawArtist: string): string {
    if (!rawArtist) return '';
    return rawArtist
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/\s*VEVO$/i, '')
      .split('•')[0]
      .split(',')[0]
      .split('&')[0]
      .trim();
  }

  /**
   * Fetches lyrics with multi-tier fallback:
   * 1. YouTube Music official timed lyrics via Innertube (Musixmatch)
   * 2. LRCLib exact match with duration
   * 3. LRCLib exact match without duration
   * 4. LRCLib search with track_name and artist_name
   * 5. LRCLib search query with clean title and artist
   * 6. LRCLib search with clean title only
   * 7. Innertube official plain text lyrics (smart duration paced)
   */
  public async getLyrics(
    title: string,
    artist: string,
    durationSec: number = 0,
    videoId?: string
  ): Promise<LyricsData> {
    const cleanT = this.cleanTitle(title);
    const cleanA = this.cleanArtist(artist);
    const cacheKey = videoId || `${cleanT}_${cleanA}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 1. Try Innertube official timed lyrics first if videoId is available
    let innertubeFallbackText: string | null = null;
    if (videoId) {
      try {
        const innertubeRes = await innertubeService.getLyricsDetailed(videoId);
        if (innertubeRes?.lines && innertubeRes.lines.length > 0) {
          const result: LyricsData = {
            source: 'MUSIXMATCH',
            synced: true,
            lines: innertubeRes.lines,
          };
          this.cache.set(cacheKey, result);
          return result;
        }
        if (innertubeRes?.text) {
          innertubeFallbackText = innertubeRes.text;
        }
      } catch (e) {
        // Fallback
      }
    }

    // 2. Try SimpMusic API by exact YouTube videoId (exact 100% track match)
    if (videoId) {
      const simpLyrics = await this.fetchSimpMusic(videoId);
      if (simpLyrics && simpLyrics.lines.length > 0) {
        this.cache.set(cacheKey, simpLyrics);
        return simpLyrics;
      }
    }

    // 3. Try BetterLyrics API (Apple Music syllable/line synced TTML/LRC)
    const betterLyrics = await this.fetchBetterLyrics(cleanT, cleanA, durationSec);
    if (betterLyrics && betterLyrics.lines.length > 0) {
      this.cache.set(cacheKey, betterLyrics);
      return betterLyrics;
    }

    // 4. Try LRCLib exact match with duration
    let lyricsData = await this.fetchLrcLibExact(cleanT, cleanA, durationSec);

    // 5. Try LRCLib exact match WITHOUT duration (strict duration in /api/get often 404s due to minor diff)
    if (!lyricsData || !lyricsData.lines.length) {
      lyricsData = await this.fetchLrcLibExact(cleanT, cleanA, 0);
    }

    // 6. Fallback: LRCLib search with track_name and artist_name
    if (!lyricsData || !lyricsData.lines.length) {
      lyricsData = await this.searchLrcLibTrackArtist(cleanT, cleanA, durationSec);
    }

    // 7. Fallback: JioSaavn regional lyrics for Indian language tracks
    if (!lyricsData || !lyricsData.lines.length) {
      const saavnLyrics = await this.fetchJioSaavnLyrics(cleanT, cleanA, durationSec);
      if (saavnLyrics && saavnLyrics.lines.length > 0) {
        lyricsData = saavnLyrics;
      }
    }

    // 8. Fallback: LRCLib search query with clean title and artist
    if (!lyricsData || !lyricsData.lines.length) {
      lyricsData = await this.searchLrcLib(`${cleanT} ${cleanA}`, durationSec);
    }

    // 9. Fallback: LRCLib search with clean title only
    if (!lyricsData || !lyricsData.lines.length) {
      lyricsData = await this.searchLrcLib(cleanT, durationSec);
    }

    // 7. Fallback: Innertube plain text lyrics if videoId available, paced to song duration
    if ((!lyricsData || !lyricsData.lines.length) && (innertubeFallbackText || videoId)) {
      try {
        const text =
          innertubeFallbackText || (await innertubeService.getLyricsDetailed(videoId!))?.text;
        if (text) {
          lyricsData = {
            source: 'MUSIXMATCH',
            synced: true,
            lines: this.parsePlainLyrics(text, durationSec),
          };
        }
      } catch (e) {
        console.warn('Innertube plain lyrics fetch error', e);
      }
    }

    if (lyricsData && lyricsData.lines.length > 0) {
      this.cache.set(cacheKey, lyricsData);
      return lyricsData;
    }

    const fallbackEmpty: LyricsData = {
      source: 'LRCLIB',
      synced: false,
      lines: [],
      error: 'No lyrics found for this track',
    };
    return fallbackEmpty;
  }

  private async fetchLrcLibExact(
    cleanTitle: string,
    cleanArtist: string,
    durationSec: number
  ): Promise<LyricsData | null> {
    const endpoints = ['/api/lrclib/get', 'https://lrclib.net/api/get'];

    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist,
    });
    if (durationSec > 0) {
      params.set('duration', Math.round(durationSec).toString());
    }

    for (const base of endpoints) {
      try {
        const res = await fetch(`${base}?${params.toString()}`, {
          headers: {
            'User-Agent': 'ZnodeMusicWeb/1.6.2 (https://github.com/abin/znode-music-web)',
          },
        });
        if (!res.ok) continue;

        const data = await res.json();
        if (data.syncedLyrics) {
          return {
            source: 'LRCLIB',
            synced: true,
            lines: this.parseLrc(data.syncedLyrics),
          };
        }
        if (data.plainLyrics) {
          return {
            source: 'LRCLIB',
            synced: true,
            lines: this.parsePlainLyrics(data.plainLyrics, durationSec),
          };
        }
      } catch (e) {
        // Try next endpoint
      }
    }

    return null;
  }

  private async searchLrcLibTrackArtist(
    cleanTitle: string,
    cleanArtist: string,
    durationSec: number
  ): Promise<LyricsData | null> {
    const endpoints = ['/api/lrclib/search', 'https://lrclib.net/api/search'];
    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist,
    });

    for (const base of endpoints) {
      try {
        const res = await fetch(`${base}?${params.toString()}`, {
          headers: {
            'User-Agent': 'ZnodeMusicWeb/1.6.2 (https://github.com/abin/znode-music-web)',
          },
        });
        if (!res.ok) continue;

        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          // Sort items by closest duration match if durationSec is specified
          let items = [...list];
          if (durationSec > 0) {
            items.sort((a: any, b: any) => {
              const diffA = Math.abs((a.duration || 0) - durationSec);
              const diffB = Math.abs((b.duration || 0) - durationSec);
              return diffA - diffB;
            });
          }

          // Prefer synchronized lyrics
          const syncedItem = items.find((item: any) => item.syncedLyrics);
          if (syncedItem && syncedItem.syncedLyrics) {
            return {
              source: 'LRCLIB',
              synced: true,
              lines: this.parseLrc(syncedItem.syncedLyrics),
            };
          }

          // Otherwise return first with plain lyrics, paced to duration
          const plainItem = items.find((item: any) => item.plainLyrics);
          if (plainItem && plainItem.plainLyrics) {
            return {
              source: 'LRCLIB',
              synced: true,
              lines: this.parsePlainLyrics(plainItem.plainLyrics, durationSec),
            };
          }
        }
      } catch (e) {
        // Try next endpoint
      }
    }
    return null;
  }

  private async searchLrcLib(query: string, durationSec: number = 0): Promise<LyricsData | null> {
    const endpoints = ['/api/lrclib/search', 'https://lrclib.net/api/search'];
    const q = encodeURIComponent(query.trim());
    if (!q) return null;

    for (const base of endpoints) {
      try {
        const res = await fetch(`${base}?q=${q}`, {
          headers: {
            'User-Agent': 'ZnodeMusicWeb/1.6.2 (https://github.com/abin/znode-music-web)',
          },
        });
        if (!res.ok) continue;

        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          // Sort items by closest duration match if durationSec is specified
          let items = [...list];
          if (durationSec > 0) {
            items.sort((a: any, b: any) => {
              const diffA = Math.abs((a.duration || 0) - durationSec);
              const diffB = Math.abs((b.duration || 0) - durationSec);
              return diffA - diffB;
            });
          }

          // Prefer synchronized lyrics
          const syncedItem = items.find((item: any) => item.syncedLyrics);
          if (syncedItem && syncedItem.syncedLyrics) {
            return {
              source: 'LRCLIB',
              synced: true,
              lines: this.parseLrc(syncedItem.syncedLyrics),
            };
          }

          // Otherwise return first with plain lyrics
          const plainItem = items.find((item: any) => item.plainLyrics);
          if (plainItem && plainItem.plainLyrics) {
            return {
              source: 'LRCLIB',
              synced: true,
              lines: this.parsePlainLyrics(plainItem.plainLyrics, durationSec),
            };
          }
        }
      } catch (e) {
        // Try next endpoint
      }
    }

    return null;
  }

  /**
   * Parse standard LRC timestamp format [mm:ss.xx] words (supporting 1 or 2 digit mins, colon or dot ms)
   */
  public parseLrc(lrcText: string): LyricLine[] {
    const rawLines = lrcText.split('\n');
    const result: LyricLine[] = [];
    const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

    for (const rawLine of rawLines) {
      const match = [...rawLine.matchAll(timeRegex)];
      if (!match || match.length === 0) continue;

      const words = rawLine.replace(timeRegex, '').trim();
      // Skip empty words if they're just blank lines between verses
      if (!words) continue;

      for (const m of match) {
        const mins = parseInt(m[1], 10);
        const secs = parseInt(m[2], 10);
        let ms = 0;
        if (m[3]) {
          if (m[3].length === 1) ms = parseInt(m[3], 10) * 100;
          else if (m[3].length === 2) ms = parseInt(m[3], 10) * 10;
          else ms = parseInt(m[3], 10);
        }
        const startTimeMs = (mins * 60 + secs) * 1000 + ms;

        result.push({
          startTimeMs,
          endTimeMs: 0,
          words,
        });
      }
    }

    result.sort((a, b) => a.startTimeMs - b.startTimeMs);

    // Deduplicate or merge close timestamps (< 150ms) to avoid line jitter
    const deduplicated: LyricLine[] = [];
    for (const item of result) {
      if (
        deduplicated.length > 0 &&
        Math.abs(deduplicated[deduplicated.length - 1].startTimeMs - item.startTimeMs) < 150
      ) {
        deduplicated[deduplicated.length - 1].words += ` ${item.words}`;
      } else {
        deduplicated.push(item);
      }
    }

    for (let i = 0; i < deduplicated.length; i++) {
      if (i < deduplicated.length - 1) {
        deduplicated[i].endTimeMs = deduplicated[i + 1].startTimeMs;
      } else {
        deduplicated[i].endTimeMs = deduplicated[i].startTimeMs + 4500;
      }
    }

    return deduplicated;
  }

  private parseTtmlTime(timeStr: string): number {
    if (!timeStr) return 0;
    const str = timeStr.trim();
    if (str.endsWith('s')) {
      const val = parseFloat(str.slice(0, -1));
      return isNaN(val) ? 0 : Math.round(val * 1000);
    }
    const parts = str.split(':');
    if (parts.length === 2) {
      const mins = parseFloat(parts[0]);
      const secs = parseFloat(parts[1]);
      return Math.round((mins * 60 + secs) * 1000);
    }
    if (parts.length === 3) {
      const hours = parseFloat(parts[0]);
      const mins = parseFloat(parts[1]);
      const secs = parseFloat(parts[2]);
      return Math.round((hours * 3600 + mins * 60 + secs) * 1000);
    }
    const val = parseFloat(str);
    return isNaN(val) ? 0 : Math.round(val * 1000);
  }

  /**
   * Parse TTML syllable/line synchronized markup (e.g. from BetterLyrics / Apple Music)
   */
  public parseTtml(ttml: string): LyricLine[] {
    const pRegex = /<p\s+[^>]*begin="([^"]+)"(?:[^>]*end="([^"]+)")?[^>]*>([\s\S]*?)<\/p>/gi;
    const lines: LyricLine[] = [];
    let match;
    while ((match = pRegex.exec(ttml)) !== null) {
      const beginStr = match[1];
      const endStr = match[2];
      const rawHtml = match[3];
      const words = rawHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (!words) continue;
      const startTimeMs = this.parseTtmlTime(beginStr);
      const endTimeMs = endStr ? this.parseTtmlTime(endStr) : startTimeMs + 4000;
      lines.push({ startTimeMs, endTimeMs, words });
    }
    lines.sort((a, b) => a.startTimeMs - b.startTimeMs);
    return lines;
  }

  /**
   * Fetches lyrics from SimpMusic API by YouTube videoId (exact 1-to-1 match)
   */
  private async fetchSimpMusic(videoId: string): Promise<LyricsData | null> {
    if (!videoId) return null;
    const endpoints = [
      `/api/simpmusic/${videoId}`,
      `https://api-lyrics.simpmusic.org/v1/${videoId}`,
    ];

    for (const ep of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(ep, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
          },
        });
        clearTimeout(timeout);
        if (!res.ok) continue;

        const data = await res.json();
        // 1. Array of lyric objects
        if (Array.isArray(data) && data.length > 0) {
          const lines: LyricLine[] = data
            .map((item: any, idx: number) => ({
              startTimeMs:
                item.startTimeMs || (item.time ? Math.round(item.time * 1000) : idx * 4000),
              endTimeMs: item.endTimeMs || (item.endTime ? Math.round(item.endTime * 1000) : 0),
              words: item.words || item.text || item.line || '',
            }))
            .filter((l) => l.words.trim().length > 0);

          if (lines.length > 0) {
            return {
              source: 'SIMPMUSIC',
              synced: true,
              lines,
            };
          }
        }

        // 2. Synced lyrics string
        if (data.syncedLyrics && typeof data.syncedLyrics === 'string') {
          const lines = this.parseLrc(data.syncedLyrics);
          if (lines.length > 0) {
            return {
              source: 'SIMPMUSIC',
              synced: true,
              lines,
            };
          }
        }

        // 3. Plain lyrics string
        if (data.plainLyrics && typeof data.plainLyrics === 'string') {
          const lines = this.parsePlainLyrics(data.plainLyrics);
          if (lines.length > 0) {
            return {
              source: 'SIMPMUSIC',
              synced: false,
              lines,
            };
          }
        }
      } catch (e) {
        // Continue
      }
    }
    return null;
  }

  /**
   * Fetches lyrics from BetterLyrics (Apple Music TTML / LRC)
   */
  private async fetchBetterLyrics(
    title: string,
    artist: string,
    durationSec: number
  ): Promise<LyricsData | null> {
    const endpoints = [
      `/api/betterlyrics/getLyrics?s=${encodeURIComponent(title)}&a=${encodeURIComponent(artist)}${durationSec > 0 ? `&d=${Math.round(durationSec)}` : ''}`,
      `https://lyrics-api.boidu.dev/getLyrics?s=${encodeURIComponent(title)}&a=${encodeURIComponent(artist)}${durationSec > 0 ? `&d=${Math.round(durationSec)}` : ''}`,
    ];

    for (const ep of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(ep, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
          },
        });
        clearTimeout(timeout);
        if (!res.ok) continue;

        const data = await res.json();
        if (data.ttml && typeof data.ttml === 'string') {
          const lines = this.parseTtml(data.ttml);
          if (lines.length > 0) {
            return {
              source: 'BETTER_LYRICS',
              synced: true,
              hasSyllables: true,
              lines,
            };
          }
        }
        if (data.lrc && typeof data.lrc === 'string') {
          const lines = this.parseLrc(data.lrc);
          if (lines.length > 0) {
            return {
              source: 'BETTER_LYRICS',
              synced: true,
              lines,
            };
          }
        }
      } catch (e) {
        // Fallback
      }
    }
    return null;
  }

  /**
   * Fetches lyrics from JioSaavn for Indian regional music (Hindi, Malayalam, Tamil, Telugu, Punjabi)
   */
  private async fetchJioSaavnLyrics(
    title: string,
    artist: string,
    durationSec: number
  ): Promise<LyricsData | null> {
    try {
      const q = encodeURIComponent(`${title} ${artist}`.trim());
      const searchRes = await fetch(
        `/api/jiosaavn?__call=autocomplete.get&query=${q}&_format=json&_marker=0&ctx=web6dot0`
      );
      if (!searchRes.ok) return null;
      const data = await searchRes.json();
      const songs = data?.songs?.data;
      if (!Array.isArray(songs) || songs.length === 0) return null;

      const match = songs.find((s: any) => s.has_lyrics === 'true' || s.lyrics_id || s.id);
      if (!match) return null;

      const songId = match.id;
      const detailsRes = await fetch(
        `/api/jiosaavn?__call=song.getDetails&pids=${songId}&_format=json&_marker=0&ctx=web6dot0`
      );
      if (!detailsRes.ok) return null;
      const details = await detailsRes.json();
      const songData = details[songId] || details;
      const lyricsId = songData?.lyrics_id || songId;

      if (songData?.has_lyrics === 'true' || lyricsId) {
        const lyricsRes = await fetch(
          `/api/jiosaavn?__call=lyrics.getLyrics&lyrics_id=${lyricsId}&_format=json&_marker=0&ctx=web6dot0`
        );
        if (lyricsRes.ok) {
          const lyricsJson = await lyricsRes.json();
          if (lyricsJson?.lyrics) {
            const cleanText = lyricsJson.lyrics
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .trim();
            if (cleanText) {
              return {
                source: 'JIOSAAVN',
                synced: true,
                lines: this.parsePlainLyrics(cleanText, durationSec),
              };
            }
          }
        }
      }
    } catch (e) {
      // Fallback
    }
    return null;
  }

  /**
   * Parse plain text lyrics into structured, paced lines
   */
  public parsePlainLyrics(plain: string, durationSec: number = 0): LyricLine[] {
    const rawLines = plain
      .split('\n')
      .map((words) => words.trim())
      .filter((line) => line.length > 0);

    if (rawLines.length === 0) return [];

    const totalLines = rawLines.length;
    // Smart pacing across song duration
    const durationMs = durationSec > 15 ? durationSec * 1000 : totalLines * 4500;
    const startOffsetMs = Math.min(14000, Math.max(4000, durationMs * 0.06));
    const activeDurationMs = Math.max(durationMs * 0.88 - startOffsetMs, totalLines * 3000);
    const lineIntervalMs = activeDurationMs / totalLines;

    return rawLines.map((words, index) => {
      const startTimeMs = Math.round(startOffsetMs + index * lineIntervalMs);
      const endTimeMs = Math.round(startOffsetMs + (index + 1) * lineIntervalMs);
      return {
        startTimeMs,
        endTimeMs,
        words,
      };
    });
  }
}

export const lyricsService = new LyricsService();
