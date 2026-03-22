/**
 * AI Suggestions Component
 *
 * Displays AI-powered analysis results with one-click fixes.
 * Shows real-time suggestions as you browse with categorization and filtering.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AIAnalysisResult, AISuggestion, AISuggestionCategory } from '@/types';
import { logger } from '@/utils/logger';
import { runAIAnalysis } from '@/ai/ai-analyzer';
import { quickFixes } from '@/ai/quick-fixes';

interface AISuggestionsProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<AISuggestionCategory, { bg: string; text: string; border: string }> = {
  accessibility: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  performance: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  seo: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  'best-practice': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  security: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

const PRIORITY_COLORS = {
  critical: 'text-red-400 bg-red-500/10',
  high: 'text-orange-400 bg-orange-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  low: 'text-slate-400 bg-slate-500/10',
};

export const AISuggestions: React.FC<AISuggestionsProps> = ({ isOpen, onClose }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<AISuggestionCategory>>(new Set());
  const [selectedPriorities, setSelectedPriorities] = useState<Set<AISuggestion['priority']>>(new Set());
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [applyingFix, setApplyingFix] = useState<string | null>(null);
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());

  // Run analysis on mount
  useEffect(() => {
    if (isOpen && !analysis) {
      runAnalysis();
    }
  }, [isOpen]);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const result = await runAIAnalysis();
      setAnalysis(result);
    } catch (error) {
      logger.error('[AISuggestions] Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    if (!analysis) return [];

    return analysis.suggestions.filter((s) => {
      const categoryMatch = selectedCategories.size === 0 || selectedCategories.has(s.category);
      const priorityMatch = selectedPriorities.size === 0 || selectedPriorities.has(s.priority);
      return categoryMatch && priorityMatch;
    });
  }, [analysis, selectedCategories, selectedPriorities]);

  // Toggle category filter
  const toggleCategory = (category: AISuggestionCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Toggle priority filter
  const togglePriority = (priority: AISuggestion['priority']) => {
    setSelectedPriorities((prev) => {
      const next = new Set(prev);
      if (next.has(priority)) {
        next.delete(priority);
      } else {
        next.add(priority);
      }
      return next;
    });
  };

  // Apply a fix
  const handleApplyFix = async (suggestion: AISuggestion) => {
    if (!suggestion.autoFixable || !suggestion.fix) return;

    setApplyingFix(suggestion.id);
    try {
      const success = await quickFixes.applyFix(suggestion);
      if (success) {
        setAppliedFixes((prev) => new Set(prev).add(suggestion.id));
        // Re-run analysis after fix
        setTimeout(runAnalysis, 500);
      }
    } finally {
      setApplyingFix(null);
    }
  };

  // Apply all auto-fixable suggestions
  const handleApplyAll = async () => {
    if (!analysis) return;

    const autoFixable = filteredSuggestions.filter((s) => s.autoFixable && !appliedFixes.has(s.id));
    for (const suggestion of autoFixable) {
      await handleApplyFix(suggestion);
    }
  };

  // Apply common fixes
  const handleApplyCommonFixes = () => {
    const results = quickFixes.applyAllCommonFixes();
    logger.log('[AISuggestions] Applied common fixes:', results);
    setTimeout(runAnalysis, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-white/10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <h2 className="font-semibold text-white">AI Suggestions</h2>
              <p className="text-xs text-slate-400">
                {analysis ? `${analysis.summary.total} suggestions found` : 'Analyzing page...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Analyzing...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  Re-analyze
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {analysis && (
          <div className="grid grid-cols-5 gap-2 p-3 border-b border-slate-700">
            {(['accessibility', 'performance', 'seo', 'best-practice', 'security'] as const).map((category) => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`
                  rounded-lg p-2 text-left transition-colors
                  ${selectedCategories.has(category) ? 'bg-slate-700' : 'bg-slate-800/50 hover:bg-slate-800'}
                `}
              >
                <div className={`text-xs uppercase tracking-wider ${CATEGORY_COLORS[category].text}`}>
                  {category.replace('-', ' ')}
                </div>
                <div className="text-lg font-semibold text-white">
                  {analysis.summary.byCategory[category]}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Filters & Actions */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Priority:</span>
            {(['critical', 'high', 'medium', 'low'] as const).map((priority) => (
              <button
                key={priority}
                onClick={() => togglePriority(priority)}
                className={`
                  rounded-full px-2 py-0.5 text-xs capitalize transition-colors
                  ${selectedPriorities.has(priority) ? PRIORITY_COLORS[priority] : 'text-slate-500 hover:bg-slate-800'}
                `}
              >
                {priority}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyCommonFixes}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
            >
              Apply Common Fixes
            </button>
            {analysis && analysis.summary.autoFixable > 0 && (
              <button
                onClick={handleApplyAll}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700"
              >
                Fix All ({analysis.summary.autoFixable})
              </button>
            )}
          </div>
        </div>

        {/* Suggestions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && !analysis ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="mb-4 text-4xl animate-pulse">✨</div>
              <p>Analyzing page...</p>
              <p className="text-sm">This may take a few seconds</p>
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="mb-4 text-4xl">🎉</div>
              <p>No suggestions found</p>
              {analysis && (
                <p className="text-sm">
                  {analysis.summary.total > 0
                    ? 'Try adjusting your filters'
                    : 'Great job! No issues detected.'}
                </p>
              )}
            </div>
          ) : (
            filteredSuggestions.map((suggestion) => {
              const colors = CATEGORY_COLORS[suggestion.category];
              const isExpanded = expandedSuggestion === suggestion.id;
              const isApplied = appliedFixes.has(suggestion.id);

              return (
                <div
                  key={suggestion.id}
                  className={`
                    rounded-lg border transition-all
                    ${colors.bg} ${colors.border}
                    ${isApplied ? 'opacity-50' : ''}
                  `}
                >
                  <button
                    onClick={() => setExpandedSuggestion(isExpanded ? null : suggestion.id)}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">
                        {suggestion.category === 'accessibility' && '♿'}
                        {suggestion.category === 'performance' && '⚡'}
                        {suggestion.category === 'seo' && '🔍'}
                        {suggestion.category === 'best-practice' && '✓'}
                        {suggestion.category === 'security' && '🔒'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white truncate">{suggestion.title}</span>
                          <span
                            className={`
                              rounded-full px-2 py-0.5 text-[10px] uppercase
                              ${PRIORITY_COLORS[suggestion.priority]}
                            `}
                          >
                            {suggestion.priority}
                          </span>
                          {suggestion.autoFixable && (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                              Auto-fix
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${colors.text} line-clamp-2`}>{suggestion.description}</p>
                      </div>
                      <svg
                        className={`h-5 w-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-700/50 px-3 pb-3 pt-2">
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-slate-500">Impact:</span>
                          <p className="text-slate-300">{suggestion.impact}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Effort:</span>
                          <p className="text-slate-300 capitalize">{suggestion.effort}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Element:</span>
                          <p className="font-mono text-slate-300">{suggestion.element || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Confidence:</span>
                          <p className="text-slate-300">{Math.round(suggestion.confidence * 100)}%</p>
                        </div>
                      </div>

                      {suggestion.selector && (
                        <div className="mb-3">
                          <span className="text-slate-500 text-sm">Selector:</span>
                          <code className="ml-2 rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 font-mono">
                            {suggestion.selector}
                          </code>
                        </div>
                      )}

                      {suggestion.autoFixable && !isApplied && (
                        <button
                          onClick={() => handleApplyFix(suggestion)}
                          disabled={applyingFix === suggestion.id}
                          className="w-full rounded-lg bg-emerald-600 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {applyingFix === suggestion.id ? (
                            <>
                              <span className="animate-spin">⟳</span>
                              Applying...
                            </>
                          ) : (
                            <>
                              <span>🔧</span>
                              Apply Fix
                            </>
                          )}
                        </button>
                      )}

                      {isApplied && (
                        <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 py-2 text-sm text-emerald-400">
                          <span>✓</span>
                          Fix applied successfully
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-700 bg-slate-900/50 px-4 py-2 text-xs text-slate-500">
          <div>
            {analysis && (
              <span>
                {filteredSuggestions.length} of {analysis.summary.total} suggestions
                {analysis.summary.autoFixable > 0 && (
                  <span className="ml-2 text-emerald-400">
                    ({analysis.summary.autoFixable} auto-fixable)
                  </span>
                )}
              </span>
            )}
          </div>
          <div>FrontendDevHelper AI Analysis</div>
        </div>
      </div>
    </div>
  );
};

export default AISuggestions;
