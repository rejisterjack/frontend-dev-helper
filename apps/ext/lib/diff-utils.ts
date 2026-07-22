export interface DiffLine {
  type: "add" | "remove" | "unchanged";
  content: string;
}

/**
 * Compute a line-based diff between two strings using a longest-common-subsequence approach.
 * Returns an array of DiffLine entries suitable for rendering a before/after view.
 */
export function computeDiff(before: string, after: string): DiffLine[] {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");

  // Build LCS table
  const m = beforeLines.length;
  const n = afterLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (beforeLines[i - 1] === afterLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce the diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      result.push({ type: "unchanged", content: beforeLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "add", content: afterLines[j - 1] });
      j--;
    } else {
      result.push({ type: "remove", content: beforeLines[i - 1] });
      i--;
    }
  }

  result.reverse();
  return result;
}

export interface FixPayload {
  html?: string;
  css?: string;
  styleChanges?: Record<string, string>;
}

/**
 * Apply a fix to a DOM element. Returns true if the fix was applied successfully.
 */
export function applyFix(element: HTMLElement, fix: FixPayload): boolean {
  try {
    if (fix.styleChanges) {
      for (const [prop, value] of Object.entries(fix.styleChanges)) {
        (element.style as any as Record<string, string>)[prop] = value;
      }
    }
    if (fix.html) {
      element.outerHTML = fix.html;
    }
    return true;
  } catch {
    return false;
  }
}
