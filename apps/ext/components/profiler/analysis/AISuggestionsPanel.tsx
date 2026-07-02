/**
 * AISuggestionsPanel — UI for requesting AI optimization suggestions for a
 * selected React component, and applying them via the FDH VS Code bridge.
 *
 * Adapted from RPP. Key differences:
 * - No per-panel provider/apiKey/model config — reuses the global LLM config
 *   from Settings → AI via FDH's llm-service.sendRawRequest().
 * - "Open in Editor" replaced with "Apply in VS Code", which sends a
 *   PreviewFix message over the FDH bridge so the user can review the
 *   patch in their editor.
 */

import { useState, useCallback, useEffect } from "react";

import type { AISuggestion } from "@/lib/profiler/ai/ai-types";
import type {
  ComponentMetrics,
  CommitData,
  SourceLocation,
} from "@repo/profiler-contract";
import { generatePatch } from "@/lib/profiler/ai/patchGenerator";
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseSuggestions,
} from "@/lib/profiler/ai/aiPrompts";
import { sendRawRequest, isEnabled as isAIEnabled } from "@/lib/llm-service";
import { getBridge } from "@/lib/vscode-bridge";
import { useProfilerStore } from "@/stores/use-profiler-store";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, FileCode, Sparkles, ArrowUpRightFromSquare } from "lucide-react";

interface AISuggestionsPanelProps {
  componentName: string;
  metrics: ComponentMetrics;
  commits: CommitData[];
}

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; suggestions: AISuggestion[] }
  | { status: "error"; message: string };

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let variantClass: string;
  if (pct >= 80) {
    variantClass =
      "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400";
  } else if (pct >= 50) {
    variantClass =
      "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400";
  } else {
    variantClass =
      "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400";
  }
  return (
    <Badge variant="outline" className={`text-[10px] ${variantClass}`}>
      {pct}% confidence
    </Badge>
  );
}

