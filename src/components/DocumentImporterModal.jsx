import React, { useState } from 'react';
import { parseDocumentToActivities } from '../utils/documentParser';
import { FileText, Upload, Sparkles, Check, X, AlertCircle, Layers, Plus } from 'lucide-react';

export default function DocumentImporterModal({ isOpen, onClose, onImportActivities, categoryNames = {} }) {
  const [inputText, setInputText] = useState('');
  const [parsedActivities, setParsedActivities] = useState([]);
  const [fileName, setFileName] = useState('');
  const [targetPathId, setTargetPathId] = useState('auto'); // 'auto' or specific pathId
  const [activeTab, setActiveTab] = useState('paste'); // 'paste' or 'file'

  if (!isOpen) return null;

  const handleParse = (text) => {
    setInputText(text);
    const results = parseDocumentToActivities(text);
    setParsedActivities(results);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      handleParse(content);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    if (parsedActivities.length === 0) return;

    // Apply target path if specific path chosen
    const finalActivities = parsedActivities.map(act => ({
      ...act,
      pathId: targetPathId === 'auto' ? (act.pathId || 'path1') : targetPathId
    }));

    onImportActivities(finalActivities);
    onClose();
  };

  const sampleTemplate = `Category: Building
1. Voice Battle
Type: High Tech
XP: 150 XP
Description: Record a 1-minute audio response explaining your science concept.
Steps:
1. Open the audio recorder.
2. State your name and chosen concept clearly.
3. Upload your audio file link.
Pro Tip: Speak clearly and use key terms.

Category: Strategy & Teamwork
2. Peer Interview
Type: Collaboration
XP: 120 XP
Description: Interview a classmate about their solution.
Steps:
1. Prepare 3 interview questions.
2. Record classmate answers.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="doc-import-title">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 my-auto shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Smart Document Importer</span>
              <h3 id="doc-import-title" className="text-xl font-bold text-white">Import Activities from Google Doc or Word</h3>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close document importer" className="text-slate-400 hover:text-white text-xl font-bold p-1">✕</button>
        </div>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Input Method Selector */}
          <div className="flex border-b border-slate-800 gap-4 text-sm">
            <button
              onClick={() => setActiveTab('paste')}
              className={`pb-3 font-bold border-b-2 transition-colors ${activeTab === 'paste' ? 'text-blue-400 border-blue-400' : 'text-slate-400 hover:text-white border-transparent'}`}
            >
              📋 Paste Text from Google Doc / Word
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`pb-3 font-bold border-b-2 transition-colors ${activeTab === 'file' ? 'text-blue-400 border-blue-400' : 'text-slate-400 hover:text-white border-transparent'}`}
            >
              📁 Upload Document File (.txt, .docx, .md)
            </button>
          </div>

          {activeTab === 'paste' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-400">Paste your curriculum or choice board text below:</label>
                <button
                  type="button"
                  onClick={() => handleParse(sampleTemplate)}
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Load Sample Text
                </button>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => handleParse(e.target.value)}
                placeholder="Paste text from Google Docs or Word here... (e.g. 1. Activity Name, Description, Steps: 1. Do X 2. Do Y)"
                rows={6}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl bg-slate-950/50 text-center transition-colors">
              <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-white mb-1">Upload a Document File</p>
              <p className="text-xs text-slate-400 mb-4">Supports plain text, markdown, and Word document exports (.txt, .md, .docx)</p>
              <input
                type="file"
                accept=".txt,.md,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="doc-file-upload"
              />
              <label
                htmlFor="doc-file-upload"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Browse File
              </label>
              {fileName && <p className="text-xs text-green-400 font-bold mt-3">Selected: {fileName}</p>}
            </div>
          )}

          {/* Target Path Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-yellow-400" />
              <label className="text-xs font-bold text-slate-300">Target Category Path:</label>
            </div>
            <select
              value={targetPathId}
              onChange={(e) => setTargetPathId(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-semibold focus:border-blue-500 outline-none"
            >
              <option value="auto">⚡ Auto-Detect Category from Text</option>
              <option value="path1">{categoryNames.path1 || 'Path #1 (Building / Reading)'}</option>
              <option value="path2">{categoryNames.path2 || 'Path #2 (Strategy / Math)'}</option>
              <option value="path3">{categoryNames.path3 || 'Path #3 (Coding / Science)'}</option>
              <option value="path4">{categoryNames.path4 || 'Path #4 (Driving / Social Studies)'}</option>
              {categoryNames.path5 && <option value="path5">{categoryNames.path5}</option>}
              {categoryNames.path6 && <option value="path6">{categoryNames.path6}</option>}
            </select>
          </div>

          {/* Parsed Activities Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Parsed Activities Preview ({parsedActivities.length})
              </h4>
              {parsedActivities.length > 0 && (
                <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  Ready to Import
                </span>
              )}
            </div>

            {parsedActivities.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-500 text-xs">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No activities detected yet. Paste text or upload a file above to preview parsed activities.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {parsedActivities.map((act, idx) => (
                  <div key={idx} className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <input
                        type="text"
                        value={act.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParsedActivities(prev => prev.map((a, i) => i === idx ? { ...a, title: val } : a));
                        }}
                        className="font-bold text-white text-sm bg-slate-900 px-2 py-1 rounded border border-slate-700 w-full outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => setParsedActivities(prev => prev.filter((_, i) => i !== idx))}
                        className="text-xs text-red-400 hover:text-red-300 p-1"
                        title="Remove activity"
                      >
                        ✕
                      </button>
                    </div>

                    <textarea
                      value={act.desc}
                      onChange={(e) => {
                        const val = e.target.value;
                        setParsedActivities(prev => prev.map((a, i) => i === idx ? { ...a, desc: val } : a));
                      }}
                      placeholder="Description..."
                      rows={2}
                      className="w-full bg-slate-900 px-2 py-1 rounded border border-slate-700 text-slate-300 text-xs outline-none focus:border-blue-500"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-semibold border border-blue-800">
                        {act.type} &middot; {act.xp} XP
                      </span>
                      <span>{act.steps?.length || 0} Steps</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={parsedActivities.length === 0}
            className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            Import {parsedActivities.length} Activities into Choice Board
          </button>
        </div>
      </div>
    </div>
  );
}
