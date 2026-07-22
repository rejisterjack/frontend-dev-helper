/**
 * React Profiler panel.
 *
 * The full Phase-2 UI: a header with connection status and record/stop
 * control, plus tabs for all 7 views (Tree, Flamegraph, Timeline,
 * Analysis, Web Vitals, Compare, Dependencies).
 *
 * Lives in the DevTools panel as the `react-profiler` view in the ViewRouter.
 */

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Circle,
  Play,
  Square,
  AlertCircle,
  Loader2,
  Trash2,
  Download,
  Upload,
  Cpu,
} from "lucide-react";
import { useProfilerStore } from "@/stores/use-profiler-store";
import { useProfilerConnection } from "@/lib/profiler/use-profiler-connection";
import { useExport } from "@/hooks/profiler/useExport";
import { cn } from "@/lib/utils";

import { TreeView } from "@/components/profiler/tree/TreeView";
import Flamegraph from "@/components/profiler/visualizations/Flamegraph";
import Timeline from "@/components/profiler/visualizations/Timeline";
import { TimeTravelControls } from "@/components/profiler/visualizations/TimeTravelControls";
import { AnalysisView } from "@/components/profiler/analysis/AnalysisView";
import { ComponentDetails } from "@/components/profiler/analysis/ComponentDetails";
import WebVitals from "@/components/profiler/visualizations/WebVitals";
import { ComparisonView } from "@/components/profiler/analysis/ComparisonView";
import { DependencyGraph } from "@/components/profiler/visualizations/DependencyGraph";

type ProfilerTab =
  | "tree"
  | "flamegraph"
  | "timeline"
  | "analysis"
  | "vitals"
  | "compare"
  | "dependencies";

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

