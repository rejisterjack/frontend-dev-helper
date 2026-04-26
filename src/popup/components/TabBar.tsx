/**
 * FrontendDevHelper - Tab Bar Component
 *
 * Tab navigation for the popup.
 */

import type React from 'react';

export interface TabBarProps {
  /** Currently active tab */
  activeTab: 'tools' | 'performance' | 'inspector' | 'settings';
  /** Callback when tab is changed */
  onTabChange: (tab: 'tools' | 'performance' | 'inspector' | 'settings') => void;
}

const TABS: Array<{
  id: 'tools' | 'performance' | 'inspector' | 'settings';
  label: string;
  icon: string;
}> = [
  { id: 'tools', label: 'Tools', icon: '🔧' },
  { id: 'performance', label: 'Performance', icon: '⚡' },
  { id: 'inspector', label: 'Inspector', icon: '🔍' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav
      className="flex w-full min-w-0 items-center border-b border-slate-700/50 bg-[#111827] px-1"
      aria-label="Popup sections"
    >
      {TABS.map((tab) => (
        <button
          type="button"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            min-w-0 flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1.5
            text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative
            ${
              activeTab === tab.id
                ? 'text-primary-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2937]/50'
            }
          `}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="text-sm">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 shadow-[0_-2px_8px_rgba(79,70,229,0.5)] rounded-t-full" />
          )}
        </button>
      ))}
    </nav>
  );
};

export default TabBar;
