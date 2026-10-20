import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Compass,
  ListChecks,
  Link2,
  ExternalLink,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trophy,
  Info
} from 'lucide-react';
import { DEFAULT_PATHS, BOSS_CHALLENGES } from '../data/gameData';

// Normalize a step into object form { text, link?, linkText? }
export function normalizeStep(step) {
  if (!step) return { text: '' };
  if (typeof step === 'string') return { text: step };
  return step;
}

export function normalizeSteps(steps) {
  if (!steps || !Array.isArray(steps)) return [];
  return steps.map(normalizeStep).filter(s => s && (s.text || s.link));
}

// Render basic markdown-style text formatting (**bold** and *italic*)
export function renderFormattedText(text) {
  if (!text || typeof text !== 'string') return text || null;
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    if (match[2]) {
      parts.push(<strong key={key++} className="font-bold text-white">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++} className="italic text-slate-200">{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : text;
}

// Helper to look up an activity's full details and directions
export function findActivityForSubmission(submission, classActivities = [], activeBoss = null) {
  if (!submission) return null;

  const subTitleLower = (submission.activityTitle || '').trim().toLowerCase();
  const subIdStr = submission.activityId ? String(submission.activityId) : '';

  // 1. Look in class-specific custom activities if provided
  if (Array.isArray(classActivities) && classActivities.length > 0) {
    for (const path of classActivities) {
      if (Array.isArray(path.options)) {
        for (const opt of path.options) {
          const optTitleLower = (opt.title || '').trim().toLowerCase();
          const optIdStr = opt.id ? String(opt.id) : '';
          if ((subIdStr && optIdStr === subIdStr) || (subTitleLower && optTitleLower === subTitleLower)) {
            return {
              id: opt.id,
              title: opt.title || submission.activityTitle,
              desc: opt.desc || submission.activityDesc || '',
              type: opt.type || submission.activityType || 'Activity',
              xp: opt.xp || submission.xp || 0,
              steps: normalizeSteps(opt.steps && opt.steps.length > 0 ? opt.steps : submission.activitySteps),
              proTip: opt.proTip || submission.activityProTip || '',
              pathId: path.id,
              pathTitle: path.title || '',
              pathSubtitle: path.subtitle || '',
              pathColor: path.color || '',
              isBoss: false
            };
          }
        }
      }
    }
  }

  // 2. Look in default curriculum paths
  if (Array.isArray(DEFAULT_PATHS)) {
    for (const path of DEFAULT_PATHS) {
      if (Array.isArray(path.options)) {
        for (const opt of path.options) {
          const optTitleLower = (opt.title || '').trim().toLowerCase();
          const optIdStr = opt.id ? String(opt.id) : '';
          if ((subIdStr && optIdStr === subIdStr) || (subTitleLower && optTitleLower === subTitleLower)) {
            return {
              id: opt.id,
              title: opt.title || submission.activityTitle,
              desc: opt.desc || submission.activityDesc || '',
              type: opt.type || submission.activityType || 'Activity',
              xp: opt.xp || submission.xp || 0,
              steps: normalizeSteps(opt.steps && opt.steps.length > 0 ? opt.steps : submission.activitySteps),
              proTip: opt.proTip || submission.activityProTip || '',
              pathId: path.id,
              pathTitle: path.title || '',
              pathSubtitle: path.subtitle || '',
              pathColor: path.color || '',
              isBoss: false
            };
          }
        }
      }
    }
  }

  // 3. Look in active boss challenge or standard boss challenges
  if (activeBoss) {
    const bossTitleLower = (activeBoss.name || activeBoss.title || '').trim().toLowerCase();
    const bossIdStr = activeBoss.id ? String(activeBoss.id) : '';
    if ((subIdStr && bossIdStr === subIdStr) || (subTitleLower && bossTitleLower === subTitleLower) || submission.isBoss) {
      return {
        id: activeBoss.id,
        title: activeBoss.name || activeBoss.title || submission.activityTitle,
        desc: activeBoss.desc || submission.activityDesc || '',
        type: 'Boss Challenge',
        xp: activeBoss.reward || submission.xp || 300,
        coinReward: activeBoss.coinReward || 100,
        requirements: activeBoss.requirements || submission.activityRequirements || '',
        steps: normalizeSteps(activeBoss.steps && activeBoss.steps.length > 0 ? activeBoss.steps : submission.activitySteps),
        isBoss: true,
        pathTitle: 'Weekly Boss Challenge'
      };
    }
  }

  if (Array.isArray(BOSS_CHALLENGES)) {
    for (const boss of BOSS_CHALLENGES) {
      const bossTitleLower = (boss.name || boss.title || '').trim().toLowerCase();
      const bossIdStr = boss.id ? String(boss.id) : '';
      if ((subIdStr && bossIdStr === subIdStr) || (subTitleLower && bossTitleLower === subTitleLower)) {
        return {
          id: boss.id,
          title: boss.name || submission.activityTitle,
          desc: boss.desc || submission.activityDesc || '',
          type: 'Boss Challenge',
          xp: boss.reward || submission.xp || 300,
          requirements: boss.requirements || submission.activityRequirements || '',
          steps: normalizeSteps(boss.steps && boss.steps.length > 0 ? boss.steps : submission.activitySteps),
          isBoss: true,
          pathTitle: 'Weekly Boss Challenge'
        };
      }
    }
  }

  // 4. Fallback to snapshot fields stored directly on the submission object
  if (submission.activityDesc || (submission.activitySteps && submission.activitySteps.length > 0)) {
    return {
      id: submission.activityId,
      title: submission.activityTitle || 'Activity',
      desc: submission.activityDesc || '',
      type: submission.activityType || (submission.isBoss ? 'Boss Challenge' : 'Activity'),
      xp: submission.xp || 0,
      steps: normalizeSteps(submission.activitySteps),
      proTip: submission.activityProTip || '',
      requirements: submission.activityRequirements || '',
      isBoss: !!submission.isBoss,
      pathTitle: submission.isBoss ? 'Weekly Boss Challenge' : ''
    };
  }

  // 5. Minimal fallback
  return {
    id: submission.activityId,
    title: submission.activityTitle || 'Activity',
    desc: '',
    type: submission.activityType || '',
    xp: submission.xp || 0,
    steps: [],
    proTip: '',
    requirements: '',
    isBoss: !!submission.isBoss,
    pathTitle: submission.isBoss ? 'Boss Challenge' : ''
  };
}

/**
 * ActivityDirectionsCard
 *
 * Renders the directions, objective, required steps, links, and pro-tips
 * for a student submission so teachers can reference the assignment guidelines
 * directly when deciding whether to approve or deny work.
 */
export default function ActivityDirectionsCard({
  submission,
  classActivities = [],
  activeBoss = null,
  defaultExpanded = true,
  forceExpanded = null,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Sync when forceExpanded prop changes
  useEffect(() => {
    if (forceExpanded !== null && forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  const activity = findActivityForSubmission(submission, classActivities, activeBoss);

  if (!activity) return null;

  const hasSteps = activity.steps && activity.steps.length > 0;
  const hasDesc = activity.desc && activity.desc.trim().length > 0;
  const hasContent = hasSteps || hasDesc || activity.requirements || activity.proTip;

  if (!hasContent) {
    return (
      <div className={`bg-slate-900/40 border border-slate-800 rounded-xl p-3 text-xs text-slate-500 italic flex items-center gap-2 mb-3.5 ${className}`}>
        <Info className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
        <span>No specific directions found for "{activity.title}".</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl transition-all duration-200 mb-3.5 overflow-hidden ${
      isExpanded
        ? 'bg-gradient-to-br from-slate-900/95 to-slate-950/95 border-2 border-amber-500/40 shadow-lg'
        : 'bg-slate-900/70 border border-amber-500/25 hover:border-amber-500/40'
    } ${className}`}>
      {/* ── HEADER / SUMMARY ROW ── */}
      <div className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex-shrink-0">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                Activity Directions
              </span>
              {activity.pathTitle && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {activity.pathTitle}
                </span>
              )}
              {activity.type && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {activity.type}
                </span>
              )}
              {activity.xp > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
                  +{activity.xp} XP
                </span>
              )}
            </div>

            {/* In collapsed view, display 1-line preview of objective */}
            {!isExpanded && (
              <p className="text-xs text-slate-300 truncate mt-1">
                {activity.desc || (hasSteps ? `${activity.steps.length} required step(s)` : 'Click to view directions')}
              </p>
            )}
          </div>
        </div>

        {/* Toggle Expand / Collapse Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all flex-shrink-0 ${
            isExpanded
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
          }`}
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? 'Hide Directions' : 'View Directions'}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* ── EXPANDED FULL DIRECTIONS VIEW ── */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-3.5">
          {/* Assignment Objective / Prompt */}
          {activity.desc && (
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                Assignment Prompt & Objective
              </span>
              <p className="text-sm text-slate-200 leading-relaxed font-sans">
                {renderFormattedText(activity.desc)}
              </p>
            </div>
          )}

          {/* Boss Challenge Requirements */}
          {activity.requirements && (
            <div className="bg-amber-950/30 border border-amber-600/30 p-3 rounded-xl text-xs space-y-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                Challenge Requirements:
              </span>
              <p className="text-amber-100 leading-relaxed">
                {renderFormattedText(activity.requirements)}
              </p>
            </div>
          )}

          {/* Step-by-Step Directions */}
          {hasSteps && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                Required Steps ({activity.steps.length})
              </span>
              <ol className="space-y-2 pl-0.5">
                {activity.steps.map((step, idx) => {
                  const stepText = typeof step === 'string' ? step : step.text;
                  const stepLink = typeof step === 'object' ? step.link : null;
                  const stepLinkText = typeof step === 'object' ? step.linkText : null;

                  return (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-200 group">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center text-[10px] font-bold border border-slate-700 mt-0.5 shadow-sm group-hover:border-amber-500/50 transition-colors">
                        {idx + 1}
                      </span>
                      <div className="leading-relaxed flex-1 pt-0.5">
                        <span>{renderFormattedText(stepText)}</span>
                        {stepLink && (
                          <a
                            href={stepLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 ml-2 px-2.5 py-0.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-600/50 rounded-lg text-blue-300 hover:text-white text-[11px] font-semibold transition-all align-middle shadow-sm"
                          >
                            <Link2 className="w-3 h-3 text-blue-400" aria-hidden="true" />
                            <span>{stepLinkText || 'Open Resource Link'}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Pro Tip Callout */}
          {activity.proTip && (
            <div className="bg-blue-950/40 border border-blue-600/30 p-3 rounded-xl flex items-start gap-2.5 text-xs">
              <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                  Pro Tip:
                </span>
                <p className="text-blue-100 leading-relaxed">
                  {renderFormattedText(activity.proTip)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
