import { SidepanelShell } from '@/components/layout/sidepanel-shell';
import { DashboardView } from '@/components/panels/dashboard-view';
import { CategoryView } from '@/components/panels/category-view';
import { ToolDetailPanel } from '@/components/panels/tool-detail-panel';
import { SettingsPanel } from '@/components/panels/settings-panel';
import { AIChatPanel } from '@/components/panels/ai-chat-panel';
import { CommandPalette } from '@/components/command-palette/command-palette';
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay';
import { useUIStore } from '@/stores/use-ui-store';
import { useAppInit } from '@/hooks/use-app-init';

function ViewRouter() {
  const currentView = useUIStore((s) => s.currentView);

  switch (currentView) {
    case 'dashboard':
      return <DashboardView />;
    case 'category':
      return <CategoryView />;
    case 'tool-detail':
      return <ToolDetailPanel />;
    case 'settings':
      return <SettingsPanel />;
    case 'ai-chat':
      return <AIChatPanel />;
    default:
      return <DashboardView />;
  }
}

function SidepanelApp() {
  useAppInit();

  return (
    <SidepanelShell>
      <ViewRouter />
      <CommandPalette />
      <OnboardingOverlay />
    </SidepanelShell>
  );
}

export default SidepanelApp;
