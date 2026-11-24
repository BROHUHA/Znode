import React, { useState } from 'react';
import { Compass, Home, Library, Search, User, Users, Sliders, Settings, Moon } from 'lucide-react';
import { YouTubeMusicLogo } from '../common/YouTubeMusicLogo';
import { useAuthStore } from '../../stores/authStore';
import { usePlayerStore } from '../../stores/playerStore';

export type NavTab = 'home' | 'explore' | 'library' | 'search';

interface DesktopSidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAccount?: () => void;
  onOpenSettings?: () => void;
  onOpenEqualizer?: () => void;
  onOpenListenTogether?: () => void;
  onOpenSleepTimer?: () => void;
  isSettingsOpen?: boolean;
  isEqualizerOpen?: boolean;
  isListenTogetherOpen?: boolean;
  isSleepTimerOpen?: boolean;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAccount,
  onOpenSettings,
  onOpenEqualizer,
  onOpenListenTogether,
  onOpenSleepTimer,
  isSettingsOpen = false,
  isEqualizerOpen = false,
  isListenTogetherOpen = false,
  isSleepTimerOpen = false,
}) => {
  const { isSignedIn, account } = useAuthStore();
  const { sleepTimerEndTime, sleepTimerEndOfTrack } = usePlayerStore();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const navItems = [
    { id: 'home' as const, label: 'Listen Now', icon: Home, onClick: () => onSelectTab('home') },
    { id: 'explore' as const, label: 'Explore', icon: Compass, onClick: () => onSelectTab('explore') },
    { id: 'library' as const, label: 'Library', icon: Library, onClick: () => onSelectTab('library') },
    { id: 'search' as const, label: 'Search', icon: Search, onClick: () => onSelectTab('search') },
    ...(onOpenEqualizer
      ? [{ id: 'equalizer' as const, label: 'Equalizer', icon: Sliders, onClick: onOpenEqualizer }]
      : []),
    ...(onOpenSleepTimer
      ? [
          {
            id: 'sleep-timer' as const,
            label: sleepTimerEndTime || sleepTimerEndOfTrack ? 'Sleep Timer (On)' : 'Sleep Timer',
            icon: Moon,
            onClick: onOpenSleepTimer,
          },
        ]
      : []),
    ...(onOpenListenTogether
      ? [{ id: 'listen-together' as const, label: 'Listen Together', icon: Users, onClick: onOpenListenTogether }]
      : []),
    ...(onOpenSettings
      ? [{ id: 'settings' as const, label: 'Settings', icon: Settings, onClick: onOpenSettings }]
      : []),
  ];

  // Determine active item id: accounts for modals if opened, otherwise currentTab
  const activeId = isSettingsOpen
    ? 'settings'
    : isEqualizerOpen
    ? 'equalizer'
    : isSleepTimerOpen
    ? 'sleep-timer'
    : isListenTogetherOpen
    ? 'listen-together'
    : currentTab;

  const activeIndex = navItems.findIndex((it) => it.id === activeId);

  return (
    <aside
      className={`hidden md:flex flex-col h-full liquid-glass-sidebar shrink-0 select-none relative z-20 p-3.5 overflow-hidden transition-[width] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isCollapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      {/* Brand Header: Logo click expands & shrinks the sidebar smoothly without icon jump */}
      <div className="mb-5">
        <button
          onClick={toggleCollapse}
          className="w-full h-12 flex items-center justify-start cursor-pointer min-w-0 group rounded-2xl overflow-hidden transition-colors duration-200 hover:bg-white/[0.06] active:scale-[0.97]"
          title={isCollapsed ? 'Click to expand sidebar' : 'Click to shrink sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            <div className="transition-transform duration-300 group-hover:scale-110 shadow-lg rounded-full">
              <YouTubeMusicLogo size={34} />
            </div>
          </div>
          <div
            className={`min-w-0 flex-1 pr-3 text-left transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isCollapsed
                ? 'opacity-0 -translate-x-2 pointer-events-none'
                : 'opacity-100 translate-x-0'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-base tracking-tight text-white leading-tight truncate group-hover:text-white">
                Znode Music
              </span>
              <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md bg-white/10 text-white/80 border border-white/10 tracking-wider shrink-0">
                ZN
              </span>
            </div>
            <span className="text-[10.5px] text-white/50 font-medium tracking-wide truncate block group-hover:text-white/70 mt-0.5">
              Znode Web Player
            </span>
          </div>
        </button>
      </div>

      {/* Navigation Links with Optimized Gliding Selection Animation */}
      <nav className="flex flex-col gap-1.5 flex-1 relative overflow-y-auto overflow-x-hidden scrollbar-none">
        {/* Animated Gliding Active Indicator Pill (stretches/shrinks smoothly with sidebar width) */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-12 pointer-events-none z-0 rounded-2xl sidebar-active-pill"
          style={{
            transform: `translateY(${activeIndex * 54}px)`,
            opacity: activeIndex >= 0 ? 1 : 0,
            transition: 'transform 360ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms ease',
          }}
        />

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`relative z-10 w-full h-12 flex items-center justify-start rounded-2xl font-medium text-sm overflow-hidden transition-colors duration-200 cursor-pointer group outline-none focus:outline-none focus-visible:outline-none border-none select-none active:scale-[0.98] ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={isCollapsed ? item.label : undefined}
              aria-label={item.label}
            >
              <div
                className={`w-12 h-12 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                  isActive ? 'scale-105' : 'group-hover:scale-105'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              <span
                className={`whitespace-nowrap pr-3 text-left transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isCollapsed
                    ? 'opacity-0 -translate-x-2 pointer-events-none'
                    : 'opacity-100 translate-x-0'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Account Profile Widget: Smoothly morphs without icon jump */}
      <div className="mt-auto pt-3">
        {onOpenAccount && (
          <button
            onClick={onOpenAccount}
            className="relative w-full h-12 flex items-center justify-start rounded-2xl liquid-glass border border-white/10 hover:border-white/25 overflow-hidden transition-colors duration-200 cursor-pointer active:scale-[0.97] group"
            title={isSignedIn ? `${account?.name || 'Account'} (Signed In)` : 'Sign in to YouTube Music'}
          >
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              {isSignedIn && account?.thumbnailUrl ? (
                <img
                  src={account.thumbnailUrl}
                  alt={account.name}
                  className="w-8 h-8 rounded-full object-cover border border-white/20"
                />
              ) : isSignedIn ? (
                <div className="w-8 h-8 rounded-full bg-accent-red/20 border border-accent-red/40 flex items-center justify-center text-accent-red font-bold text-xs">
                  {account?.name ? account.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/70">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>

            <div
              className={`flex-1 min-w-0 pr-3 text-left transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isCollapsed
                  ? 'opacity-0 -translate-x-2 pointer-events-none'
                  : 'opacity-100 translate-x-0'
              }`}
            >
              <div className="text-xs font-bold text-white truncate">
                {isSignedIn && account ? account.name : 'Sign In'}
              </div>
              <div className="text-[10px] text-white/50 truncate">
                {isSignedIn && account ? account.email || 'YouTube Music' : 'Sync your playlists'}
              </div>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
};
