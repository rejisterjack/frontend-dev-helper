/**
 * Build the system + user prompts for AI optimization analysis.
 *
 * Ported from RPP's claudeProvider.ts but split out so any provider can
 * reuse the same prompt construction. Provider-specific HTTP plumbing is
 * gone — FDH's llm-service.sendRawRequest handles the transport.
 */

import type { AIAnalysisRequest, AISuggestion } from "./ai-types";

export function buildSystemPrompt(): string {
  return `You are a senior React performance optimization expert. You receive detailed profiling data including render metrics, render cause traces, component tree context, and source locations.

Your job is to provide STRUCTURAL, NON-OBVIOUS diagnoses — not generic advice like "use useCallback." Developers using this tool already know the basics. Focus on:

1. **Root cause identification**: Trace WHY re-renders happen (state change cascade, context granularity, selector issues)
2. **Architectural suggestions**: State colocation, component decomposition, context splitting, lazy loading boundaries
3. **Prop dependency analysis**: Identify which specific props are unstable and trace them to their origin
4. **Pattern recognition**: Detect common anti-patterns like:
   - Selector returning new references on every call
   - Context provider wrapping too many children
   - Object/array props recreated inline
   - State updates triggering unnecessary cascades
   - Missing React.lazy for route-level components

Return a JSON array of suggestion objects:
[
  {
    "componentName": "string",
    "issue": "string - root cause description",
    "suggestion": "string - specific structural fix",
    "codeExample": "string - before/after code",
    "confidence": 0.0-1.0,
    "category": "memoization|state-colocation|prop-optimization|context-optimization|lazy-loading|render-strategy"
  }
]

Guidelines:
- If render causes show "parent-rerendered", trace the chain upward to the actual state source
- If props are unstable, explain WHY they're unstable (inline creation vs selector returning new ref)
- If source location is available, reference the file in the suggestion
- Provide code examples that show the structural change, not just wrapping in useCallback
- Return ONLY the JSON array, no markdown formatting`;
}

export function buildUserPrompt(request: AIAnalysisRequest): string {
  const { componentName, metrics, commits, renderContext } = request;

  const sections: string[] = [];

  sections.push(`## Component: ${componentName}
- Render count: ${metrics.renderCount}
- Wasted renders: ${metrics.wastedRenderCount} (${metrics.wastedRenderRate.toFixed(1)}% waste rate)
- Total render time: ${metrics.totalRenderTime.toFixed(2)}ms
- Average: ${metrics.averageRenderTime.toFixed(2)}ms, Max: ${metrics.maxRenderTime.toFixed(2)}ms
- Memoized: ${metrics.isMemoized}${metrics.memoHitRate != null ? `, Hit rate: ${(metrics.memoHitRate * 100).toFixed(1)}%` : ""}`);

  if (renderContext?.sourceLocation?.fileName) {
    sections.push(`## Source Location
- File: ${renderContext.sourceLocation.fileName}:${renderContext.sourceLocation.lineNumber ?? "?"}`);
  }

  if (renderContext?.renderCauses && renderContext.renderCauses.length > 0) {
    const causeSummary = renderContext.renderCauses
      .slice(-5)
      .map((rc) => {
        const causes = rc.causes
          .map(
            (c) =>
              `${c.type}: ${c.details}${c.changedKeys ? ` [${c.changedKeys.join(", ")}]` : ""}`,
          )
          .join("; ");
        return `- ${causes}`;
      })
      .join("\n");
    sections.push(`## Render Causes (last ${Math.min(5, renderContext.renderCauses.length)} traces)
${causeSummary}`);
  }

  if (renderContext?.unstableProps && renderContext.unstableProps.length > 0) {
    sections.push(`## Unstable Props (frequently changing)
${renderContext.unstableProps.map((p) => `- ${p}`).join("\n")}`);
  }

  if (renderContext) {
    const treeInfo: string[] = [];
    if (renderContext.parentChain.length > 0) {
      treeInfo.push(`Parent chain: ${renderContext.parentChain.join(" → ")}`);
    }
    if (renderContext.childRenders.length > 0) {
      treeInfo.push(
        `Re-rendering children: ${renderContext.childRenders.join(", ")}`,
      );
    }
    treeInfo.push(
      `Tree depth: ${renderContext.treeDepth}, Siblings: ${renderContext.treeSiblingCount}`,
    );
    sections.push(`## Tree Context\n${treeInfo.join("\n")}`);
  }

  const commitSummaries = commits.slice(0, 10).map((c) => ({
    id: c.id.slice(0, 20),
    duration: c.duration?.toFixed(2),
    priority: c.priorityLevel,
    fiberCount: c.fibers?.length ?? 0,
  }));
  sections.push(`## Recent Commits (${commitSummaries.length} of ${commits.length})
${JSON.stringify(commitSummaries, null, 2)}`);

  return `Analyze this React component's performance and provide structural optimization suggestions.

${sections.join("\n\n")}

Provide specific, non-obvious diagnosis based on the render cause traces and component tree context.`;
}

export function parseSuggestions(text: string): AISuggestion[] {
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [normalizeSuggestion(parsed)];
    return parsed.map(normalizeSuggestion);
  } catch {
    throw new Error("Failed to parse AI response as JSON suggestions");
  }
}

function normalizeSuggestion(raw: Record<string, unknown>): AISuggestion {
  return {
    componentName: String(raw.componentName ?? ""),
    issue: String(raw.issue ?? ""),
    suggestion: String(raw.suggestion ?? ""),
    codeExample: String(raw.codeExample ?? ""),
    confidence:
      typeof raw.confidence === "number"
        ? Math.min(1, Math.max(0, raw.confidence))
        : 0.5,
    category: (raw.category as AISuggestion["category"]) ?? undefined,
  };
}
