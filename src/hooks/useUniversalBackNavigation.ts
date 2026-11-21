import { useEffect, useRef, useState, useCallback } from 'react';
import { NavTab } from '../components/layout/DesktopSidebar';
import { BrowseTarget } from '../types';
import { usePlayerStore } from '../stores/playerStore';

export interface UniversalBackNavigationOptions {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  selectedBrowse: BrowseTarget | null;
  setSelectedBrowse: (target: BrowseTarget | null) => void;
  modals: {
    showSettings: boolean;
    setShowSettings: (val: boolean) => void;
    showEqualizer: boolean;
    setShowEqualizer: (val: boolean) => void;
    showListenTogether: boolean;
    setShowListenTogether: (val: boolean) => void;
    showAccountModal: boolean;
    setShowAccountModal: (val: boolean) => void;
    showShortcutsModal: boolean;
    setShowShortcutsModal: (val: boolean) => void;
    showSleepTimer: boolean;
    setShowSleepTimer: (val: boolean) => void;
  };
}

export function useUniversalBackNavigation({
  currentTab,
  setCurrentTab,
  selectedBrowse,
  setSelectedBrowse,
  modals,
}: UniversalBackNavigationOptions) {
  const { isNowPlayingOpen, setNowPlayingOpen, nowPlayingTab, setNowPlayingTab } = usePlayerStore();

  const [edgeSwipeProgress, setEdgeSwipeProgress] = useState<number>(0);
  const [isSwipingEdge, setIsSwipingEdge] = useState<boolean>(false);
  const [exitToastVisible, setExitToastVisible] = useState<boolean>(false);

  // Keep live references to avoid stale closure in popstate & touch event listeners
  const stateRef = useRef({
    currentTab,
    selectedBrowse,
    modals,
    isNowPlayingOpen,
    nowPlayingTab,
  });

  useEffect(() => {
    stateRef.current = {
      currentTab,
      selectedBrowse,
      modals,
      isNowPlayingOpen,
      nowPlayingTab,
    };
  }, [currentTab, selectedBrowse, modals, isNowPlayingOpen, nowPlayingTab]);

  const lastBackPressTime = useRef<number>(0);
  const exitToastTimer = useRef<any>(null);

  /**
   * Evaluates if any modal or non-root overlay is open
   */
  const getActiveOverlay = useCallback(() => {
    const s = stateRef.current;
    if (s.modals.showSleepTimer) return 'sleepTimer';
    if (s.modals.showSettings) return 'settings';
    if (s.modals.showEqualizer) return 'equalizer';
    if (s.modals.showListenTogether) return 'listenTogether';
    if (s.modals.showAccountModal) return 'account';
    if (s.modals.showShortcutsModal) return 'shortcuts';
    if (s.isNowPlayingOpen && s.nowPlayingTab !== 'PLAYER') return 'nowPlayingTab';
    if (s.isNowPlayingOpen) return 'nowPlaying';
    if (s.selectedBrowse) return 'detailView';
    if (s.currentTab !== 'home') return 'tab';
    return null;
  }, []);

  /**
   * The Master "Go Back" action that unwinds one layer in the app hierarchy
   */
  const executeGoBack = useCallback(() => {
    const s = stateRef.current;

    // 1. Close open modals first
    if (s.modals.showSleepTimer) {
      s.modals.setShowSleepTimer(false);
      return true;
    }
    if (s.modals.showSettings) {
      s.modals.setShowSettings(false);
      return true;
    }
    if (s.modals.showEqualizer) {
      s.modals.setShowEqualizer(false);
      return true;
    }
    if (s.modals.showListenTogether) {
      s.modals.setShowListenTogether(false);
      return true;
    }
    if (s.modals.showAccountModal) {
      s.modals.setShowAccountModal(false);
      return true;
    }
    if (s.modals.showShortcutsModal) {
      s.modals.setShowShortcutsModal(false);
      return true;
    }

    // 2. Now Playing screen: switch subtab (Lyrics/Queue -> Player) or minimize
    if (s.isNowPlayingOpen) {
      if (s.nowPlayingTab !== 'PLAYER') {
        setNowPlayingTab('PLAYER');
      } else {
        setNowPlayingOpen(false);
      }
      return true;
    }

    // 3. Detail View: return to previous view/feed
    if (s.selectedBrowse) {
      setSelectedBrowse(null);
      return true;
    }

    // 4. Navigation Tab: return to 'home' (Listen Now)
    if (s.currentTab !== 'home') {
      setCurrentTab('home');
      return true;
    }

    // 5. Already at Root (Listen Now, player minimized, no modals):
    // Double-tap back within 2.5s to exit, preventing sudden accidental exits on mobile
    const now = Date.now();
    if (now - lastBackPressTime.current < 2500) {
      // Allow natural exit on quick second back press
      return false;
    } else {
      lastBackPressTime.current = now;
      setExitToastVisible(true);
      if (exitToastTimer.current) clearTimeout(exitToastTimer.current);
      exitToastTimer.current = setTimeout(() => {
        setExitToastVisible(false);
      }, 2400);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(12);
        } catch {}
      }
      return true;
    }
  }, [setNowPlayingOpen, setNowPlayingTab, setSelectedBrowse, setCurrentTab]);

  // Sync with browser / Android system history stack
  useEffect(() => {
    // Prime the root history state
    if (typeof window !== 'undefined') {
      window.history.replaceState({ znodeRoot: true }, '');
    }

    const onPopState = () => {
      const handled = executeGoBack();
      if (handled) {
        // Keep a history cushion so future back gestures stay trapped in the app
        window.history.pushState({ znodeTrap: true }, '');
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [executeGoBack]);

  // When an overlay opens, push a synthetic history entry so back will pop it instead of exiting
  const prevOverlayRef = useRef<string | null>(null);
  useEffect(() => {
    const currentOverlay = getActiveOverlay();
    if (currentOverlay && !prevOverlayRef.current) {
      window.history.pushState({ znodeOverlay: currentOverlay }, '');
    }
    prevOverlayRef.current = currentOverlay;
  }, [
    currentTab,
    selectedBrowse,
    isNowPlayingOpen,
    nowPlayingTab,
    modals.showSleepTimer,
    modals.showSettings,
    modals.showEqualizer,
    modals.showListenTogether,
    modals.showAccountModal,
    modals.showShortcutsModal,
    getActiveOverlay,
  ]);

  // ── Universal Mobile Edge-Swipe-Right Gesture Engine ──
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isTrackingEdgeSwipe = useRef<boolean>(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];

      // Gesture must start near the left edge (within 36px)
      if (touch.clientX <= 36) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        touchStartTime.current = Date.now();
        isTrackingEdgeSwipe.current = true;
      } else {
        isTrackingEdgeSwipe.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isTrackingEdgeSwipe.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Abort if dominant vertical movement
      if (Math.abs(deltaY) > Math.abs(deltaX) * 0.8 && deltaX < 20) {
        isTrackingEdgeSwipe.current = false;
        setIsSwipingEdge(false);
        setEdgeSwipeProgress(0);
        return;
      }

      if (deltaX > 8) {
        setIsSwipingEdge(true);
        // Normalize progress between 0 and 1 (max pull at 120px)
        const progress = Math.min(Math.max((deltaX - 8) / 90, 0), 1);
        setEdgeSwipeProgress(progress);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isTrackingEdgeSwipe.current) return;
      isTrackingEdgeSwipe.current = false;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;
      const duration = Date.now() - touchStartTime.current;
      const velocity = deltaX / Math.max(duration, 1);

      // Trigger back if pulled past threshold or swiped fast horizontally
      if (
        (deltaX >= 70 && Math.abs(deltaY) < deltaX * 0.75) ||
        (velocity > 0.4 && deltaX >= 40 && Math.abs(deltaY) < deltaX * 0.6)
      ) {
        executeGoBack();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(15);
          } catch {}
        }
      }

      setIsSwipingEdge(false);
      setEdgeSwipeProgress(0);
    };

    const onTouchCancel = () => {
      isTrackingEdgeSwipe.current = false;
      setIsSwipingEdge(false);
      setEdgeSwipeProgress(0);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [executeGoBack]);

  return {
    goBack: executeGoBack,
    isSwipingEdge,
    edgeSwipeProgress,
    exitToastVisible,
  };
}
