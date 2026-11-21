import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DesktopSidebar, NavTab } from './DesktopSidebar';
import { GlassNavBar } from './GlassNavBar';
import { FrostedTopBar } from './FrostedTopBar';
import { MiniPlayer } from '../player/MiniPlayer';
import { NowPlayingScreen } from '../player/NowPlayingScreen';
import { HomeView } from '../../views/HomeView';
import { ExploreView } from '../../views/ExploreView';
import { SearchView } from '../../views/SearchView';
import { LibraryView } from '../../views/LibraryView';
import { DetailView } from '../../views/DetailView';
import { EqualizerModal } from '../common/EqualizerModal';
import { SettingsModal } from '../common/SettingsModal';
import { ListenTogetherModal } from '../common/ListenTogetherModal';
import { AccountModal } from '../common/AccountModal';
import { KeyboardShortcutsModal } from '../common/KeyboardShortcutsModal';
import { SleepTimerModal } from '../common/SleepTimerModal';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useUniversalBackNavigation } from '../../hooks/useUniversalBackNavigation';
import { BrowseTarget } from '../../types';
import { usePlayerStore } from '../../stores/playerStore';
import { useSearchStore } from '../../stores/searchStore';
import { cleanThumbnailUrl } from '../../utils/thumbnail';

export const AppShell: React.FC = () => {
  const { currentSong } = usePlayerStore();
  const { results: searchResults } = useSearchStore();
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isBottomInline, setIsBottomInline] = useState(false);
  const accumulatedDelta = useRef(0);
  const lastScrollY = useRef(0);
  const [selectedBrowse, setSelectedBrowse] = useState<BrowseTarget | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showListenTogether, setShowListenTogether] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);

  // Universal Mobile Back Gestures & Browser History Stack Manager
  const { goBack, isSwipingEdge, edgeSwipeProgress, exitToastVisible } = useUniversalBackNavigation({
    currentTab,
    setCurrentTab,
    selectedBrowse,
    setSelectedBrowse,
    modals: {
      showSettings,
      setShowSettings,
      showEqualizer,
      setShowEqualizer,
      showListenTogether,
      setShowListenTogether,
      showAccountModal,
      setShowAccountModal,
      showShortcutsModal,
      setShowShortcutsModal,
      showSleepTimer,
      setShowSleepTimer,
    },
  });

  // Dynamic blurred artwork background state (100% accurate song artwork color theme)
  const currentArtwork = currentSong?.thumbnailUrl
    ? cleanThumbnailUrl(currentSong.thumbnailUrl, currentSong.videoId)
    : null;

  const [activeArtwork, setActiveArtwork] = useState<string | null>(null);
  const [fadingArtwork, setFadingArtwork] = useState<string | null>(null);

  useEffect(() => {
    if (currentArtwork && currentArtwork !== activeArtwork) {
      setFadingArtwork(activeArtwork);
      setActiveArtwork(currentArtwork);
      const timer = setTimeout(() => {
        setFadingArtwork(null);
      }, 800);
      return () => clearTimeout(timer);
    } else if (!currentArtwork) {
      setActiveArtwork(null);
      setFadingArtwork(null);
    }
  }, [currentArtwork, activeArtwork]);

  // Desktop Keyboard Shortcuts handler (Space = play/pause, Left/Right = skip 10s)
  useKeyboardShortcuts({
    onToggleShortcutsModal: () => setShowShortcutsModal((prev) => !prev),
    onCloseModals: () => {
      setShowSettings(false);
      setShowEqualizer(false);
      setShowListenTogether(false);
      setShowAccountModal(false);
      setShowShortcutsModal(false);
    },
  });

  // Expand bottom chrome when a new track starts playing
  React.useEffect(() => {
    if (currentSong) {
      setIsBottomInline(false);
      accumulatedDelta.current = 0;
    }
  }, [currentSong?.videoId]);

  const handleOpenDetail = (
    browseId: string,
    params?: string,
    title?: string,
    subtitle?: string,
    thumbnailUrl?: string | null,
    type?: string
  ) => {
    setSelectedBrowse({ browseId, params, title, subtitle, thumbnailUrl, type });
  };

  const handleSelectTab = (tab: NavTab) => {
    setSelectedBrowse(null);
    setCurrentTab(tab);
    setIsBottomInline(false);
    accumulatedDelta.current = 0;
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    setIsScrolled(currentScrollY > 20);

    const deltaY = currentScrollY - lastScrollY.current;

    // If near the top, always keep fully expanded
    if (currentScrollY <= 25) {
      setIsBottomInline(false);
      accumulatedDelta.current = 0;
    } else {
      // Reset accumulated scroll on direction reversal
      if (
        (accumulatedDelta.current > 0 && deltaY < 0) ||
        (accumulatedDelta.current < 0 && deltaY > 0)
      ) {
        accumulatedDelta.current = 0;
      }
      accumulatedDelta.current += deltaY;

      // Scrolling down past threshold -> shrink to inline single row
      if (accumulatedDelta.current >= 28) {
        setIsBottomInline(true);
        accumulatedDelta.current = 0;
      }
      // Scrolling up past threshold -> expand back to two-tier full view
      else if (accumulatedDelta.current <= -24) {
        setIsBottomInline(false);
        accumulatedDelta.current = 0;
      }
    }

    lastScrollY.current = currentScrollY;
  };

  const getTitle = () => {
    if (selectedBrowse) return selectedBrowse.title || 'Collection';
    switch (currentTab) {
      case 'home':
        return 'Listen Now';
      case 'explore':
        return 'Explore';
      case 'library':
        return 'Library';
      case 'search':
        return 'Search';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden text-white select-none relative bg-[#07070a]">
      {/* 100% Accurate Dynamic Blurred Artwork Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        {/* Fading Out Previous Artwork Layer for seamless crossfades */}
        {fadingArtwork && (
          <img
            key={`fade-out-${fadingArtwork}`}
            src={fadingArtwork}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-center filter blur-[36px] sm:blur-[48px] saturate-[170%] brightness-[0.76] pointer-events-none animate-bg-fadeout"
          />
        )}

        {/* Current Active Track Blurred Artwork Layer */}
        {activeArtwork ? (
          <img
            key={`active-${activeArtwork}`}
            src={activeArtwork}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-center filter blur-[36px] sm:blur-[48px] saturate-[170%] brightness-[0.76] pointer-events-none animate-bg-crossfade"
          />
        ) : (
          /* Subtle default ambient wash when no track is playing */
          <div className="absolute inset-0 bg-gradient-to-br from-[#FA2D48]/14 via-[#8B5CF6]/10 to-transparent filter blur-[60px] opacity-40 pointer-events-none" />
        )}

        {/* Contrast Scrim: ensures sharp legibility for text, capsules & cards */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      </div>

      {/* 1. Desktop Sidebar (Left side, >= 768px) */}
      <DesktopSidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenAccount={() => setShowAccountModal(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenEqualizer={() => setShowEqualizer(true)}
        onOpenListenTogether={() => setShowListenTogether(true)}
        onOpenSleepTimer={() => setShowSleepTimer(true)}
        isSettingsOpen={showSettings}
        isEqualizerOpen={showEqualizer}
        isListenTogetherOpen={showListenTogether}
        isSleepTimerOpen={showSleepTimer}
      />

      {/* 2. Main Content Feed (Center) */}
      <div className="flex-1 h-full overflow-hidden relative z-10">
        {/* Scrollable feed: full height, content starts under the top bar with padding */}
        <main
          onScroll={handleScroll}
          className={`h-full overflow-y-auto overflow-x-hidden relative scrollbar-none transition-[padding] duration-300 ${
            currentTab === 'search' && !selectedBrowse && searchResults !== null
              ? 'pt-24 sm:pt-28'
              : 'pt-14 sm:pt-16'
          } ${
            currentSong ? 'pb-44 md:pb-28 lg:pb-8' : 'pb-24 md:pb-12 lg:pb-8'
          }`}
          style={{
            transform: 'translate3d(0, 0, 0)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {selectedBrowse ? (
            <DetailView
              browseId={selectedBrowse.browseId}
              params={selectedBrowse.params}
              initialTitle={selectedBrowse.title}
              initialSubtitle={selectedBrowse.subtitle}
              initialThumbnailUrl={selectedBrowse.thumbnailUrl}
              initialType={selectedBrowse.type}
              onBack={goBack}
              onOpenDetail={handleOpenDetail}
              onTitleLoaded={(title) => {
                setSelectedBrowse((prev) => (prev ? { ...prev, title } : null));
              }}
            />
          ) : (
            <>
              {currentTab === 'home' && <HomeView onOpenDetail={handleOpenDetail} />}
              {currentTab === 'explore' && <ExploreView onOpenDetail={handleOpenDetail} />}
              {currentTab === 'search' && <SearchView onOpenDetail={handleOpenDetail} />}
              {currentTab === 'library' && (
                <LibraryView
                  onOpenDetail={handleOpenDetail}
                  onOpenAccount={() => setShowAccountModal(true)}
                />
              )}
            </>
          )}
        </main>

        {/* Top Fade Blur Layer (Pure transparent liquid glass blur) */}
        <div className="top-fade-blur" />

        {/* Top Fade Scrim Layer (Clean, transparent neutral glass fade) */}
        <div className="top-fade-scrim" />

        {/* Floating FrostedTopBar over TopFadeBlur */}
        <FrostedTopBar
          title={getTitle()}
          isSearch={currentTab === 'search' && !selectedBrowse}
          scrolled={isScrolled}
          onBack={selectedBrowse ? goBack : undefined}
          className="absolute top-0 left-0 right-0 z-30"
          onOpenSettings={() => setShowSettings(true)}
          onOpenEqualizer={() => setShowEqualizer(true)}
          onOpenListenTogether={() => setShowListenTogether(true)}
          onOpenSleepTimer={() => setShowSleepTimer(true)}
          onOpenAccount={() => setShowAccountModal(true)}
          onOpenDetail={handleOpenDetail}
        />

        {/* Floating MiniPlayer Pill (Tablet viewports 768px-1023px) */}
        <div className="hidden md:block lg:hidden fixed bottom-5 inset-x-auto left-1/2 -translate-x-1/2 w-[calc(100%-18rem)] max-w-xl z-40">
          <MiniPlayer isInline={false} />
        </div>

        {/* Mobile Bottom Fade Scrim: Dissolves scrolling items smoothly above bottom navigation */}
        <div className="md:hidden bottom-fade-scrim" />

        {/* Mobile Liquid Glass Navigation Bar with Integrated Expand/Shrink Player */}
        <GlassNavBar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          isInline={isBottomInline}
          onExpand={() => setIsBottomInline(false)}
        />
      </div>

      {/* 3. Persistent Docked Player Pane (Right side on Desktop >= 1024px) */}
      <NowPlayingScreen
        isDocked={true}
        onOpenDetail={handleOpenDetail}
        onOpenListenTogether={() => setShowListenTogether(true)}
        onOpenEqualizer={() => setShowEqualizer(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenSleepTimer={() => setShowSleepTimer(true)}
      />

      {/* 4. Full-screen gesture-driven Now Playing overlay on Mobile */}
      <NowPlayingScreen
        isDocked={false}
        onOpenDetail={handleOpenDetail}
        onOpenListenTogether={() => setShowListenTogether(true)}
        onOpenEqualizer={() => setShowEqualizer(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenSleepTimer={() => setShowSleepTimer(true)}
      />

      {/* Modals & Dialogs */}
      <EqualizerModal isOpen={showEqualizer} onClose={() => setShowEqualizer(false)} />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onOpenAccount={() => setShowAccountModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenSleepTimer={() => setShowSleepTimer(true)}
      />
      <SleepTimerModal isOpen={showSleepTimer} onClose={() => setShowSleepTimer(false)} />
      <ListenTogetherModal isOpen={showListenTogether} onClose={() => setShowListenTogether(false)} />
      <AccountModal isOpen={showAccountModal} onClose={() => setShowAccountModal(false)} />
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Universal Mobile Edge-Swipe-to-Go-Back Visual Indicator */}
      {isSwipingEdge && (
        <div
          className="fixed left-0 top-1/2 -translate-y-1/2 z-[9999] pointer-events-none transition-transform duration-75 ease-out"
          style={{
            transform: `translateY(-50%) translateX(${edgeSwipeProgress * 26}px) scale(${0.75 + edgeSwipeProgress * 0.3})`,
            opacity: Math.min(edgeSwipeProgress * 1.6, 1),
          }}
        >
          <div className="w-12 h-16 rounded-r-3xl liquid-glass border-y border-r border-white/35 flex items-center justify-center pl-1 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-3xl">
            <ArrowLeft className="w-5 h-5 text-white animate-pulse" />
          </div>
        </div>
      )}

      {/* Mobile Universal Back Toast (Prevents Sudden App Exit) */}
      {exitToastVisible && (
        <div className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-scale-in">
          <div className="px-5 py-2.5 rounded-full liquid-glass border border-white/25 shadow-2xl backdrop-blur-3xl text-white text-xs font-semibold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
            <span>Press back again to exit</span>
          </div>
        </div>
      )}
    </div>
  );
};

