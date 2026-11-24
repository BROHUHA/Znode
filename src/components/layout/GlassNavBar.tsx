import React from 'react';
import { NavTab } from './DesktopSidebar';
import { MiniPlayer } from '../player/MiniPlayer';
import { usePlayerStore } from '../../stores/playerStore';

interface GlassNavBarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isInline: boolean;
  onExpand: () => void;
}

export const GlassNavBar: React.FC<GlassNavBarProps> = ({
  currentTab,
  onSelectTab,
  isInline,
  onExpand,
}) => {
  const { currentSong, isNowPlayingOpen } = usePlayerStore();

  const tabs: { id: NavTab; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'explore', label: 'Explore' },
    { id: 'library', label: 'Library' },
  ];

  const renderTabIcon = (tabId: NavTab, isActive: boolean) => {
    switch (tabId) {
      case 'home':
        return (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={isActive ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={isActive ? '0' : '2'}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9.5z" />
          </svg>
        );
      case 'explore':
        return (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={isActive ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={isActive ? '0' : '2'}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7.5" height="7.5" rx="2.5" />
            <rect x="13.5" y="3" width="7.5" height="7.5" rx="2.5" />
            <rect x="3" y="13.5" width="7.5" height="7.5" rx="2.5" />
            <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.5" />
          </svg>
        );
      case 'library':
        return (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={isActive ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3.5h8" strokeWidth="2.5" />
            <rect x="4" y="6.5" width="16" height="14" rx="3.5" />
          </svg>
        );
      case 'search':
        return (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
        );
    }
  };

  const isSearchActive = currentTab === 'search';
  const activeTabIndex = tabs.findIndex((t) => t.id === currentTab);

  return (
    <nav
      aria-label="Mobile Navigation"
      style={{
        transition: 'opacity 320ms cubic-bezier(0.32, 0.72, 0, 1), transform 380ms cubic-bezier(0.32, 0.72, 0, 1)',
      }}
      className={`md:hidden fixed bottom-3 inset-x-3 z-40 max-w-md mx-auto select-none pointer-events-none origin-bottom ${
        isNowPlayingOpen ? 'opacity-0 scale-[0.94] translate-y-2' : 'opacity-100 scale-100 translate-y-0'
      }`}
    >
      {/* Shared-Element Morph Stage matching YZ-Music FloatingTabBar.kt */}
      <div className="relative w-full h-[120px]">
        {/* 1. Single MiniPlayer Pill: glides down & narrows from full-width (bottom: 64px) into inline center slot (bottom: 0, left/right: 64px) */}
        {currentSong && (
          <div
            style={{
              bottom: isInline ? 0 : 64,
              left: isInline ? 64 : 0,
              right: isInline ? 64 : 0,
              transition:
                'bottom 420ms cubic-bezier(0.32, 0.72, 0, 1), left 420ms cubic-bezier(0.32, 0.72, 0, 1), right 420ms cubic-bezier(0.32, 0.72, 0, 1)',
              willChange: 'bottom, left, right',
            }}
            className={`absolute h-14 z-20 ${isNowPlayingOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
          >
            <MiniPlayer isInline={isInline} />
          </div>
        )}

        {/* 2. Single Tab Pill: morphs smoothly between full-width 3-tab pill and 56px active-tab circle */}
        <div
          onClick={isInline ? onExpand : undefined}
          style={{
            width: isInline ? 56 : 'calc(100% - 64px)',
            transition: 'width 420ms cubic-bezier(0.32, 0.72, 0, 1)',
            willChange: 'width',
          }}
          className={`!absolute bottom-0 left-0 h-14 rounded-full liquid-glass-surface flex items-center overflow-hidden z-10 ${
            isInline ? 'justify-center cursor-pointer active:scale-[1.03]' : 'p-1.5'
          } ${isNowPlayingOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
          title={isInline ? 'Tap to expand navigation tabs' : undefined}
        >
          {/* Gliding Active Pill (visible in expanded mode) */}
          {activeTabIndex >= 0 && (
            <div
              aria-hidden="true"
              className="absolute inset-y-1.5 left-1.5 w-[calc((100%-12px)/3)] rounded-full pointer-events-none z-0 liquid-glass-tab-pill will-change-transform"
              style={{
                transform: `translateX(${activeTabIndex * 100}%)`,
                opacity: isInline ? 0 : 1,
                transition: 'transform 400ms cubic-bezier(0.34, 1.4, 0.64, 1), opacity 200ms ease',
              }}
            />
          )}

          {tabs.map((tab) => {
            const isActive = currentTab === tab.id || (currentTab === 'search' && tab.id === 'home');
            const isVisibleInInline = isInline && isActive;

            return (
              <button
                key={tab.id}
                onClick={(e) => {
                  if (isInline) {
                    e.stopPropagation();
                    onExpand();
                  } else {
                    onSelectTab(tab.id);
                  }
                }}
                className={`relative z-10 flex flex-col items-center justify-center h-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer overflow-hidden ${
                  isInline
                    ? isVisibleInInline
                      ? 'w-14 opacity-100 scale-100 text-white'
                      : 'w-0 opacity-0 scale-75 pointer-events-none'
                    : `flex-1 ${
                        currentTab === tab.id
                          ? 'text-white scale-[1.03] drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] font-bold'
                          : 'text-white/60 hover:text-white active:scale-95 font-medium'
                      }`
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {renderTabIcon(tab.id, currentTab === tab.id || isVisibleInInline)}
                </div>
                <span
                  className={`text-[10.5px] tracking-tight leading-none transition-all duration-200 overflow-hidden ${
                    isInline ? 'max-h-0 opacity-0 mt-0' : 'max-h-4 opacity-100 mt-0.5'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. Standalone Search Circle (anchored bottom-right, always persistent) */}
        <button
          onClick={() => {
            if (isInline) onExpand();
            onSelectTab('search');
          }}
          className={`!absolute bottom-0 right-0 w-14 h-14 rounded-full liquid-glass-surface overflow-hidden flex items-center justify-center active:scale-[1.03] transition-all duration-200 ease-[cubic-bezier(0.34,1.45,0.64,1)] cursor-pointer z-10 ${
            isNowPlayingOpen ? 'pointer-events-none' : 'pointer-events-auto'
          } ${
            isSearchActive
              ? 'text-white ring-2 ring-white/40 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
              : 'text-white/75 hover:text-white'
          }`}
          title="Search"
          aria-label="Search"
        >
          <div className="relative z-10 w-6 h-6 flex items-center justify-center">
            {renderTabIcon('search', isSearchActive)}
          </div>
        </button>
      </div>
    </nav>
  );
};
