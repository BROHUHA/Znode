/**
 * Znode Music Web - Home Feed Stale-While-Revalidate (SWR) Cache
 * Provides 0ms instant cold-start hydration and offline resilience
 */

import { HomeShelf, HomeChip } from '../types';

export interface CachedFeed {
  shelves: HomeShelf[];
  chips?: HomeChip[];
  continuation?: string | null;
  timestamp: number;
}

const CACHE_KEY = 'znode_home_feed_cache';
const CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours freshness window

export const feedCache = {
  /**
   * Retrieves cached home shelves for instant 0ms initial render.
   */
  loadHomeFeedCache(): CachedFeed | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed: CachedFeed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.shelves) || parsed.shelves.length === 0) {
        return null;
      }
      // Stale-While-Revalidate: Return cache even if past TTL for 0ms instant display,
      // background fetch will revalidate silently.
      if (Date.now() - (parsed.timestamp || 0) > CACHE_TTL_MS * 2) {
        // Only discard if older than 8 hours
        return null;
      }
      return parsed;
    } catch (e) {
      console.warn('Failed reading home feed cache:', e);
      return null;
    }
  },

  /**
   * Persists fetched feed to localStorage for subsequent instant loads.
   */
  saveHomeFeedCache(data: { shelves: HomeShelf[]; chips?: HomeChip[]; continuation?: string | null }) {
    if (typeof localStorage === 'undefined') return;
    try {
      // Keep up to 20 shelves in cache to prevent quota overflow
      const payload: CachedFeed = {
        shelves: (data.shelves || []).slice(0, 20),
        chips: data.chips,
        continuation: data.continuation,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed writing home feed cache:', e);
    }
  },

  /**
   * Clears the cache on explicit refresh or account switch
   */
  clearHomeFeedCache() {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
  },
};
