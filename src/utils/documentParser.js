/**
 * Smart Document Parser to convert Google Doc / Word / Text content into Choice Board Activities.
 */
export function parseDocumentToActivities(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const activities = [];

  let currentCategory = 'path1';
  let currentActivity = null;
  let inSteps = false;

  const categoryKeywords = {
    'building': 'path1',
    'wordsmith': 'path1',
    'reading': 'path1',
    'strategy': 'path2',
    'artist': 'path2',
    'math': 'path2',
    'coding': 'path3',
    'maker': 'path3',
    'science': 'path3',
    'driving': 'path4',
    'scholar': 'path4',
    'social studies': 'path4'
  };

  const detectType = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('high tech') || lower.includes('digital') || lower.includes('video') || lower.includes('audio') || lower.includes('app') || lower.includes('website')) return 'High Tech';
    if (lower.includes('collaboration') || lower.includes('partner') || lower.includes('group') || lower.includes('interview') || lower.includes('team')) return 'Collaboration';
    if (lower.includes('reflection') || lower.includes('journal') || lower.includes('self') || lower.includes('review')) return 'Reflection';
    if (lower.includes('creation') || lower.includes('build') || lower.includes('draw') || lower.includes('poster') || lower.includes('craft')) return 'Creation';
    return 'Low Tech';
  };

  const detectXP = (text) => {
    const match = text.match(/(\d+)\s*(xp|points|pts)/i);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val > 0 && val <= 1000) return val;
    }
    return 100;
  };

  const finalizeActivity = () => {
    if (currentActivity && currentActivity.title) {
      if (!currentActivity.steps || currentActivity.steps.length === 0) {
        currentActivity.steps = [{ text: 'Complete the activity instructions as specified.' }];
      }
      activities.push(currentActivity);
    }
    currentActivity = null;
    inSteps = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect category header (e.g. "Category: Math", "Reading Path:", "### Building")
    const catMatch = line.match(/^(category|path|section|unit|module)\s*[:\-]\s*(.+)$/i) || line.match(/^(###?\s*)(.+)$/);
    if (catMatch) {
      const catTitle = (catMatch[2] || catMatch[0]).trim();
      const catLower = catTitle.toLowerCase();
      let matchedKey = null;
      for (const [kw, pathId] of Object.entries(categoryKeywords)) {
        if (catLower.includes(kw)) {
          matchedKey = pathId;
          break;
        }
      }
      currentCategory = matchedKey || `path${(activities.length % 4) + 1}`;
      continue;
    }

    // Detect new activity start
    // Matches: "1. Activity Name", "- Activity Name", "Activity: Name", "Title: Name"
    const actMatch = line.match(/^(\d+[\.\)]|\-|\*|Activity\s*\d*\s*[:\-])\s*(.+)$/i);
    const isExplicitTitle = line.toLowerCase().startsWith('title:');

    if (actMatch || isExplicitTitle) {
      finalizeActivity();

      let rawTitle = isExplicitTitle ? line.substring(6).trim() : actMatch[2].trim();
      // Extract XP or Type if embedded in title line, e.g. "Word Sketch (Low Tech - 100 XP)"
      const xp = detectXP(line);
      const type = detectType(line);

      // Clean title string
      rawTitle = rawTitle.replace(/\(([^)]+)\)/, '').replace(/(\d+)\s*(xp|pts|points)/i, '').trim();

      currentActivity = {
        id: `imported-${Date.now()}-${activities.length}`,
        pathId: currentCategory,
        title: rawTitle || 'Imported Activity',
        desc: '',
        type: type,
        xp: xp,
        steps: [],
        proTip: ''
      };
      continue;
    }

    if (!currentActivity) {
      // If line looks like a title without list prefix
      if (line.length < 60 && !line.includes(':') && !line.endsWith('.')) {
        currentActivity = {
          id: `imported-${Date.now()}-${activities.length}`,
          pathId: currentCategory,
          title: line,
          desc: '',
          type: detectType(line),
          xp: detectXP(line),
          steps: [],
          proTip: ''
        };
        continue;
      }
    }

    if (currentActivity) {
      // Check for explicit fields
      if (line.toLowerCase().startsWith('description:')) {
        currentActivity.desc = line.substring(12).trim();
      } else if (line.toLowerCase().startsWith('type:')) {
        currentActivity.type = detectType(line.substring(5));
      } else if (line.toLowerCase().startsWith('xp:') || line.toLowerCase().startsWith('points:')) {
        currentActivity.xp = detectXP(line);
      } else if (line.toLowerCase().startsWith('pro tip:') || line.toLowerCase().startsWith('tip:')) {
        currentActivity.proTip = line.replace(/^(pro tip|tip)\s*[:\-]\s*/i, '').trim();
      } else if (line.toLowerCase().startsWith('steps:') || line.toLowerCase().startsWith('instructions:')) {
        inSteps = true;
      } else if (inSteps || line.match(/^(\d+[\.\)]|\-|\*)\s+/)) {
        const stepText = line.replace(/^(\d+[\.\)]|\-|\*)\s+/, '').trim();
        if (stepText) {
          currentActivity.steps.push({ text: stepText });
        }
      } else {
        if (!currentActivity.desc) {
          currentActivity.desc = line;
        } else {
          currentActivity.desc += ' ' + line;
        }
      }
    }
  }

  finalizeActivity();
  return activities;
}
