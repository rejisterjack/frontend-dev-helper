/**
 * Memoization effectiveness analysis.
 * Examines memoized components (tag 14 = MemoComponent, tag 15 = SimpleMemoComponent)
 * and determines if memoization is working effectively.
 *
 * Pure analysis — zero browser dependencies.
 */

import type {
  CommitData,
  FiberData,
  MemoIssue,
  MemoRecommendation,
  MemoReport,
  Severity,
} from "./types.js";
import { shallowEqual } from "./shallowEqual.js";

interface MemoComponentRecord {
  displayName: string;
  totalRenders: number;
  memoHits: number;
  memoMisses: number;
  propsHistory: Record<string, unknown>[];
  issues: MemoIssue[];
}

const MEMO_TAGS = new Set([14, 15]);

function collectMemoFibers(
  fiber: FiberData | null | undefined,
  out: FiberData[],
): void {
  if (!fiber) return;
  if (MEMO_TAGS.has(fiber.tag) && fiber.displayName) {
    out.push(fiber);
  }
  if (fiber.child) collectMemoFibers(fiber.child, out);
  if (fiber.sibling) collectMemoFibers(fiber.sibling, out);
}

function classifyIssueSeverity(missRate: number): Severity {
  if (missRate > 0.7) return "critical";
  if (missRate > 0.5) return "high";
  if (missRate > 0.3) return "medium";
  return "low";
}

function detectUnstableProps(
  propsHistory: Record<string, unknown>[],
): MemoIssue[] {
  if (propsHistory.length < 2) return [];

  const issues: MemoIssue[] = [];

  const propKeys = Object.keys(propsHistory[0]);

  for (const key of propKeys) {
    const values = propsHistory.map((p) => p[key]);

    const functionValues = values.filter((v) => typeof v === "function");
    if (functionValues.length >= 2) {
      let allDifferent = true;
      for (let i = 1; i < functionValues.length; i++) {
        if (functionValues[i] === functionValues[i - 1]) {
          allDifferent = false;
          break;
        }
      }
      if (allDifferent) {
        issues.push({
          type: "unstable-callback",
          propName: key,
          description: `Prop "${key}" is an unstable function reference that changes every render, defeating memoization.`,
          suggestion: `Wrap the callback with useCallback() to maintain a stable reference.`,
          severity: "high",
        });
        continue;
      }
    }

    const objectValues = values.filter(
      (v) => v !== null && typeof v === "object" && !Array.isArray(v),
    );
    if (objectValues.length >= 2) {
      let allShallowEqual = true;
      for (let i = 1; i < objectValues.length; i++) {
        if (
          !shallowEqual(
            objectValues[i] as Record<string, unknown>,
            objectValues[i - 1] as Record<string, unknown>,
          )
        ) {
          allShallowEqual = false;
          break;
        }
      }
      if (allShallowEqual) {
        issues.push({
          type: "unstable-object",
          propName: key,
          description: `Prop "${key}" is an object with stable content but a new reference each render, defeating memoization.`,
          suggestion: `Wrap the object with useMemo() to maintain a stable reference.`,
          severity: "high",
        });
        continue;
      }
    }

    const arrayValues = values.filter((v) => Array.isArray(v));
    if (arrayValues.length >= 2) {
      const first = arrayValues[0] as unknown[];
      let allSame = true;
      for (let i = 1; i < arrayValues.length; i++) {
        const arr = arrayValues[i] as unknown[];
        if (arr.length !== first.length) {
          allSame = false;
          break;
        }
        for (let j = 0; j < arr.length; j++) {
          if (arr[j] !== first[j]) {
            allSame = false;
            break;
          }
        }
        if (!allSame) break;
      }
      if (allSame && first.length > 0) {
        issues.push({
          type: "unstable-array",
          propName: key,
          description: `Prop "${key}" is an array with stable content but a new reference each render, defeating memoization.`,
          suggestion: `Wrap the array with useMemo() to maintain a stable reference.`,
          severity: "medium",
        });
      }
    }
  }

  return issues;
}