function SuggestionCard({
  suggestion,
  sourceLocation,
}: {
  suggestion: AISuggestion;
  sourceLocation?: SourceLocation | null;
}) {
  const [codeExpanded, setCodeExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleCopyPatch = useCallback(() => {
    const patch = generatePatch(suggestion, {
      fileName: sourceLocation?.fileName ?? "",
      lineNumber: sourceLocation?.lineNumber ?? undefined,
    });
    navigator.clipboard.writeText(patch).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [suggestion, sourceLocation]);

  const handleApplyInVSCode = useCallback(() => {
    if (!sourceLocation?.fileName) return;
    const patch = generatePatch(suggestion, {
      fileName: sourceLocation.fileName,
      lineNumber: sourceLocation.lineNumber ?? undefined,
    });
    // Extract the "+"/"-" body (drop the ---/+++ headers) to build a
    // before/after pair the bridge can preview.
    const lines = patch
      .split("\n")
      .filter(
        (l) =>
          !l.startsWith("---") && !l.startsWith("+++") && !l.startsWith("@@"),
      );
    const original = lines
      .filter((l) => !l.startsWith("+"))
      .map((l) => l.replace(/^-/, ""))
      .join("\n")
      .trim();
    const fixed = lines
      .filter((l) => !l.startsWith("-"))
      .map((l) => l.replace(/^\+/, ""))
      .join("\n")
      .trim();

    getBridge().send({
      type: "PreviewFix",
      payload: {
        file: sourceLocation.fileName,
        original,
        fixed,
        description: `${suggestion.issue} → ${suggestion.suggestion}`,
        fixId: `profiler-ai-${suggestion.componentName}-${Date.now()}`,
      },
    });
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  }, [suggestion, sourceLocation]);

  const handleOpenFile = useCallback(() => {
    if (!sourceLocation?.fileName) return;
    getBridge().openInEditor(
      sourceLocation.fileName,
      sourceLocation.lineNumber ?? 1,
    );
  }, [sourceLocation]);

  return (
    <Card size="sm">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs font-mono">
            {suggestion.componentName}
          </CardTitle>
          <ConfidenceBadge confidence={suggestion.confidence} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div>
          <p className="text-[10px] font-medium text-destructive">Issue</p>
          <p className="text-[11px] text-muted-foreground">
            {suggestion.issue}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            Suggestion
          </p>
          <p className="text-[11px] text-muted-foreground">
            {suggestion.suggestion}
          </p>
        </div>
        {suggestion.codeExample && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] px-1 mb-1"
              onClick={() => setCodeExpanded((prev) => !prev)}
            >
              {codeExpanded ? "Hide" : "Show"} code example
            </Button>
            {codeExpanded && (
              <pre className="text-[10px] bg-muted/50 rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-words">
                <code>{suggestion.codeExample}</code>
              </pre>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-5 text-[10px] px-2 gap-1"
            onClick={handleCopyPatch}
          >
            <Copy className="size-2.5" />
            {copied ? "Copied!" : "Copy as Patch"}
          </Button>
          {sourceLocation?.fileName && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-5 text-[10px] px-2 gap-1"
                onClick={handleApplyInVSCode}
              >
                <FileCode className="size-2.5" />
                {applied ? "Sent!" : "Apply in VS Code"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] px-2 gap-1"
                onClick={handleOpenFile}
              >
                <ArrowUpRightFromSquare className="size-2.5" />
                Open
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AISuggestionsPanel({
  componentName,
  metrics,
  commits,
}: AISuggestionsPanelProps) {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const sourceLocations = useProfilerStore((s) => s.sourceLocations);
  const renderCauses = useProfilerStore((s) => s.renderCauses);
  const [bridgeConnected, setBridgeConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkStatus = () => {
      try {
        chrome.runtime.sendMessage(
          { type: "VSCODE_GET_STATUS" },
          (response) => {
            if (!cancelled && response) {
              setBridgeConnected(response.connected ?? false);
            }
          },
        );
      } catch {
        // runtime may be unavailable in tests
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const aiConfigured = isAIEnabled();

  const handleAnalyze = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const causes = renderCauses.get(componentName) ?? [];
      const src = sourceLocations.get(componentName) ?? null;

      const userPrompt = buildUserPrompt({
        componentName,
        metrics,
        commits,
        renderContext: {
          renderCauses: causes,
          sourceLocation: src,
          unstableProps: [],
          parentChain: [],
          childRenders: [],
          treeDepth: 0,
          treeSiblingCount: 0,
        },
      });

      const text = await sendRawRequest(
        [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: userPrompt },
        ],
        { maxTokens: 4096, temperature: 0.3 },
      );

      if (text === null) {
        setState({
          status: "error",
          message:
            "AI is disabled or not configured. Open Settings → AI to configure.",
        });
        return;
      }

      const suggestions = parseSuggestions(text);
      setState({ status: "success", suggestions });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown analysis error";
      setState({ status: "error", message });
    }
  }, [componentName, metrics, commits, renderCauses, sourceLocations]);

  const handleRetry = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            AI Optimization Analysis
          </CardTitle>
          <CardDescription>
            Get AI-powered suggestions for{" "}
            <span className="font-mono">{componentName}</span>
            {!aiConfigured && (
              <span className="block mt-1 text-amber-600 dark:text-amber-400">
                Configure an AI provider in Settings → AI to enable this
                feature.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            className="w-full mt-1"
            disabled={!aiConfigured || state.status === "loading"}
            onClick={handleAnalyze}
          >
            {state.status === "loading" ? (
              <span className="flex items-center gap-2">
                <span className="size-3.5 border-2 border-current border-r-transparent rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : (
              "Analyze with AI"
            )}
          </Button>
          {!bridgeConnected && (
            <p className="text-[10px] text-muted-foreground text-center">
              Tip: connect the VS Code bridge in Settings → Bridge to enable
              one-click patch application.
            </p>
          )}
        </CardContent>
      </Card>

      {state.status === "error" && (
        <Card size="sm">
          <CardContent className="flex flex-col items-center gap-3 py-4">
            <p className="text-xs text-destructive text-center">
              {state.message}
            </p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {state.status === "success" && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">
            Suggestions ({state.suggestions.length})
          </h3>
          {state.suggestions.length === 0 ? (
            <Card size="sm">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground text-center">
                  No optimization suggestions found for this component.
                </p>
              </CardContent>
            </Card>
          ) : (
            state.suggestions.map((suggestion, idx) => (
              <SuggestionCard
                key={`${suggestion.componentName}-${idx}`}
                suggestion={suggestion}
                sourceLocation={sourceLocations.get(suggestion.componentName)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
