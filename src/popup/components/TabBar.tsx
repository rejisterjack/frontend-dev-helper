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
    <nav className="flex items-center border-b border-slate-700/50 bg-slate-800/50 px-1">
      {TABS.map((tab) => (
        <button
          type="button"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2
            text-xs font-medium transition-all relative
            ${
              activeTab === tab.id
                ? 'text-indigo-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
            }
          `}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="text-sm">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
          )}
        </button>
      ))}
    </nav>
  );
};

export default TabBar;
