/**
 * WebVitals — LCP/FCP/CLS/INP ratings.
 *
 * Ported from react-perf-profiler/apps/ext/src/panel/components/visualizations/WebVitals.tsx.
 */

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { WebVitalMetric } from "@repo/profiler-contract";

interface WebVitalsProps {
  metrics: WebVitalMetric[];
}

const RATING_CONFIG = {
  good: {
    label: "Good",
    color: "text-green-600",
    progressColor: "[&>[data-slot=progress-indicator]]:bg-green-600",
  },
  "needs-improvement": {
    label: "Needs Improvement",
    color: "text-amber-600",
    progressColor: "[&>[data-slot=progress-indicator]]:bg-amber-600",
  },
  poor: {
    label: "Poor",
    color: "text-red-600",
    progressColor: "[&>[data-slot=progress-indicator]]:bg-red-600",
  },
} as const;

const METRIC_THRESHOLDS: Record<
  string,
  { goodMax: number; poorMin: number; unit: string }
> = {
  LCP: { goodMax: 2500, poorMin: 4000, unit: "ms" },
  FCP: { goodMax: 1800, poorMin: 3000, unit: "ms" },
  FID: { goodMax: 100, poorMin: 300, unit: "ms" },
  CLS: { goodMax: 0.1, poorMin: 0.25, unit: "" },
  INP: { goodMax: 200, poorMin: 500, unit: "ms" },
  TTFB: { goodMax: 800, poorMin: 1800, unit: "ms" },
};

function getProgressValue(metric: WebVitalMetric): number {
  const threshold = METRIC_THRESHOLDS[metric.name];
  if (!threshold) return 0;

  const { goodMax, poorMin } = threshold;
  if (metric.value <= goodMax) return 100;
  if (metric.value >= poorMin)
    return Math.max(
      0,
      100 - ((metric.value - goodMax) / (poorMin - goodMax)) * 100 * 0.5,
    );
  const ratio = (metric.value - goodMax) / (poorMin - goodMax);
  return Math.max(0, 100 - ratio * 60);
}

function formatMetricValue(name: string, value: number): string {
  const threshold = METRIC_THRESHOLDS[name];
  if (!threshold) return String(value);

  if (threshold.unit === "ms") {
    return value >= 1000
      ? `${(value / 1000).toFixed(2)}s`
      : `${value.toFixed(0)}ms`;
  }
  return value.toFixed(3);
}

function getMetricDescription(name: string): string {
  switch (name) {
    case "LCP":
      return "Largest Contentful Paint";
    case "FCP":
      return "First Contentful Paint";
    case "FID":
      return "First Input Delay";
    case "CLS":
      return "Cumulative Layout Shift";
    case "INP":
      return "Interaction to Next Paint";
    case "TTFB":
      return "Time to First Byte";
    default:
      return name;
  }
}

const WebVitals: React.FC<WebVitalsProps> = ({ metrics }) => {
  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-sm text-muted-foreground">
        No Web Vitals data available. Start profiling to collect metrics.
      </div>
    );
  }

  // Deduplicate: keep latest per metric name
  const latestMetrics = new Map<string, WebVitalMetric>();
  for (const m of metrics) {
    const existing = latestMetrics.get(m.name);
    if (!existing || m.timestamp > existing.timestamp) {
      latestMetrics.set(m.name, m);
    }
  }
  const uniqueMetrics = Array.from(latestMetrics.values());

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
      {uniqueMetrics.map((metric) => {
        const config = RATING_CONFIG[metric.rating];
        const progressValue = getProgressValue(metric);

        return (
          <Card key={metric.name} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold tracking-tight">
                  {metric.name}
                </CardTitle>
                <span className={cn("text-xs font-medium", config.color)}>
                  {config.label}
                </span>
              </div>
              <CardDescription>
                {getMetricDescription(metric.name)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className={cn("text-2xl font-bold tabular-nums", config.color)}
              >
                {formatMetricValue(metric.name, metric.value)}
              </div>
              <Progress
                value={progressValue}
                className={cn("h-2", config.progressColor)}
              />
              {metric.element && (
                <div className="text-xs text-muted-foreground truncate">
                  Element: {metric.element}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default WebVitals;
