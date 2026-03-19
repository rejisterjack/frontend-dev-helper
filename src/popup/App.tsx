import React, { useState, useEffect } from 'react';
import { FaCode, FaPalette, FaRuler, FaFont, FaImage, FaCog } from 'react-icons/fa';

// Tool tab type
type ToolTab = 'inspector' | 'colors' | 'layout' | 'typography' | 'assets' | 'settings';

// Tab configuration
const tabs: { id: ToolTab; label: string; icon: React.ReactNode }[] = [
  { id: 'inspector', label: 'Inspector', icon: <FaCode /> },
  { id: 'colors', label: 'Colors', icon: <FaPalette /> },
  { id: 'layout', label: 'Layout', icon: <FaRuler /> },
  { id: 'typography', label: 'Typography', icon: <FaFont /> },
  { id: 'assets', label: 'Assets', icon: <FaImage /> },
  { id: 'settings', label: 'Settings', icon: <FaCog /> },
];

// Placeholder components for each tab
const InspectorTab: React.FC = () => (
  <div className="p-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-3">Element Inspector</h3>
    <p className="text-sm text-gray-600 mb-4">
      Click on any element in the page to inspect its properties.
    </p>
    <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
      <FaCode />
      Enable Inspector
    </button>
  </div>
);

const ColorsTab: React.FC = () => (
  <div className="p-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-3">Color Picker</h3>
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
        <div className="w-10 h-10 rounded-md bg-blue-500" />
        <div>
          <p className="font-medium text-gray-900">#3B82F6</p>
          <p className="text-xs text-gray-500">rgb(59, 130, 246)</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
        <div className="w-10 h-10 rounded-md bg-green-500" />
        <div>
          <p className="font-medium text-gray-900">#10B981</p>
          <p className="text-xs text-gray-500">rgb(16, 185, 129)</p>
        </div>
      </div>
    </div>
  </div>
);

const LayoutTab: React.FC = () => (
  <div className="p-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-3">Layout Tools</h3>
    <div className="grid grid-cols-2 gap-3">
      <button className="p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium">
        Grid Overlay
      </button>
      <button className="p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium">
        Measure Tool
      </button>
      <button className="p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium">
        Alignment
      </button>
      <button className="p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium">
        Spacing
      </button>
    </div>
  </div>
);

const TypographyTab: React.FC = () => (
  <div className="p-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-3">Typography</h3>
    <div className="space-y-4">
      <div className="p-3 border border-gray-200 rounded-md">
        <p className="text-2xl font-bold mb-1">Heading</p>
        <p className="text-xs text-gray-500">32px / Bold / Inter</p>
      </div>
      <div className="p-3 border border-gray-200 rounded-md">
        <p className="text-base mb-1">Body text</p>
        <p className="text-xs text-gray-500">16px / Regular / Inter</p>
      </div>
    </div>
  </div>
);

const AssetsTab: React.FC = () => (
  <div className="p-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-3">Page Assets</h3>
    <p className="text-sm text-gray-600 mb-3">
      Images, fonts, and other assets detected on this page.
    </p>
    <div className="text-center py-8 text-gray-400">
      <FaImage className="w-12 h-12 mx-auto mb-2" />
      <p className="text-sm">No assets detected yet</p>
    </div>
  </div>
);

const SettingsTab: React.FC = () => (
  <div className="p-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-3">Settings</h3>
    <div className="space-y-4">
      <label className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Dark Mode</span>
        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" />
      </label>
      <label className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Show Grid Lines</span>
        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" />
      </label>
      <label className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Auto-inspect</span>
        <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600" />
      </label>
    </div>
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ToolTab>('inspector');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initialization
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'inspector':
        return <InspectorTab />;
      case 'colors':
        return <ColorsTab />;
      case 'layout':
        return <LayoutTab />;
      case 'typography':
        return <TypographyTab />;
      case 'assets':
        return <AssetsTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <InspectorTab />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <FaCode className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">FrontendDevHelper</h1>
            <p className="text-xs text-blue-100">v1.0.0</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-blue-100">Active</span>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap
              transition-colors border-b-2 -mb-px
              ${activeTab === tab.id
                ? 'text-blue-600 border-blue-600 bg-white'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </main>

      {/* Footer */}
      <footer className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">Ctrl+Shift+F</kbd> to open
        </p>
      </footer>
    </div>
  );
};

export default App;