export function ReactProfilerPanel({ tabId }: { tabId: number | null }) {
  const { sendCommand } = useProfilerConnection(tabId);
  const { exportProfile, importProfile, exportAsCPUProfile } = useExport();

  const status = useProfilerStore((s) => s.status);
  const isRecording = useProfilerStore((s) => s.isRecording);
  const analysisResult = useProfilerStore((s) => s.analysisResult);
  const commits = useProfilerStore((s) => s.commits);
  const fiberMap = useProfilerStore((s) => s.fiberMap);
  const reactVersion = useProfilerStore((s) => s.reactVersion);
  const lastError = useProfilerStore((s) => s.lastError);
  const webVitals = useProfilerStore((s) => s.webVitals);
  const clearSession = useProfilerStore((s) => s.clear);

  const [activeTab, setActiveTab] = useState<ProfilerTab>("tree");
  const [selectedComponent, setSelectedComponent] = useState<string | null>(
    null,
  );
  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);
  const [treeFilter, _setTreeFilter] = useState("");

  const fibersArray = useMemo(() => Array.from(fiberMap.values()), [fiberMap]);

  const handleExport = () => {
    exportProfile();
  };

  const handleImport = async () => {
    await importProfile();
  };

  const handleCpuExport = () => {
    exportAsCPUProfile();
  };

  const noData = commits.length === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Circle
            className={cn(
              "size-2.5 shrink-0",
              status === "connected" && "fill-emerald-500 text-emerald-500",
              status === "connecting" && "fill-amber-500 text-amber-500",
              status === "no-react" && "fill-red-500 text-red-500",
              status === "disconnected" &&
                "fill-muted-foreground text-muted-foreground",
              status === "error" && "fill-red-500 text-red-500",
            )}
          />
          <span className="text-sm text-muted-foreground truncate">
            {status === "connected" &&
              (reactVersion ? `React ${reactVersion}` : "Connected")}
            {status === "connecting" && "Connecting…"}
            {status === "disconnected" && "Disconnected"}
            {status === "no-react" && "React not detected (dev build required)"}
            {status === "error" && "Bridge error"}
          </span>
          {analysisResult && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] ml-1",
                scoreColor(analysisResult.performanceScore),
              )}
            >
              Score {analysisResult.performanceScore}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">
            {commits.length} commits
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleImport}
            title="Import session from JSON"
          >
            <Upload className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleExport}
            disabled={noData}
            title="Export session as JSON"
          >
            <Download className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCpuExport}
            disabled={noData}
            title="Export as Chrome DevTools CPU Profile"
          >
            <Cpu className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={clearSession}
            disabled={noData}
            title="Clear session"
          >
            <Trash2 className="size-3.5" />
          </Button>
          <Button
            variant={isRecording ? "destructive" : "default"}
            size="sm"
            disabled={status === "connecting" || status === "no-react"}
            onClick={() => {
              if (isRecording) {
                sendCommand({ type: "STOP" });
              } else {
                sendCommand({ type: "START" });
              }
            }}
          >
            {status === "connecting" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isRecording ? (
              <Square className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            <span className="ml-1.5">{isRecording ? "Stop" : "Record"}</span>
          </Button>
        </div>
      </header>

      {lastError && status === "error" && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 m-3 p-3 text-sm">
          <AlertCircle className="size-4 mt-0.5 text-destructive shrink-0" />
          <span className="text-destructive">{lastError}</span>
        </div>
      )}

      {status === "no-react" && (
        <Card className="m-3">
          <CardHeader>
            <CardTitle className="text-base">React not detected</CardTitle>
            <CardDescription>
              The React Profiler requires a React application running in
              development mode. Production builds strip the React DevTools
              global hook that the profiler relies on. Reload the page after
              switching to a dev build.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {noData && status !== "no-react" ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-base">React Profiler</CardTitle>
              <CardDescription>
                Click <strong>Record</strong> to start capturing React commits
                from the inspected page. The profiler hooks into React&apos;s
                dev-only global hook, so the page must be running a development
                build of React.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>
                • Captures render commits with durations and component props
              </p>
              <p>• Detects wasted renders and memoization issues</p>
              <p>• Visualizes the component tree, flamegraph, and timeline</p>
              <p>• Generates AI-powered optimization suggestions</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ProfilerTab)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="shrink-0 border-b border-border px-2">
            <TabsList>
              <TabsTrigger value="tree">Tree</TabsTrigger>
              <TabsTrigger value="flamegraph">Flamegraph</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="vitals">Vitals</TabsTrigger>
              <TabsTrigger value="compare">Compare</TabsTrigger>
              <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="tree"
            className="flex-1 min-h-0 mt-0 flex flex-row"
          >
            <div className="flex-1 min-w-0 border-r border-border">
              <TreeView
                fibers={fibersArray}
                selectedComponent={selectedComponent}
                onSelectComponent={setSelectedComponent}
                filterText={treeFilter}
                wastedRenderReports={analysisResult?.wastedRenderReports ?? []}
                onViewAnalysis={(name) => {
                  setSelectedComponent(
                    fibersArray.find((f) => f.displayName === name)?.id ?? null,
                  );
                  setActiveTab("analysis");
                }}
              />
            </div>
            <div className="w-80 shrink-0 overflow-hidden">
              <ComponentDetails
                componentName={
                  fibersArray.find((f) => f.id === selectedComponent)
                    ?.displayName ?? null
                }
                commits={commits}
              />
            </div>
          </TabsContent>

          <TabsContent value="flamegraph" className="flex-1 min-h-0 mt-0">
            <Flamegraph
              fibers={fibersArray}
              selectedComponent={
                fibersArray.find((f) => f.id === selectedComponent)
                  ?.displayName ?? null
              }
              onSelectComponent={(name) => {
                const fiber = fibersArray.find((f) => f.displayName === name);
                if (fiber) setSelectedComponent(fiber.id);
              }}
            />
          </TabsContent>

          <TabsContent
            value="timeline"
            className="flex-1 min-h-0 mt-0 flex flex-col gap-2 p-2"
          >
            <div className="flex-1 min-h-0">
              <Timeline
                commits={commits}
                selectedCommitId={selectedCommitId}
                onSelectCommit={setSelectedCommitId}
              />
            </div>
            <TimeTravelControls />
          </TabsContent>

          <TabsContent
            value="analysis"
            className="flex-1 min-h-0 mt-0 overflow-hidden"
          >
            <AnalysisView analysisResults={analysisResult} commits={commits} />
          </TabsContent>

          <TabsContent
            value="vitals"
            className="flex-1 min-h-0 mt-0 overflow-auto"
          >
            <WebVitals metrics={webVitals} />
          </TabsContent>

          <TabsContent
            value="compare"
            className="flex-1 min-h-0 mt-0 overflow-auto"
          >
            <ComparisonView />
          </TabsContent>

          <TabsContent
            value="dependencies"
            className="flex-1 min-h-0 mt-0 overflow-auto"
          >
            <DependencyGraph />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
