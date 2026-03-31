/**
 * Dashboard Mode - Full-page dashboard
 *
 * Historical tracking, team collaboration, aggregated insights
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { TOOL_METADATA, type ToolId } from '@/constants';
import type { DebuggingSession } from '@/content/session-recorder';
import type { ResponsiveReport } from '@/content/responsive-testing';

interface DashboardStats {
  totalSessions: number;
  totalScreenshots: number;
  issuesFound: number;
  toolsUsed: Record<string, number>;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'session' | 'screenshot' | 'analysis' | 'team';
  title: string;
  description: string;
  timestamp: number;
  user?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'member' | 'viewer';
  lastActive: number;
}

const DashboardApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'responsive' | 'team' | 'settings'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sessions, setSessions] = useState<DebuggingSession[]>([]);
  const [reports, setReports] = useState<ResponsiveReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<DebuggingSession | null>(null);
  const [selectedReport, setSelectedReport] = useState<ResponsiveReport | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load sessions
      const sessionsData = await chrome.storage.local.get('fdh_sessions');
      const loadedSessions: DebuggingSession[] = sessionsData.fdh_sessions || [];
      setSessions(loadedSessions);

      // Load responsive reports
      const reportsData = await chrome.storage.local.get('fdh_responsive_reports');
      const loadedReports: ResponsiveReport[] = reportsData.fdh_responsive_reports || [];
      setReports(loadedReports);

      // Calculate stats
      const toolsUsed: Record<string, number> = {};
      let totalScreenshots = 0;
      let totalIssues = 0;

      for (const session of loadedSessions) {
        for (const event of session.events) {
          if (event.type === 'tool_enable' && event.data.toolId) {
            toolsUsed[event.data.toolId as string] = (toolsUsed[event.data.toolId as string] || 0) + 1;
          }
        }
      }

      for (const report of loadedReports) {
        totalScreenshots += report.screenshots.length;
        totalIssues += report.summary.issuesFound;
      }

      const recentActivity: ActivityItem[] = [
        ...loadedSessions.slice(0, 5).map((s) => ({
          id: s.id,
          type: 'session' as const,
          title: `Recorded: ${s.name}`,
          description: `${s.events.length} events, ${s.metadata.toolCount} tools`,
          timestamp: s.createdAt,
        })),
        ...loadedReports.slice(0, 5).map((r) => ({
          id: r.id,
          type: 'screenshot' as const,
          title: `Responsive Test: ${r.title}`,
          description: `${r.summary.totalBreakpoints} breakpoints, ${r.summary.issuesFound} issues`,
          timestamp: r.createdAt,
        })),
      ].sort((a, b) => b.timestamp - a.timestamp);

      setStats({
        totalSessions: loadedSessions.length,
        totalScreenshots,
        issuesFound: totalIssues,
        toolsUsed,
        recentActivity,
      });
    } catch (error) {
      logger.error('[Dashboard] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (id: string) => {
    const filtered = sessions.filter((s) => s.id !== id);
    await chrome.storage.local.set({ fdh_sessions: filtered });
    setSessions(filtered);
    loadData();
  };

  const deleteReport = async (id: string) => {
    const filtered = reports.filter((r) => r.id !== id);
    await chrome.storage.local.set({ fdh_responsive_reports: filtered });
    setReports(filtered);
    loadData();
  };

  const exportSession = (session: DebuggingSession) => {
    const data = JSON.stringify(session, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${session.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportReportHTML = (report: ResponsiveReport) => {
    // Import and generate HTML report
    import('@/content/responsive-testing').then((module) => {
      const html = module.generateHTMLReport(report);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `responsive-report-${report.id}.html`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                FD
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">FrontendDevHelper</h1>
                <p className="text-sm text-slate-500">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadData}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Refresh
              </button>
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'sessions', label: 'Sessions', icon: '▶️' },
              { id: 'responsive', label: 'Responsive Tests', icon: '📱' },
              { id: 'team', label: 'Team', icon: '👥' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} onViewSessions={() => setActiveTab('sessions')} onViewResponsive={() => setActiveTab('responsive')} />
        )}
        {activeTab === 'sessions' && (
          <SessionsTab
            sessions={sessions}
            onDelete={deleteSession}
            onExport={exportSession}
            onSelect={setSelectedSession}
            selected={selectedSession}
          />
        )}
        {activeTab === 'responsive' && (
          <ResponsiveTab
            reports={reports}
            onDelete={deleteReport}
            onExport={exportReportHTML}
            onSelect={setSelectedReport}
            selected={selectedReport}
          />
        )}
        {activeTab === 'team' && <TeamTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
};

// Overview Tab
const OverviewTab: React.FC<{
  stats: DashboardStats | null;
  onViewSessions: () => void;
  onViewResponsive: () => void;
}> = ({ stats, onViewSessions, onViewResponsive }) => {
  if (!stats) return null;

  const statCards = [
    { label: 'Total Sessions', value: stats.totalSessions, icon: '▶️', color: 'blue', action: onViewSessions },
    { label: 'Screenshots', value: stats.totalScreenshots, icon: '📸', color: 'purple', action: onViewResponsive },
    { label: 'Issues Found', value: stats.issuesFound, icon: '⚠️', color: 'orange', action: onViewResponsive },
    { label: 'Tools Used', value: Object.keys(stats.toolsUsed).length, icon: '🛠️', color: 'green', action: null },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={card.action || undefined}
            disabled={!card.action}
            className={`bg-white p-6 rounded-xl border border-slate-200 text-left transition-all hover:shadow-lg ${
              card.action ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div className="text-3xl mb-2">{card.icon}</div>
            <div className="text-3xl font-bold text-slate-900">{card.value}</div>
            <div className="text-sm text-slate-500 mt-1">{card.label}</div>
          </button>
        ))}
      </div>

      {/* Tool Usage */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Tool Usage</h2>
        <div className="space-y-3">
          {Object.entries(stats.toolsUsed)
            .sort(([, a], [, b]) => b - a)
            .map(([toolId, count]) => {
              const meta = TOOL_METADATA[toolId as ToolId];
              const max = Math.max(...Object.values(stats.toolsUsed));
              const percentage = (count / max) * 100;

              return (
                <div key={toolId} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-slate-600 truncate">{meta?.name || toolId}</div>
                  <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm font-medium text-slate-700">{count}</div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {stats.recentActivity.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No activity yet. Start using the extension to see your activity here.</p>
          ) : (
            stats.recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl">
                  {item.type === 'session' && '▶️'}
                  {item.type === 'screenshot' && '📸'}
                  {item.type === 'analysis' && '📊'}
                  {item.type === 'team' && '👥'}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{item.title}</div>
                  <div className="text-sm text-slate-500">{item.description}</div>
                </div>
                <div className="text-sm text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Sessions Tab
const SessionsTab: React.FC<{
  sessions: DebuggingSession[];
  onDelete: (id: string) => void;
  onExport: (session: DebuggingSession) => void;
  onSelect: (session: DebuggingSession | null) => void;
  selected: DebuggingSession | null;
}> = ({ sessions, onDelete, onExport, onSelect, selected }) => {
  if (selected) {
    return (
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <button onClick={() => onSelect(null)} className="text-blue-600 hover:underline mb-4">
            ← Back to sessions
          </button>
          <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
          <p className="text-slate-500">{selected.description || 'No description'}</p>
          <div className="flex gap-4 mt-4 text-sm text-slate-500">
            <span>URL: {selected.url}</span>
            <span>•</span>
            <span>Duration: {Math.round(selected.metadata.duration / 1000)}s</span>
            <span>•</span>
            <span>Tools: {selected.metadata.toolCount}</span>
          </div>
        </div>
        <div className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Events ({selected.events.length})</h3>
          <div className="space-y-2 max-h-96 overflow-auto">
            {selected.events.map((event) => (
              <div key={event.id} className="flex gap-4 p-3 bg-slate-50 rounded-lg text-sm">
                <span className="text-slate-400 w-16">{Math.round(event.timestamp / 1000)}s</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  {event.type}
                </span>
                <span className="text-slate-600 flex-1">
                  {event.type === 'tool_enable' && `Enabled: ${event.data.toolId}`}
                  {event.type === 'tool_disable' && `Disabled: ${event.data.toolId}`}
                  {event.type === 'element_click' && `Clicked: ${event.data.tag}`}
                  {event.type === 'annotation' && `Note: ${event.data.text}`}
                  {event.type === 'scroll' && `Scrolled to (${event.data.x}, ${event.data.y})`}
                  {event.type === 'resize' && `Resized to ${event.data.width}x${event.data.height}`}
                  {event.type === 'navigation' && `Navigated to ${event.data.url}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Debugging Sessions ({sessions.length})</h2>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-4">▶️</div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No sessions yet</h3>
          <p className="text-slate-500">Start recording sessions to see them here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onSelect(session)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{session.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {session.events.length} events • {session.metadata.toolCount} tools •{' '}
                    {Math.round(session.metadata.duration / 1000)}s
                  </p>
                  <p className="text-xs text-slate-400 mt-2">{new Date(session.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExport(session);
                    }}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Export
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(session.id);
                    }}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Responsive Tab
const ResponsiveTab: React.FC<{
  reports: ResponsiveReport[];
  onDelete: (id: string) => void;
  onExport: (report: ResponsiveReport) => void;
  onSelect: (report: ResponsiveReport | null) => void;
  selected: ResponsiveReport | null;
}> = ({ reports, onDelete, onExport, onSelect, selected }) => {
  if (selected) {
    return (
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <button onClick={() => onSelect(null)} className="text-blue-600 hover:underline mb-4">
            ← Back to reports
          </button>
          <h2 className="text-xl font-bold text-slate-900">{selected.title}</h2>
          <div className="flex gap-4 mt-4 text-sm text-slate-500">
            <span>URL: {selected.url}</span>
            <span>•</span>
            <span>Breakpoints: {selected.summary.totalBreakpoints}</span>
            <span>•</span>
            <span className={selected.summary.errors > 0 ? 'text-red-600 font-medium' : ''}>
              Errors: {selected.summary.errors}
            </span>
            <span>•</span>
            <span className={selected.summary.warnings > 0 ? 'text-amber-600 font-medium' : ''}>
              Warnings: {selected.summary.warnings}
            </span>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {selected.screenshots.map((screenshot) => (
            <div key={screenshot.breakpoint.name} className="border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{screenshot.breakpoint.name}</h3>
                  <p className="text-sm text-slate-500">
                    {screenshot.breakpoint.width} × {screenshot.breakpoint.height}
                    {screenshot.breakpoint.device && ` (${screenshot.breakpoint.device})`}
                  </p>
                </div>
                {screenshot.issues && screenshot.issues.length > 0 && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                    {screenshot.issues.length} issues
                  </span>
                )}
              </div>
              <img
                src={screenshot.dataUrl}
                alt={screenshot.breakpoint.name}
                className="w-full rounded-lg border border-slate-200"
              />
              {screenshot.issues && screenshot.issues.length > 0 && (
                <div className="mt-4 space-y-2">
                  {screenshot.issues.map((issue, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg text-sm ${
                        issue.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <strong className="capitalize">{issue.type}:</strong> {issue.description}
                      {issue.element && <code className="ml-2 text-xs bg-white/50 px-1.5 py-0.5 rounded">{issue.element}</code>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Responsive Test Reports ({reports.length})</h2>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-4">📱</div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No reports yet</h3>
          <p className="text-slate-500">Run responsive testing to generate reports.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onSelect(report)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{report.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {report.summary.totalBreakpoints} breakpoints • {report.summary.issuesFound} issues
                  </p>
                  <div className="flex gap-4 mt-2 text-xs">
                    {report.summary.errors > 0 && (
                      <span className="text-red-600 font-medium">{report.summary.errors} errors</span>
                    )}
                    {report.summary.warnings > 0 && (
                      <span className="text-amber-600 font-medium">{report.summary.warnings} warnings</span>
                    )}
                    {report.summary.errors === 0 && report.summary.warnings === 0 && (
                      <span className="text-green-600 font-medium">✓ No issues</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{new Date(report.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExport(report);
                    }}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Export
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(report.id);
                    }}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Team Tab
const TeamTab: React.FC = () => {
  const [members] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'You',
      email: 'you@example.com',
      avatar: '',
      role: 'admin',
      lastActive: Date.now(),
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-2">Team Collaboration</h2>
        <p className="text-blue-100 mb-6">
          Share sessions, collaborate on debugging, and manage team access.
        </p>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors">
            Invite Team Members
          </button>
          <button className="px-4 py-2 bg-blue-400/30 text-white rounded-lg font-medium hover:bg-blue-400/40 transition-colors">
            Upgrade to Team Plan
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Team Members</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {members.map((member) => (
            <div key={member.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                  {member.name[0]}
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    {member.name} {member.role === 'admin' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">Admin</span>}
                  </div>
                  <div className="text-sm text-slate-500">{member.email}</div>
                </div>
              </div>
              <div className="text-sm text-slate-500">
                Active {new Date(member.lastActive).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Settings Tab
const SettingsTab: React.FC = () => {
  const clearAllData = async () => {
    if (confirm('Are you sure? This will delete all sessions, reports, and settings.')) {
      await chrome.storage.local.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Data Management</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium text-slate-900">Export All Data</div>
              <div className="text-sm text-slate-500">Download all sessions, reports, and settings</div>
            </div>
            <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              Export
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <div className="font-medium text-red-900">Clear All Data</div>
              <div className="text-sm text-red-600">Permanently delete all data. This cannot be undone.</div>
            </div>
            <button
              onClick={clearAllData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Clear Data
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">About</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>License:</strong> Free Plan</p>
          <p><strong>Storage Used:</strong> Calculating...</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardApp;
