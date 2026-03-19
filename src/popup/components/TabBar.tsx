/**
 * Tab Bar Component
 */

import React from 'react';
import type { UITab } from '@/types';

interface TabBarProps {
  tabs: UITab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex border-b border-dev-border bg-dev-surface">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          disabled={tab.disabled}
          className={`relative flex flex-1 flex-col items-center py-2 text-xs transition-colors ${
            activeTab === tab.id
              ? 'text-primary-400'
              : 'text-dev-muted hover:text-dev-text'
          } ${tab.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <span className="mb-1 text-base">{tab.icon}</span>
          <span>{tab.label}</span>
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
          )}
          {tab.badge && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-dev-error px-1 text-[10px] text-white">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
