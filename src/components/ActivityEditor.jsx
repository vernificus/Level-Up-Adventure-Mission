import React, { useState, useEffect, useRef } from 'react';
import { realBackend as backend } from '../services/realBackend';
import { useAuth } from '../context/AuthContext';
import { LEARNING_PATHS as DEFAULT_PATHS, PATH_COLORS } from '../data/gameData';
import {
  Save, Plus, Trash2, BookOpen, Search, X, ChevronDown, ChevronUp,
  GripVertical, Link2, ExternalLink, Eye, EyeOff, Bold, Italic, Type,
  ArrowUp, ArrowDown, Copy, ChevronRight, FileText, Loader2, Check, Filter, Sparkles,
  Building2, ArrowUpDown, SlidersHorizontal, User, Tag
} from 'lucide-react';
import DocumentImporterModal from './DocumentImporterModal';

// Normalize a step to object form for backward compatibility.
// Old steps are plain strings; new steps are { text, link?, linkText? }.
function normalizeStep(step) {
  if (typeof step === 'string') return { text: step };
  return step;
}

function normalizeSteps(steps) {
  if (!steps) return [{ text: '' }];
  return steps.map(normalizeStep);
}

// Render text with basic markdown-style formatting: **bold** and *italic*
function renderFormattedText(text) {
  if (!text) return null;
  const parts = [];
  let remaining = text;
  let key = 0;

  // Process **bold** and *italic* markers
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    if (match[2]) {
      // **bold**
      parts.push(<strong key={key++} className="font-bold text-white">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={key++} className="italic text-slate-200">{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : text;
}

// Step editor component for a single step with link support
function StepEditor({ step, index, totalSteps, onChange, onRemove, onMoveUp, onMoveDown }) {
  const [showLink, setShowLink] = useState(!!(step.link || step.linkText));
  const textareaRef = useRef(null);

  const handleTextChange = (e) => {
    onChange({ ...step, text: e.target.value });
  };

  const handleLinkChange = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const insertFormatting = (wrapper) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = step.text || '';
    const selected = text.slice(start, end);

    if (selected) {
      const newText = text.slice(0, start) + wrapper + selected + wrapper + text.slice(end);
      onChange({ ...step, text: newText });
    } else {
      const placeholder = wrapper === '**' ? 'bold text' : 'italic text';
      const newText = text.slice(0, start) + wrapper + placeholder + wrapper + text.slice(end);
      onChange({ ...step, text: newText });
      // Set cursor inside the markers after render
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + wrapper.length, start + wrapper.length + placeholder.length);
      }, 0);
    }
  };

  return (
    <div className="bg-slate-800/80 rounded-lg border border-slate-600 p-3 group/step">
      <div className="flex items-start gap-2">
        {/* Step number badge */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <span className="w-6 h-6 rounded-full bg-slate-600 text-yellow-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {index + 1}
          </span>
          <div className="flex flex-col gap-0.5 opacity-0 group-hover/step:opacity-100 transition-opacity">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={`Move step ${index + 1} up`}
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === totalSteps - 1}
              className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={`Move step ${index + 1} down`}
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {/* Formatting toolbar */}
          <div className="flex items-center gap-1 mb-1">
            <button
              type="button"
              onClick={() => insertFormatting('**')}
              className="p-1 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="Bold (**text**)"
              aria-label="Insert bold formatting"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*')}
              className="p-1 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="Italic (*text*)"
              aria-label="Insert italic formatting"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-slate-600 mx-1" />
            <button
              type="button"
              onClick={() => setShowLink(!showLink)}
              className={`p-1 rounded transition-colors flex items-center gap-1 text-xs ${showLink ? 'text-blue-400 bg-blue-500/20' : 'text-slate-500 hover:text-white hover:bg-slate-700'}`}
              title="Add a link to this step"
              aria-label={showLink ? 'Hide link fields' : 'Add link to this step'}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link</span>
            </button>
          </div>

          {/* Step text */}
          <textarea
            ref={textareaRef}
            value={step.text || ''}
            onChange={handleTextChange}
            placeholder="Describe this step..."
            rows={2}
            className="w-full bg-slate-700 text-sm text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 outline-none resize-y min-h-[52px] placeholder-slate-500"
            aria-label={`Step ${index + 1} instructions`}
          />

          {/* Link fields */}
          {showLink && (
            <div className="mt-2 p-2.5 bg-slate-700/50 rounded-lg border border-slate-600/50 space-y-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  Link URL
                </label>
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
                  <input
                    type="url"
                    value={step.link || ''}
                    onChange={(e) => handleLinkChange('link', e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 bg-slate-700 text-sm text-blue-300 px-2 py-1.5 rounded border border-slate-600 focus:border-blue-500 outline-none placeholder-slate-500"
                    aria-label={`Step ${index + 1} link URL`}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  Link display text (optional)
                </label>
                <input
                  type="text"
                  value={step.linkText || ''}
                  onChange={(e) => handleLinkChange('linkText', e.target.value)}
                  placeholder="Click here to open..."
                  className="w-full bg-slate-700 text-sm text-white px-2 py-1.5 rounded border border-slate-600 focus:border-blue-500 outline-none placeholder-slate-500"
                  aria-label={`Step ${index + 1} link display text`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={onRemove}
          className="p-1 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 mt-1"
          aria-label={`Remove step ${index + 1}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Preview of how the activity will look to students
function ActivityPreview({ activity }) {
  const steps = normalizeSteps(activity.steps);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-slate-500" aria-hidden="true" />
        <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Student Preview</span>
      </div>

      <h4 className="text-lg font-black uppercase italic text-white mb-1">{activity.title || 'Untitled Activity'}</h4>
      <p className="text-sm text-slate-400 mb-3">{activity.desc || 'No description'}</p>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs bg-slate-700 text-yellow-400 px-2 py-1 rounded-full font-bold">+{activity.xp} XP</span>
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">{activity.type}</span>
      </div>

      <div className="space-y-3 mb-4">
        <h5 className="font-bold text-slate-300 uppercase text-xs tracking-widest">How to Play:</h5>
        <ol className="space-y-2.5">
          {steps.map((step, idx) => (
            <li key={idx} className="flex gap-3 text-slate-300">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 text-yellow-500 flex items-center justify-center text-xs font-bold border border-slate-600">
                {idx + 1}
              </span>
              <div className="text-sm leading-relaxed">
                <span>{renderFormattedText(step.text)}</span>
                {step.link && (
                  <span className="inline-flex items-center gap-1 ml-1 text-blue-400 underline">
                    <Link2 className="w-3 h-3" />
                    {step.linkText || step.link}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {activity.proTip && (
        <div className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-xl">
          <span className="text-xs font-black uppercase tracking-widest text-blue-400 block mb-1">Pro Tip</span>
          <p className="text-sm text-blue-100">{renderFormattedText(activity.proTip)}</p>
        </div>
      )}
    </div>
  );
}

export default function ActivityEditor({
  classId,
  paths: passedPaths,
  onChange,
  categoryNames,
  categorySubtitles,
  organizationId: propOrgId,
  organizationName: propOrgName,
  onSave,
  onCancel
}) {
  const { user } = useAuth() || {};
  const [learningPaths, setLearningPaths] = useState(passedPaths || DEFAULT_PATHS);
  const [libraryActivities, setLibraryActivities] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState(null);
  
  // Default to the organization that the user is assigned to in the user list
  const userOrgId = user?.organizationId || null;
  const userOrgName = user?.organizationName || '';

  // Board's own organization (used for publishing and initial library view)
  const [boardOrgId, setBoardOrgId] = useState(userOrgId || propOrgId || null);
  const [boardOrgName, setBoardOrgName] = useState(userOrgName || propOrgName || '');

  // Filter organization inside the library modal:
  // For teachers: strictly locked to userOrgId.
  // For admins: can view propOrgId or userOrgId.
  const [filterOrgId, setFilterOrgId] = useState(
    user?.role === 'admin' ? (propOrgId || userOrgId || null) : userOrgId
  );
  const [filterOrgName, setFilterOrgName] = useState(
    user?.role === 'admin' ? (propOrgName || userOrgName || '') : userOrgName
  );
  const [organizationsList, setOrganizationsList] = useState([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState('All');
  const [selectedSortOption, setSelectedSortOption] = useState('newest');
  
  const [importedToast, setImportedToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDocImporter, setShowDocImporter] = useState(false);

  // Sync board and filter org with incoming props
  useEffect(() => {
    if (propOrgId !== undefined) {
      if (user?.role === 'admin') {
        setBoardOrgId(userOrgId || propOrgId);
        setBoardOrgName(userOrgName || propOrgName || '');
        setFilterOrgId(propOrgId);
        setFilterOrgName(propOrgName || '');
      }
    }
  }, [propOrgId, propOrgName, user?.role, userOrgId, userOrgName]);

  // Sync with user's assigned organization from user list when user loads
  useEffect(() => {
    if (user?.organizationId) {
      setBoardOrgId(user.organizationId);
      setBoardOrgName(user.organizationName || '');
      if (user?.role !== 'admin' || !filterOrgId) {
        setFilterOrgId(user.organizationId);
        setFilterOrgName(user.organizationName || '');
      }
    }
  }, [user]);

  // Which activity is currently being edited (pathId + activityId)
  const [editingPathId, setEditingPathId] = useState(null);
  const [editingActivityId, setEditingActivityId] = useState(null);

  // Which path sections are expanded in the sidebar
  // Initialize all paths as expanded (dynamically based on loaded data)
  const [expandedPaths, setExpandedPaths] = useState({});

  // Show/hide preview
  const [showPreview, setShowPreview] = useState(false);

  // Helper to update state AND trigger onChange prop for parent component
  const updateLearningPaths = (updater) => {
    setLearningPaths(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (onChange) onChange(next);
      return next;
    });
  };

  useEffect(() => {
    if (passedPaths) {
      let paths = passedPaths.map(path => ({
        ...path,
        title: categoryNames?.[path.id] || path.title,
        subtitle: categorySubtitles?.[path.id] || path.subtitle,
      }));

      // Add any extra categories defined in categoryNames
      if (categoryNames) {
        const existingIds = new Set(paths.map(p => p.id));
        Object.keys(categoryNames).forEach(key => {
          if (!existingIds.has(key)) {
            paths.push({
              id: key,
              title: categoryNames[key],
              subtitle: categorySubtitles?.[key] || '',
              icon: 'BookOpen',
              color: PATH_COLORS[(paths.length) % PATH_COLORS.length],
              options: [],
            });
          }
        });
      }

      paths = paths.map(path => ({
        ...path,
        options: (path.options || []).map(opt => ({
          ...opt,
          steps: normalizeSteps(opt.steps),
        })),
      }));

      setLearningPaths(paths);
      const expanded = {};
      paths.forEach(p => { expanded[p.id] = true; });
      setExpandedPaths(prev => ({ ...expanded, ...prev }));
    } else if (classId) {
      const loadData = async () => {
        setLoading(true);
        const classDoc = await backend.getClass(classId);
        if (classDoc) {
          if (classDoc.organizationId) {
            setBoardOrgId(classDoc.organizationId);
            setFilterOrgId(prev => prev || classDoc.organizationId);
            if (classDoc.organizationName) {
              setBoardOrgName(classDoc.organizationName);
              setFilterOrgName(prev => prev || classDoc.organizationName);
            } else {
              backend.getOrganization(classDoc.organizationId).then(org => {
                if (org?.name) {
                  setBoardOrgName(org.name);
                  setFilterOrgName(prev => prev || org.name);
                }
              }).catch(() => {});
            }
          }

          let paths = classDoc.activities && classDoc.activities.length > 0
            ? classDoc.activities
            : DEFAULT_PATHS;

          if (classDoc.categoryNames || classDoc.categorySubtitles) {
            paths = paths.map(path => ({
              ...path,
              title: classDoc.categoryNames?.[path.id] || path.title,
              subtitle: classDoc.categorySubtitles?.[path.id] || path.subtitle,
            }));

            // Add any extra categories that don't have activity paths yet
            if (classDoc.categoryNames) {
              const existingIds = new Set(paths.map(p => p.id));
              Object.keys(classDoc.categoryNames).forEach((key, idx) => {
                if (!existingIds.has(key)) {
                  paths.push({
                    id: key,
                    title: classDoc.categoryNames[key],
                    subtitle: classDoc.categorySubtitles?.[key] || '',
                    icon: 'BookOpen',
                    color: PATH_COLORS[(paths.length) % PATH_COLORS.length],
                    options: [],
                  });
                }
              });
            }

            // Filter out paths that were removed from categoryNames
            if (classDoc.categoryNames && Object.keys(classDoc.categoryNames).length > 0) {
              paths = paths.filter(p => p.id in classDoc.categoryNames);
            }

            // Sort by categoryOrder if available
            if (Array.isArray(classDoc.categoryOrder) && classDoc.categoryOrder.length > 0) {
              paths.sort((a, b) => {
                const idxA = classDoc.categoryOrder.indexOf(a.id);
                const idxB = classDoc.categoryOrder.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
              });
            }
          }

          // Normalize all steps to object form
          paths = paths.map(path => ({
            ...path,
            options: path.options.map(opt => ({
              ...opt,
              steps: normalizeSteps(opt.steps),
            })),
          }));

          setLearningPaths(paths);
          // Expand all path sections by default
          const expanded = {};
          paths.forEach(p => { expanded[p.id] = true; });
          setExpandedPaths(expanded);
        }
        setLoading(false);
      };
      loadData();
    }
  }, [classId, passedPaths, categoryNames, categorySubtitles]);

  const loadLibrary = async (orgIdOverride) => {
    setLibraryLoading(true);
    setLibraryError(null);
    setShowLibrary(true);

    const isUserAdmin = user?.role === 'admin' || user?.email?.toLowerCase() === 'matthew.harbert@lcps.org';

    // If teacher: strictly locked to userOrgId (cannot query other organizations)
    // If admin: can view orgIdOverride, filterOrgId, or userOrgId
    let effectiveOrgId = null;
    if (typeof orgIdOverride === 'string' && orgIdOverride.trim() !== '') {
      effectiveOrgId = orgIdOverride.trim();
    } else if (isUserAdmin) {
      effectiveOrgId = filterOrgId || propOrgId || userOrgId || null;
    } else {
      effectiveOrgId = userOrgId;
    }

    try {
      const [activities, orgs] = await Promise.all([
        backend.getPublicActivities(effectiveOrgId),
        isUserAdmin ? backend.getOrganizations() : Promise.resolve([])
      ]);
      setLibraryActivities(activities || []);
      if (orgs && orgs.length > 0) {
        setOrganizationsList(orgs);
        if (effectiveOrgId) {
          const matched = orgs.find(o => o.id === effectiveOrgId);
          if (matched) {
            setFilterOrgId(matched.id);
            setFilterOrgName(matched.name);
          }
        } else if (isUserAdmin && !filterOrgId && orgs[0]) {
          setFilterOrgId(orgs[0].id);
          setFilterOrgName(orgs[0].name);
        }
      }
    } catch (err) {
      console.error("Error loading library activities:", err);
      setLibraryError(err.message || "Failed to load library activities");
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleOrgChange = (newOrgId) => {
    const orgId = newOrgId || null;
    setFilterOrgId(orgId);
    const matched = organizationsList.find(o => o.id === orgId);
    setFilterOrgName(matched ? matched.name : (orgId ? '' : 'All Organizations'));
    loadLibrary(orgId);
  };

  const handleDeleteFromLibrary = async (activityId, activityTitle) => {
    if (!window.confirm(`Remove "${activityTitle}" from the organization library?`)) return;
    try {
      await backend.deleteLibraryActivity(activityId);
      setLibraryActivities(prev => prev.filter(a => a.id !== activityId));
      setImportedToast(`Removed "${activityTitle}" from library.`);
      setTimeout(() => setImportedToast(null), 3000);
    } catch (err) {
      alert('Error removing activity: ' + err.message);
    }
  };

  const handleUpdateActivity = (pathId, activityId, field, value) => {
    updateLearningPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      return {
        ...path,
        options: path.options.map(opt => {
          if (opt.id !== activityId) return opt;
          return { ...opt, [field]: value };
        })
      };
    }));
  };

  const handleAddActivity = (pathId) => {
    const newId = `${pathId}-${Date.now()}`;
    updateLearningPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      return {
        ...path,
        options: [...path.options, {
          id: newId,
          title: 'New Activity',
          desc: 'Description here',
          type: 'Low Tech',
          xp: 100,
          steps: [{ text: '' }],
          proTip: ''
        }]
      };
    }));
    // Auto-select the new activity for editing
    setEditingPathId(pathId);
    setEditingActivityId(newId);
    setExpandedPaths(prev => ({ ...prev, [pathId]: true }));
  };

  const handleDeleteActivity = (pathId, activityId) => {
    if (!window.confirm('Delete this activity?')) return;
    updateLearningPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      return {
        ...path,
        options: path.options.filter(opt => opt.id !== activityId)
      };
    }));
    // Clear selection if we deleted the active one
    if (editingActivityId === activityId) {
      setEditingActivityId(null);
      setEditingPathId(null);
    }
  };

  const handleDuplicateActivity = (pathId, activity) => {
    const newId = `${pathId}-${Date.now()}`;
    const duplicate = {
      ...activity,
      id: newId,
      title: `${activity.title} (Copy)`,
      steps: activity.steps.map(s => ({ ...normalizeStep(s) })),
    };
    updateLearningPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      return { ...path, options: [...path.options, duplicate] };
    }));
    setEditingPathId(pathId);
    setEditingActivityId(newId);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (classId) {
        await backend.saveClassActivities(classId, learningPaths);
        alert('Activities saved successfully!');
        if (onSave) onSave(learningPaths);
      } else if (onSave) {
        await onSave(learningPaths);
      } else {
        if (onChange) onChange(learningPaths);
        alert('Choice board activities updated! Remember to click "Save Template" below to finalize changes.');
      }
    } catch (error) {
      alert('Error saving activities: ' + error.message);
    }
    setLoading(false);
  };

  const handleImport = (activity, targetPathId) => {
    const cleanId = `${targetPathId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    updateLearningPaths(prev => prev.map(path => {
      if (path.id !== targetPathId) return path;
      const newActivity = {
        id: cleanId,
        title: activity.title || 'Untitled Activity',
        desc: activity.desc || '',
        type: activity.type || 'Low Tech',
        xp: typeof activity.xp === 'number' ? activity.xp : (parseInt(activity.xp) || 100),
        steps: normalizeSteps(activity.steps),
        proTip: activity.proTip || '',
        categoryTag: activity.categoryTag || ''
      };
      return { ...path, options: [...(path.options || []), newActivity] };
    }));
    const targetPath = learningPaths.find(p => p.id === targetPathId);
    setImportedToast(`Imported "${activity.title}" to ${targetPath?.title || 'choice board'}!`);
    setTimeout(() => setImportedToast(null), 3000);
  };

  const handlePublish = async (activity) => {
    // Default to the organization that the user is assigned to in the user list
    let publishOrgId = user?.organizationId || null;
    let publishOrgName = user?.organizationName || '';

    // If an admin has no assigned organization in the user list, allow fallback to boardOrgId or prompt
    if (!publishOrgId && user?.role === 'admin') {
      publishOrgId = boardOrgId || null;
      publishOrgName = boardOrgName || '';

      if (!publishOrgId && organizationsList.length > 0) {
        const chosenOrgId = window.prompt(
          `Publishing to library requires an organization.\nEnter Organization ID:\n` +
          organizationsList.map(o => `${o.name} -> ID: ${o.id}`).join('\n')
        );
        if (!chosenOrgId) return;
        publishOrgId = chosenOrgId.trim();
        const matched = organizationsList.find(o => o.id === publishOrgId);
        publishOrgName = matched ? matched.name : '';
      }
    }

    if (!publishOrgId) {
      alert('Cannot publish activity: Your account is not assigned to an organization in the user list. Please contact an administrator to assign your account.');
      return;
    }

    const orgDisplay = publishOrgName || 'your organization';
    if (!window.confirm(`Publish "${activity.title}" to the ${orgDisplay} library?\n\nNote: This will only be visible to users in ${orgDisplay}.`)) {
      return;
    }

    try {
      const pathObj = learningPaths.find(p => p.id === editingPathId);
      await backend.publishActivity({
        ...activity,
        categoryTag: pathObj?.title || ''
      }, publishOrgId, publishOrgName);
      alert(`"${activity.title}" published to ${orgDisplay} library! It is only visible to users in ${orgDisplay}.`);
      if (showLibrary) {
        loadLibrary(publishOrgId);
      }
    } catch (error) {
      alert('Error publishing: ' + error.message);
    }
  };

  // Get the currently editing activity
  const editingActivity = editingPathId && editingActivityId
    ? learningPaths.find(p => p.id === editingPathId)?.options.find(a => a.id === editingActivityId)
    : null;

  // Step management helpers for the editing activity
  const updateStep = (idx, newStep) => {
    if (!editingActivity) return;
    const newSteps = [...editingActivity.steps];
    newSteps[idx] = newStep;
    handleUpdateActivity(editingPathId, editingActivityId, 'steps', newSteps);
  };

  const removeStep = (idx) => {
    if (!editingActivity || editingActivity.steps.length <= 1) return;
    const newSteps = editingActivity.steps.filter((_, i) => i !== idx);
    handleUpdateActivity(editingPathId, editingActivityId, 'steps', newSteps);
  };

  const addStep = () => {
    if (!editingActivity) return;
    handleUpdateActivity(editingPathId, editingActivityId, 'steps', [
      ...editingActivity.steps,
      { text: '' }
    ]);
  };

  const moveStep = (idx, direction) => {
    if (!editingActivity) return;
    const newSteps = [...editingActivity.steps];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= newSteps.length) return;
    [newSteps[idx], newSteps[targetIdx]] = [newSteps[targetIdx], newSteps[idx]];
    handleUpdateActivity(editingPathId, editingActivityId, 'steps', newSteps);
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'Low Tech': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'High Tech': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Collaboration': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Reflection': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Creation': return 'bg-pink-500/20 text-pink-300 border-pink-500/40';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  const activityTypes = ['All', 'Low Tech', 'High Tech', 'Collaboration', 'Reflection', 'Creation'];

  const uniqueAuthors = Array.from(
    new Set((libraryActivities || []).map(a => a.authorName).filter(Boolean))
  );

  const filteredLibraryActivities = (libraryActivities || [])
    .filter(activity => {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (activity.title || '').toLowerCase().includes(q);
      const descMatch = (activity.desc || '').toLowerCase().includes(q);
      const authorMatch = (activity.authorName || '').toLowerCase().includes(q);
      const tagMatch = (activity.categoryTag || '').toLowerCase().includes(q);
      const matchesSearch = !q || titleMatch || descMatch || authorMatch || tagMatch;
      
      const matchesType = selectedTypeFilter === 'All' || activity.type === selectedTypeFilter;
      
      const matchesAuthor = selectedAuthorFilter === 'All' ||
        (selectedAuthorFilter === 'mine'
          ? (activity.authorId === user?.id || activity.authorName === (user?.name || user?.displayName))
          : activity.authorName === selectedAuthorFilter);
      
      return matchesSearch && matchesType && matchesAuthor;
    })
    .sort((a, b) => {
      if (selectedSortOption === 'newest') {
        const dateA = a.publishedAt?.toMillis ? a.publishedAt.toMillis() : (a.publishedAt ? new Date(a.publishedAt).getTime() : 0);
        const dateB = b.publishedAt?.toMillis ? b.publishedAt.toMillis() : (b.publishedAt ? new Date(b.publishedAt).getTime() : 0);
        return dateB - dateA;
      }
      if (selectedSortOption === 'oldest') {
        const dateA = a.publishedAt?.toMillis ? a.publishedAt.toMillis() : (a.publishedAt ? new Date(a.publishedAt).getTime() : 0);
        const dateB = b.publishedAt?.toMillis ? b.publishedAt.toMillis() : (b.publishedAt ? new Date(b.publishedAt).getTime() : 0);
        return dateA - dateB;
      }
      if (selectedSortOption === 'alpha-asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (selectedSortOption === 'alpha-desc') {
        return (b.title || '').localeCompare(a.title || '');
      }
      if (selectedSortOption === 'xp-high') {
        return (b.xp || 0) - (a.xp || 0);
      }
      if (selectedSortOption === 'xp-low') {
        return (a.xp || 0) - (b.xp || 0);
      }
      if (selectedSortOption === 'steps-most') {
        return (b.steps?.length || 0) - (a.steps?.length || 0);
      }
      if (selectedSortOption === 'steps-least') {
        return (a.steps?.length || 0) - (b.steps?.length || 0);
      }
      return 0;
    });

  const handleImportDocActivities = (importedActivities) => {
    if (!importedActivities || importedActivities.length === 0) return;
    updateLearningPaths(prev => {
      const updated = prev.map(p => ({ ...p, options: [...(p.options || [])] }));
      importedActivities.forEach(act => {
        const targetPathId = act.pathId || 'path1';
        let targetPath = updated.find(p => p.id === targetPathId);
        if (!targetPath) {
          targetPath = updated[0];
        }
        if (targetPath) {
          targetPath.options.push({
            id: `${targetPath.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: act.title,
            desc: act.desc || 'No description provided.',
            type: act.type || 'Low Tech',
            xp: act.xp || 100,
            steps: act.steps && act.steps.length > 0 ? act.steps : [{ text: 'Follow activity instructions.' }],
            proTip: act.proTip || ''
          });
        }
      });
      return updated;
    });
  };

  // ---- Main editor layout ----
  return (
    <div className="space-y-4">
      {/* Top toolbar */}
      <div className="flex flex-wrap justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 sticky top-0 z-10 shadow-xl gap-3">
        <h2 className="text-xl font-bold text-white">Edit Choice Board</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowDocImporter(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs transition-colors shadow"
          >
            <FileText className="w-4 h-4" aria-hidden="true" /> Import from Doc / Google Doc
          </button>
          <button
            type="button"
            onClick={() => loadLibrary(filterOrgId || propOrgId)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs transition-colors shadow"
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" /> Browse Library
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-xs transition-colors disabled:opacity-50 shadow"
          >
            <Save className="w-4 h-4" aria-hidden="true" /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <DocumentImporterModal
        isOpen={showDocImporter}
        onClose={() => setShowDocImporter(false)}
        onImportActivities={handleImportDocActivities}
        categoryNames={categoryNames || {}}
      />

      {/* Activity Library Modal Overlay */}
      {showLibrary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="library-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLibrary(false);
          }}
          onKeyDown={(e) => e.key === 'Escape' && setShowLibrary(false)}
        >
          <div className="bg-slate-800 border-2 border-blue-500/80 rounded-2xl w-full max-w-5xl p-6 h-[88vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex flex-wrap justify-between items-center pb-4 border-b border-slate-700 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <BookOpen className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="library-dialog-title" className="text-xl font-black text-white flex items-center gap-2 flex-wrap">
                    Activity Library
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {filteredLibraryActivities.length} of {libraryActivities.length} {libraryActivities.length === 1 ? 'activity' : 'activities'}
                    </span>
                    {(user?.role === 'admin' ? (filterOrgName || userOrgName) : (userOrgName || 'My Organization')) && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-purple-400" />
                        {user?.role === 'admin' ? (filterOrgName || userOrgName) : (userOrgName || 'My Organization')}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Browse and import activities shared by teachers in your organization.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Admin Organization Switcher */}
                {user?.role === 'admin' && organizationsList.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded-xl text-xs">
                    <Building2 className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-slate-400 font-semibold">Org:</span>
                    <select
                      value={filterOrgId || ''}
                      onChange={(e) => handleOrgChange(e.target.value)}
                      className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
                    >
                      {organizationsList.map(org => (
                        <option key={org.id} value={org.id} className="bg-slate-900">
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={() => setShowLibrary(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
                  aria-label="Close activity library"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Imported Toast Feedback */}
            {importedToast && (
              <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl flex items-center gap-2 text-emerald-300 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{importedToast}</span>
              </div>
            )}

            {/* Organization & Filter Controls Bar */}
            <div className="py-3 space-y-3 border-b border-slate-700/60">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" aria-hidden="true" />
                  <label htmlFor="library-search" className="sr-only">Search activities</label>
                  <input
                    id="library-search"
                    type="search"
                    placeholder="Search by title, description, teacher, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 bg-slate-900/80 rounded-xl text-white text-xs border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort Option Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
                  <label htmlFor="sort-library" className="text-slate-400 font-semibold whitespace-nowrap">Sort:</label>
                  <select
                    id="sort-library"
                    value={selectedSortOption}
                    onChange={(e) => setSelectedSortOption(e.target.value)}
                    className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
                  >
                    <option value="newest" className="bg-slate-900">Newest Added</option>
                    <option value="oldest" className="bg-slate-900">Oldest Added</option>
                    <option value="alpha-asc" className="bg-slate-900">Title (A → Z)</option>
                    <option value="alpha-desc" className="bg-slate-900">Title (Z → A)</option>
                    <option value="xp-high" className="bg-slate-900">XP (Highest First)</option>
                    <option value="xp-low" className="bg-slate-900">XP (Lowest First)</option>
                    <option value="steps-most" className="bg-slate-900">Most Steps</option>
                    <option value="steps-least" className="bg-slate-900">Fewest Steps</option>
                  </select>
                </div>

                {/* Author Filter Dropdown */}
                {uniqueAuthors.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <label htmlFor="author-library" className="text-slate-400 font-semibold whitespace-nowrap">Teacher:</label>
                    <select
                      id="author-library"
                      value={selectedAuthorFilter}
                      onChange={(e) => setSelectedAuthorFilter(e.target.value)}
                      className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs max-w-[140px] truncate"
                    >
                      <option value="All" className="bg-slate-900">All Teachers</option>
                      <option value="mine" className="bg-slate-900">My Published Only</option>
                      {uniqueAuthors.map(author => (
                        <option key={author} value={author} className="bg-slate-900">
                          {author}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 font-bold mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Type:
                </span>
                {activityTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedTypeFilter(type)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                      selectedTypeFilter === type
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Activities Content Area */}
            <div className="flex-1 overflow-y-auto pr-1 pt-3">
              {!user?.organizationId && user?.role !== 'admin' ? (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center p-8 bg-slate-900/40 rounded-2xl border border-amber-500/30">
                  <Building2 className="w-12 h-12 text-amber-500/80 mb-3" />
                  <h4 className="text-base font-bold text-white mb-1">No Organization Assigned</h4>
                  <p className="text-xs text-slate-300 max-w-md">
                    Your account is not currently assigned to an organization in the user list. Activities in the library are private and only visible to users in their respective organization. Please contact an administrator to assign your account to an organization.
                  </p>
                </div>
              ) : libraryLoading ? (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
                  <p className="text-sm font-semibold text-slate-300">Loading organization library activities...</p>
                </div>
              ) : libraryError ? (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center p-6 bg-slate-900/50 rounded-xl border border-red-500/30">
                  <p className="text-sm font-bold text-red-400 mb-2">Error Loading Library</p>
                  <p className="text-xs text-slate-400 max-w-md mb-4">{libraryError}</p>
                  <button
                    type="button"
                    onClick={() => loadLibrary()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredLibraryActivities.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center p-8 bg-slate-900/40 rounded-2xl border border-slate-700/60">
                  <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-3 text-slate-500">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-200 mb-1">
                    {libraryActivities.length === 0 ? "No activities published yet for your organization" : "No matching activities"}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mb-4">
                    {libraryActivities.length === 0
                      ? "Publish your own choice board activities to your school library using the 'Publish' button on any activity card!"
                      : "Try clearing your search query, changing the sort order, or selecting a different filter."}
                  </p>
                  {(searchQuery || selectedTypeFilter !== 'All' || selectedAuthorFilter !== 'All') && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setSelectedTypeFilter('All'); setSelectedAuthorFilter('All'); }}
                      className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition-colors"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {filteredLibraryActivities.map(activity => {
                    const isAuthorOrAdmin = activity.authorId === user?.id || user?.role === 'admin';
                    return (
                      <div
                        key={activity.id}
                        className="bg-slate-900/70 hover:bg-slate-900/90 p-5 rounded-2xl border border-slate-700/80 hover:border-slate-600 transition-all flex flex-col justify-between shadow-lg"
                      >
                        <div className="space-y-3">
                          {/* Badges, XP & Delete Header */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getTypeBadgeClass(activity.type)}`}>
                                {activity.type || 'Low Tech'}
                              </span>
                              {activity.categoryTag && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                                  <Tag className="w-3 h-3 text-slate-400" />
                                  {activity.categoryTag}
                                </span>
                              )}
                              {activity.organizationName && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40 flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-purple-400" />
                                  {activity.organizationName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
                                +{activity.xp || 100} XP
                              </span>
                              {isAuthorOrAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFromLibrary(activity.id, activity.title)}
                                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                                  title="Delete from organization library"
                                  aria-label={`Delete ${activity.title} from library`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Title & Desc */}
                          <div>
                            <h4 className="text-base font-black text-white">{activity.title}</h4>
                            {activity.desc && (
                              <p className="text-xs text-slate-300 mt-1 line-clamp-3 leading-relaxed">
                                {activity.desc}
                              </p>
                            )}
                          </div>

                          {/* Steps, ProTip and Author Attribution */}
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                            <span>📋 {activity.steps?.length || 1} {activity.steps?.length === 1 ? 'step' : 'steps'}</span>
                            {activity.proTip && <span>💡 Pro Tip included</span>}
                            {activity.authorName && (
                              <span className="truncate">👤 {activity.authorName}</span>
                            )}
                          </div>
                        </div>

                        {/* Import Action Row */}
                        <div className="mt-4 pt-3 border-t border-slate-800">
                          <span className="text-[11px] font-bold text-slate-400 block mb-2">Import to Path:</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {learningPaths.map(path => (
                              <button
                                key={path.id}
                                type="button"
                                onClick={() => handleImport(activity, path.id)}
                                className="text-xs font-bold bg-blue-600/90 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-lg transition-all shadow hover:shadow-blue-500/20 active:scale-95 truncate max-w-[180px]"
                                title={`Import to ${path.title}`}
                              >
                                + {path.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two-panel layout: sidebar + editor */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left sidebar: Activity list organized by path */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-3">
          {learningPaths.map(path => (
            <div key={path.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              {/* Path header - collapsible */}
              <button
                onClick={() => setExpandedPaths(prev => ({ ...prev, [path.id]: !prev[path.id] }))}
                className={`w-full flex items-center justify-between p-3 ${path.color} hover:brightness-110 transition-all`}
                aria-expanded={expandedPaths[path.id]}
                aria-controls={`path-list-${path.id}`}
              >
                <span className="font-black uppercase italic text-white text-sm truncate">{path.title}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded-full">{path.options.length}</span>
                  {expandedPaths[path.id]
                    ? <ChevronDown className="w-4 h-4 text-white/80" aria-hidden="true" />
                    : <ChevronRight className="w-4 h-4 text-white/80" aria-hidden="true" />
                  }
                </div>
              </button>

              {/* Activity list for this path */}
              {expandedPaths[path.id] && (
                <div id={`path-list-${path.id}`} className="p-2 space-y-1">
                  {path.options.map(activity => {
                    const isActive = editingPathId === path.id && editingActivityId === activity.id;
                    return (
                      <button
                        key={activity.id}
                        onClick={() => {
                          setEditingPathId(path.id);
                          setEditingActivityId(activity.id);
                          setShowPreview(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-600/30 border border-blue-500 text-white font-bold'
                            : 'hover:bg-slate-700 text-slate-300 border border-transparent'
                        }`}
                        aria-current={isActive ? 'true' : undefined}
                      >
                        <div className="font-bold truncate">{activity.title}</div>
                        <div className="text-xs text-slate-400 truncate">{activity.type} &middot; {activity.xp} XP</div>
                      </button>
                    );
                  })}

                  {/* Add activity button */}
                  <button
                    onClick={() => handleAddActivity(path.id)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-400 hover:text-slate-200 text-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add Activity
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right panel: Activity editor or empty state */}
        <div className="flex-1 min-w-0">
          {editingActivity ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
              {/* Editor header */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-700 bg-slate-800/90">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">Edit Activity</h3>
                  <span className="text-xs bg-slate-700 text-slate-300 font-semibold px-2.5 py-1 rounded-full border border-slate-600 truncate max-w-[220px]">
                    {learningPaths.find(p => p.id === editingPathId)?.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      showPreview ? 'bg-blue-600/30 text-blue-400 border border-blue-500' : 'bg-slate-700 text-slate-300 hover:text-white border border-slate-600'
                    }`}
                    aria-pressed={showPreview}
                  >
                    {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPreview ? 'Hide Preview' : 'Preview'}</span>
                  </button>
                  <button
                    onClick={() => handleDuplicateActivity(editingPathId, editingActivity)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition-colors border border-slate-600"
                    aria-label="Duplicate this activity"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    onClick={() => handlePublish(editingActivity)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-blue-300 rounded-lg text-xs font-bold transition-colors border border-slate-600"
                    aria-label="Publish to library"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Publish</span>
                  </button>
                  <button
                    onClick={() => handleDeleteActivity(editingPathId, editingActivityId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded-lg text-xs font-bold transition-colors border border-red-800/60"
                    aria-label="Delete this activity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-6">
                {/* Basic info section */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor={`edit-title-${editingActivityId}`} className="block text-sm font-bold text-slate-300 mb-1.5">
                      Activity Title
                    </label>
                    <input
                      id={`edit-title-${editingActivityId}`}
                      className="w-full bg-slate-700 text-white text-lg font-bold px-4 py-2.5 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
                      value={editingActivity.title}
                      onChange={(e) => handleUpdateActivity(editingPathId, editingActivityId, 'title', e.target.value)}
                      placeholder="Activity title..."
                    />
                  </div>

                  <div>
                    <label htmlFor={`edit-desc-${editingActivityId}`} className="block text-sm font-bold text-slate-300 mb-1.5">
                      Description
                    </label>
                    <textarea
                      id={`edit-desc-${editingActivityId}`}
                      className="w-full bg-slate-700 text-sm text-slate-200 px-4 py-2.5 rounded-lg border border-slate-600 focus:border-blue-500 outline-none resize-y min-h-[60px]"
                      value={editingActivity.desc}
                      onChange={(e) => handleUpdateActivity(editingPathId, editingActivityId, 'desc', e.target.value)}
                      placeholder="Brief description of the activity..."
                      rows={2}
                    />
                    <p className="text-xs text-slate-500 mt-1">Use **bold** and *italic* for formatting.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`edit-xp-${editingActivityId}`} className="block text-sm font-bold text-slate-300 mb-1.5">
                        XP Reward
                      </label>
                      <input
                        id={`edit-xp-${editingActivityId}`}
                        className="w-full bg-slate-700 text-yellow-400 font-bold px-4 py-2.5 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
                        type="number"
                        min="0"
                        step="10"
                        value={editingActivity.xp}
                        onChange={(e) => handleUpdateActivity(editingPathId, editingActivityId, 'xp', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label htmlFor={`edit-type-${editingActivityId}`} className="block text-sm font-bold text-slate-300 mb-1.5">
                        Activity Type
                      </label>
                      <select
                        id={`edit-type-${editingActivityId}`}
                        className="w-full bg-slate-700 text-slate-200 px-4 py-2.5 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
                        value={editingActivity.type}
                        onChange={(e) => handleUpdateActivity(editingPathId, editingActivityId, 'type', e.target.value)}
                      >
                        <option value="Low Tech">Low Tech</option>
                        <option value="High Tech">High Tech</option>
                        <option value="Collaboration">Collaboration</option>
                        <option value="Reflection">Reflection</option>
                        <option value="Creation">Creation</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-700" />

                {/* Steps section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Steps</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Instructions students will follow. Use formatting toolbar for **bold** and *italic*.</p>
                    </div>
                    <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded-full">
                      {editingActivity.steps.length} {editingActivity.steps.length === 1 ? 'step' : 'steps'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {editingActivity.steps.map((step, idx) => {
                      const normalizedStep = normalizeStep(step);
                      return (
                        <StepEditor
                          key={idx}
                          step={normalizedStep}
                          index={idx}
                          totalSteps={editingActivity.steps.length}
                          onChange={(newStep) => updateStep(idx, newStep)}
                          onRemove={() => removeStep(idx)}
                          onMoveUp={() => moveStep(idx, -1)}
                          onMoveDown={() => moveStep(idx, 1)}
                        />
                      );
                    })}
                  </div>

                  <button
                    onClick={addStep}
                    className="w-full mt-3 py-2.5 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-blue-500 hover:text-blue-400 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" /> Add Step
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-700" />

                {/* Pro Tip */}
                <div>
                  <label htmlFor={`edit-protip-${editingActivityId}`} className="block text-sm font-bold text-slate-300 mb-1.5">
                    Pro Tip
                  </label>
                  <textarea
                    id={`edit-protip-${editingActivityId}`}
                    className="w-full bg-slate-700 text-blue-300 px-4 py-2.5 rounded-lg border border-slate-600 focus:border-blue-500 outline-none resize-y min-h-[60px]"
                    value={editingActivity.proTip || ''}
                    onChange={(e) => handleUpdateActivity(editingPathId, editingActivityId, 'proTip', e.target.value)}
                    placeholder="Optional tip for students to earn extra XP..."
                    rows={2}
                  />
                  <p className="text-xs text-slate-500 mt-1">Supports **bold** and *italic* formatting.</p>
                </div>

                {/* Preview section */}
                {showPreview && (
                  <>
                    <div className="border-t border-slate-700" />
                    <ActivityPreview activity={editingActivity} />
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Empty state when no activity is selected */
            <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col items-center justify-center min-h-[400px] text-center p-8">
              <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
                <Type className="w-8 h-8 text-slate-500" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-300 mb-2">Select an Activity to Edit</h3>
              <p className="text-sm text-slate-500 max-w-md">
                Click on any activity in the sidebar to start editing. You can also add new activities using the
                "+ Add Activity" button under each learning path.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
