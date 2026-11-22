/**
 * Znode Music Web - JioSaavn High-Quality Audio Service
 * Exact replication of JioSaavnService.kt
 * Provides 320kbps MP4/AAC streams with DES decryption
 */

import CryptoJS from 'crypto-js';
import { TrackMatcher, CandidateTrack, TargetTrack } from '../utils/trackMatcher';

const DES_KEY = '38346591'; // 8-byte DES key
const BASE_URL = '/api/jiosaavn';

export interface SaavnSong {
  id: string;
  title: string;
  artist: string;
  image: string;
  streamUrl: string | null;
  bitrate: number;
  durationSec: number;
}

export class JioSaavnService {
  private matchCache = new Map<string, string | null>();

  /**
   * Decrypts JioSaavn DES-encrypted media URL
   */
  public decryptUrl(encryptedUrl: string): string {
    if (!encryptedUrl) return '';
    try {
      const keyHex = CryptoJS.enc.Utf8.parse(DES_KEY);
      const decrypted = CryptoJS.DES.decrypt(
        {
          ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl),
        } as any,
        keyHex,
        {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7,
        }
      );
      return decrypted.toString(CryptoJS.enc.Utf8).trim();
    } catch (err) {
      console.warn('JioSaavn DES URL decryption failed', err);
      return '';
    }
  }

  /**
   * Resolves the highest available 320kbps CDN stream
   */
  public getBestStreamUrl(encryptedUrl: string, _has320: boolean = true): { url: string; bitrate: number } | null {
    let rawUrl = this.decryptUrl(encryptedUrl);
    if (!rawUrl) return null;

    // Ensure secure HTTPS URL for seamless browser streaming
    rawUrl = rawUrl.replace(/^http:\/\//i, 'https://');

    const regex = /_(48|96|160|320)\.(mp4|aac|mp3)$/;
    const match = rawUrl.match(regex);

    if (match) {
      // Prioritize 320kbps maximum fidelity MP4/AAC stream
      return {
        url: rawUrl.replace(regex, `_320.${match[2]}`),
        bitrate: 320,
      };
    }

    return {
      url: rawUrl,
      bitrate: 320,
    };
  }

  /**
   * Searches JioSaavn for matching tracks
   */
  public async search(query: string): Promise<SaavnSong[]> {
    try {
      const params = new URLSearchParams({
        __call: 'search.getResults',
        _format: 'json',
        _marker: '0',
        api_version: '4',
        ctx: 'android',
        q: query,
        p: '1',
        n: '5',
      });

      const res = await fetch(`${BASE_URL}?${params.toString()}`);
      if (!res.ok) return [];

      const data = await res.json();
      const results = data.results || [];

      return results.map((item: any) => {
        const moreInfo = item.more_info || {};
        const encryptedUrl = item.encrypted_media_url || moreInfo.encrypted_media_url;
        let stream = encryptedUrl ? this.getBestStreamUrl(encryptedUrl, true) : null;

        // Fallback to media_preview_url if decryption didn't produce URL
        if (!stream && (item.media_preview_url || moreInfo.media_preview_url)) {
          const prevUrl = (item.media_preview_url || moreInfo.media_preview_url).replace(/^http:\/\//i, 'https://');
          stream = {
            url: prevUrl,
            bitrate: 96,
          };
        }

        const rawTitle = item.song || item.title || '';
        const rawArtist =
          item.primary_artists ||
          moreInfo?.artistMap?.primary_artists?.map((a: any) => a.name).join(', ') ||
          item.subtitle ||
          '';

        return {
          id: item.id,
          title: rawTitle.replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
          artist: rawArtist.replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
          image: (item.image || '').replace('150x150', '500x500'),
          streamUrl: stream?.url || null,
          bitrate: stream?.bitrate || 320,
          durationSec: parseInt(moreInfo.duration || item.duration || '0', 10),
        };
      });
    } catch (e) {
      console.warn('JioSaavn search failed', e);
      return [];
    }
  }

  /**
   * Matches YouTube Song against JioSaavn to find high-bitrate 320kbps stream.
   * Strictly verified via TrackMatcher to completely eliminate wrong-song playback.
   */
  public async findMatch(
    title: string,
    artist: string,
    durationSec?: number | null
  ): Promise<string | null> {
    const cacheKey = `${title}__${artist}__${durationSec || 0}`.toLowerCase();
    if (this.matchCache.has(cacheKey)) {
      return this.matchCache.get(cacheKey) || null;
    }

    const target: TargetTrack = {
      title,
      artist,
      durationSec: durationSec || null,
    };

    const cleanTitle = title
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\b(official|music|video|audio|lyrics|lyric|hd|4k|full song|teaser|trailer|remastered|remaster|extended|mix)\b/gi, '')
      .replace(/feat\.?/gi, '')
      .replace(/ft\.?/gi, '')
      .replace(/[-|•–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const cleanArtist = (artist || '')
      .split('•')[0]
      .split(',')[0]
      .split('&')[0]
      .split('-')[0]
      .replace(/\s+/g, ' ')
      .trim();

    // 1. Try search with title and artist
    let candidates: CandidateTrack[] = [];
    if (cleanTitle && cleanArtist) {
      const results = await this.search(`${cleanTitle} ${cleanArtist}`);
      candidates = results.map((r) => ({
        id: r.id,
        title: r.title,
        artist: r.artist,
        durationSec: r.durationSec,
        streamUrl: r.streamUrl,
        bitrate: r.bitrate,
      }));

      const verified = TrackMatcher.best(candidates, target);
      if (verified?.streamUrl) {
        this.matchCache.set(cacheKey, verified.streamUrl);
        return verified.streamUrl;
      }
    }

    // 2. Try title only if artist query was too specific, but STILL enforce TrackMatcher
    if (cleanTitle) {
      const results = await this.search(cleanTitle);
      candidates = results.map((r) => ({
        id: r.id,
        title: r.title,
        artist: r.artist,
        durationSec: r.durationSec,
        streamUrl: r.streamUrl,
        bitrate: r.bitrate,
      }));

      const verified = TrackMatcher.best(candidates, target);
      if (verified?.streamUrl) {
        this.matchCache.set(cacheKey, verified.streamUrl);
        return verified.streamUrl;
      }
    }

    // 3. Try primary title segment (before any hyphen or delimiter) with TrackMatcher
    const shortTitle = title.split(/[-–—(|[]/)[0].trim();
    if (shortTitle && shortTitle !== cleanTitle) {
      const results = await this.search(shortTitle);
      candidates = results.map((r) => ({
        id: r.id,
        title: r.title,
        artist: r.artist,
        durationSec: r.durationSec,
        streamUrl: r.streamUrl,
        bitrate: r.bitrate,
      }));

      const verified = TrackMatcher.best(candidates, target);
      if (verified?.streamUrl) {
        this.matchCache.set(cacheKey, verified.streamUrl);
        return verified.streamUrl;
      }
    }

    // Absolutely NO unverified fallback! Reject and return null.
    this.matchCache.set(cacheKey, null);
    return null;
  }
}

export const jioSaavnService = new JioSaavnService();

