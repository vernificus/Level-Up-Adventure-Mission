import React, { useState, useEffect } from 'react';
import { realBackend as backend } from '../services/realBackend';
import { LEARNING_PATHS as DEFAULT_PATHS } from '../data/gameData';
import { Save, Plus, Trash2, BookOpen, Download, Search, X } from 'lucide-react';

export default function ActivityEditor({ classId, onSave, onCancel }) {
  const [learningPaths, setLearningPaths] = useState(DEFAULT_PATHS);
  const [libraryActivities, setLibraryActivities] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load existing custom activities for this class if any
    const loadData = async () => {
      setLoading(true);
      const customPaths = await backend.getClassActivities(classId);
      if (customPaths) {
        setLearningPaths(customPaths);
      }
      setLoading(false);
    };
    loadData();
  }, [classId]);

  const loadLibrary = async () => {
    setLoading(true);
    const activities = await backend.getPublicActivities();
    setLibraryActivities(activities);
    setShowLibrary(true);
    setLoading(false);
  };

  const handleUpdateActivity = (pathId, activityId, field, value) => {
    setLearningPaths(prev => prev.map(path => {
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
    setLearningPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const newId = `${pathId}-${Date.now()}`;
      return {
        ...path,
        options: [...path.options, {
          id: newId,
          title: 'New Activity',
          desc: 'Description here',
          type: 'Low Tech', // Default
          xp: 100,
          steps: ['Step 1'],
          proTip: 'Tip here'
        }]
      };
    }));
  };

  const handleDeleteActivity = (pathId, activityId) => {
    if (!window.confirm('Delete this activity?')) return;
    setLearningPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      return {
        ...path,
        options: path.options.filter(opt => opt.id !== activityId)
      };
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await backend.saveClassActivities(classId, learningPaths);
      alert('Activities saved successfully!');
      if (onSave) onSave();
    } catch (error) {
      alert('Error saving activities: ' + error.message);
    }
    setLoading(false);
  };

  const handleImport = (activity, targetPathId) => {
    setLearningPaths(prev => prev.map(path => {
      if (path.id !== targetPathId) return path;
      // Generate unique ID to allow multiple imports
      const newActivity = { ...activity, id: `${targetPathId}-${Date.now()}` };
      // Remove backend-specific fields like 'publishedAt' if present
      delete newActivity.publishedAt;
      return {
        ...path,
        options: [...path.options, newActivity]
      };
    }));
    setShowLibrary(false);
  };

  const handlePublish = async (activity) => {
    if (!window.confirm(`Publish "${activity.title}" to the public library?`)) return;
    try {
      await backend.publishActivity(activity);
      alert('Activity published!');
    } catch (error) {
      alert('Error publishing: ' + error.message);
    }
  };

  if (showLibrary) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
        <div className="bg-slate-800 border-2 border-blue-500 rounded-2xl w-full max-w-4xl p-6 h-[80vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-400" /> Activity Library
            </h3>
            <button onClick={() => setShowLibrary(false)}><X className="w-6 h-6 text-slate-400 hover:text-white" /></button>
          </div>

          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 rounded-lg text-white border border-slate-600 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {libraryActivities
              .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(activity => (
              <div key={activity.id} className="bg-slate-700 p-4 rounded-xl border border-slate-600">
                <h4 className="font-bold text-white">{activity.title}</h4>
                <p className="text-sm text-slate-400 mb-2">{activity.desc}</p>
                <div className="flex gap-2 mt-2">
                  {learningPaths.map(path => (
                    <button
                      key={path.id}
                      onClick={() => handleImport(activity, path.id)}
                      className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-white"
                    >
                      Import to {path.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 sticky top-0 z-10 shadow-xl">
        <h2 className="text-xl font-bold text-white">Edit Choice Board</h2>
        <div className="flex gap-2">
          <button
            onClick={loadLibrary}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
          >
            <BookOpen className="w-4 h-4" /> Browse Library
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors"
          >
            <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {learningPaths.map(path => (
          <div key={path.id} className="flex flex-col gap-4">
            <div className={`p-4 rounded-t-xl ${path.color}`}>
              <h3 className="font-black uppercase italic text-white">{path.title}</h3>
            </div>
            <div className="bg-slate-800 p-4 rounded-b-xl border border-slate-700 flex flex-col gap-4">
              {path.options.map(activity => (
                <div key={activity.id} className="p-4 bg-slate-700 rounded-lg border border-slate-600 relative group">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handlePublish(activity)} title="Publish to Library" className="p-1 hover:text-blue-400"><BookOpen className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteActivity(path.id, activity.id)} title="Delete" className="p-1 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>

                  <input
                    className="bg-transparent font-bold text-white w-full mb-1 border-b border-transparent focus:border-blue-500 outline-none"
                    value={activity.title}
                    onChange={(e) => handleUpdateActivity(path.id, activity.id, 'title', e.target.value)}
                  />
                  <textarea
                    className="bg-transparent text-sm text-slate-300 w-full resize-none border-b border-transparent focus:border-blue-500 outline-none"
                    value={activity.desc}
                    onChange={(e) => handleUpdateActivity(path.id, activity.id, 'desc', e.target.value)}
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-2 mt-2 mb-2">
                    <div className="flex gap-1">
                      <span className="text-xs text-slate-500 pt-1">XP:</span>
                      <input
                        className="bg-slate-800 text-xs text-yellow-400 w-16 px-1 rounded"
                        type="number"
                        value={activity.xp}
                        onChange={(e) => handleUpdateActivity(path.id, activity.id, 'xp', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <select
                        className="bg-slate-800 text-xs text-slate-300 w-full px-1 rounded border-none"
                        value={activity.type}
                        onChange={(e) => handleUpdateActivity(path.id, activity.id, 'type', e.target.value)}
                      >
                        <option value="Low Tech">Low Tech</option>
                        <option value="High Tech">High Tech</option>
                        <option value="Collaboration">Collaboration</option>
                        <option value="Reflection">Reflection</option>
                        <option value="Creation">Creation</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-2">
                    <span className="text-xs text-slate-500 font-bold block mb-1">Steps:</span>
                    {activity.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-1 mb-1">
                         <span className="text-xs text-slate-500 w-4">{idx+1}.</span>
                         <input
                           className="bg-slate-800 text-xs text-white flex-1 px-1 rounded"
                           value={step}
                           onChange={(e) => {
                             const newSteps = [...activity.steps];
                             newSteps[idx] = e.target.value;
                             handleUpdateActivity(path.id, activity.id, 'steps', newSteps);
                           }}
                         />
                         <button
                           onClick={() => {
                              const newSteps = activity.steps.filter((_, i) => i !== idx);
                              handleUpdateActivity(path.id, activity.id, 'steps', newSteps);
                           }}
                           className="text-red-400 text-xs hover:text-white"
                         >
                           X
                         </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleUpdateActivity(path.id, activity.id, 'steps', [...activity.steps, 'New step'])}
                      className="text-xs text-blue-400 hover:text-white mt-1"
                    >
                      + Add Step
                    </button>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 font-bold block mb-1">Pro Tip:</span>
                    <input
                      className="bg-slate-800 text-xs text-blue-300 w-full px-1 rounded"
                      value={activity.proTip || ''}
                      onChange={(e) => handleUpdateActivity(path.id, activity.id, 'proTip', e.target.value)}
                      placeholder="Tip for students..."
                    />
                  </div>

                </div>
              ))}
              <button
                onClick={() => handleAddActivity(path.id)}
                className="w-full py-3 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Activity
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