function buildRecommendations(
  issues: MemoIssue[],
  componentName: string,
): MemoRecommendation[] {
  const recommendations: MemoRecommendation[] = [];
  const seen = new Set<string>();

  for (const issue of issues) {
    if (seen.has(issue.type)) continue;
    seen.add(issue.type);

    switch (issue.type) {
      case "unstable-callback":
        recommendations.push({
          type: "useCallback",
          description: `Stabilize the "${issue.propName}" callback passed to ${componentName}.`,
          codeExample: `const ${issue.propName} = useCallback((...args) => {\n  // handler body\n}, [/* dependencies */]);`,
        });
        break;
      case "unstable-object":
        recommendations.push({
          type: "useMemo",
          description: `Stabilize the "${issue.propName}" object passed to ${componentName}.`,
          codeExample: `const ${issue.propName} = useMemo(() => ({\n  // object properties\n}), [/* dependencies */]);`,
        });
        break;
      case "unstable-array":
        recommendations.push({
          type: "useMemo",
          description: `Stabilize the "${issue.propName}" array passed to ${componentName}.`,
          codeExample: `const ${issue.propName} = useMemo(() => [\n  // array elements\n], [/* dependencies */]);`,
        });
        break;
    }
  }

  if (issues.length === 0) {
    recommendations.push({
      type: "React.memo",
      description: `Consider adding a custom comparison function to ${componentName}'s React.memo() wrapper for deep prop comparison.`,
      codeExample: `const ${componentName} = React.memo(\n  ${componentName}Impl,\n  (prevProps, nextProps) => {\n    // Return true if props are equal\n    return prevProps.id === nextProps.id;\n  }\n);`,
    });
  }

  return recommendations;
}

export function analyzeMemoization(commits: CommitData[]): MemoReport[] {
  if (commits.length === 0) return [];

  const records = new Map<string, MemoComponentRecord>();

  for (const commit of commits) {
    const fibers: FiberData[] = [];
    if (commit.fibers) {
      fibers.push(...commit.fibers);
    }
    if (commit.rootFiber) {
      collectMemoFibers(commit.rootFiber, fibers);
    }

    const memoFibers = fibers.filter(
      (f) => MEMO_TAGS.has(f.tag) && f.displayName,
    );

    for (const fiber of memoFibers) {
      const key = fiber.displayName!;
      let record = records.get(key);

      if (!record) {
        record = {
          displayName: key,
          totalRenders: 0,
          memoHits: 0,
          memoMisses: 0,
          propsHistory: [],
          issues: [],
        };
        records.set(key, record);
      }

      const currentProps = fiber.memoizedProps ?? {};
      record.totalRenders += 1;

      if (record.propsHistory.length > 0) {
        const prevProps = record.propsHistory[record.propsHistory.length - 1];
        if (shallowEqual(prevProps, currentProps)) {
          record.memoMisses += 1;
        } else {
          record.memoMisses += 1;
        }
      } else {
        record.memoMisses += 1;
      }

      record.propsHistory.push({ ...currentProps });

      if (record.propsHistory.length > 20) {
        record.propsHistory = record.propsHistory.slice(-20);
      }
    }
  }

  const reports: MemoReport[] = [];

  for (const record of records.values()) {
    const rendersAfterFirst = record.totalRenders - 1;
    let samePropRenders = 0;

    for (let i = 1; i < record.propsHistory.length; i++) {
      if (shallowEqual(record.propsHistory[i - 1], record.propsHistory[i])) {
        samePropRenders += 1;
      }
    }

    const ineffectiveRate =
      rendersAfterFirst > 0 ? samePropRenders / rendersAfterFirst : 0;
    const currentHitRate = Math.round((1 - ineffectiveRate) * 1000) / 10;
    const isEffective = currentHitRate > 70;

    const unstableIssues = detectUnstableProps(record.propsHistory);

    const missRate = 100 - currentHitRate;
    for (const issue of unstableIssues) {
      issue.severity = classifyIssueSeverity(missRate / 100);
    }

    const recommendations = buildRecommendations(
      unstableIssues,
      record.displayName,
    );

    reports.push({
      componentName: record.displayName,
      hasMemo: true,
      currentHitRate,
      optimalHitRate: 95,
      isEffective,
      issues: unstableIssues,
      recommendations,
    });
  }

  reports.sort((a, b) => {
    if (a.isEffective !== b.isEffective) return a.isEffective ? 1 : -1;
    return a.currentHitRate - b.currentHitRate;
  });

  return reports;
}
