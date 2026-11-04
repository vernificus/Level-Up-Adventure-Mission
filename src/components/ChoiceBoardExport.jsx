import React, { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Download, X, Loader2 } from 'lucide-react';
import { LEARNING_PATHS as DEFAULT_PATHS, PATH_COLORS } from '../data/gameData';
import { resolveClassLearningPaths } from '../utils/gameUtils';
import { realBackend as backend } from '../services/realBackend';
import { useTheme } from '../context/ThemeContext';

// Map Tailwind bg color classes to hex values for the export render
const COLOR_HEX = {
  'bg-blue-600': '#2563eb',
  'bg-purple-600': '#9333ea',
  'bg-orange-600': '#ea580c',
  'bg-green-600': '#16a34a',
  'bg-pink-600': '#db2777',
  'bg-teal-600': '#0d9488',
};

function getHexColor(tailwindClass) {
  return COLOR_HEX[tailwindClass] || '#4b5563';
}

export default function ChoiceBoardExport({ classId, className }) {
  const { isDark } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [paths, setPaths] = useState(null);
  const boardRef = useRef(null);

  const palette = isDark
    ? {
        canvasBg: '#0f172a',
        cardBg: '#1e293b',
        cardBorder: '#334155',
        itemBg: '#0f172a',
        titleText: '#f8fafc',
        subText: '#94a3b8',
        mutedText: '#64748b',
        xpText: '#fbbf24',
      }
    : {
        canvasBg: '#F6F7FB',
        cardBg: '#FFFFFF',
        cardBorder: '#E1E5F0',
        itemBg: '#F6F7FB',
        titleText: '#1B2340',
        subText: '#4A5270',
        mutedText: '#5D6687',
        xpText: '#A16207',
      };

  const loadPaths = useCallback(async () => {
    const classDoc = await backend.getClass(classId);
    if (!classDoc) return [];
    return resolveClassLearningPaths(classDoc, DEFAULT_PATHS);
  }, [classId]);

  const handleOpen = async () => {
    setShowPreview(true);
    const loaded = await loadPaths();
    setPaths(loaded);
  };

  const handleExport = async () => {
    if (!boardRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(boardRef.current, {
        backgroundColor: palette.canvasBg,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `${className || 'choice-board'}-choice-board.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export choice board. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!showPreview) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm transition-colors"
      >
        <Download className="w-4 h-4" /> Export Choice Board
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-start justify-center z-50 overflow-y-auto p-4 dark:bg-black/70">
      <div className="bg-slate-50 rounded-xl border border-slate-200 w-full max-w-6xl my-8 dark:bg-slate-900 dark:border-slate-700">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Export Choice Board</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={exporting || !paths}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'Saving...' : 'Download as PNG'}
            </button>
            <button
              onClick={() => { setShowPreview(false); setPaths(null); }}
              className="p-2 text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white"
              aria-label="Close export preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rendered board for capture */}
        <div className="p-4 overflow-auto">
          {!paths ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-green-800 animate-spin dark:text-green-400" />
            </div>
          ) : (
            <div
              ref={boardRef}
              style={{
                backgroundColor: palette.canvasBg,
                padding: '32px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <h1 style={{ color: palette.titleText, fontSize: '28px', fontWeight: 800, margin: 0 }}>
                  {className || 'Choice Board'}
                </h1>
                <p style={{ color: palette.subText, fontSize: '14px', marginTop: '4px' }}>
                  Choose one activity from each category to complete
                </p>
              </div>

              {/* Categories grid */}
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {paths.map((path, pathIdx) => (
                  <div
                    key={path.id}
                    style={{
                      flex: '1 1 280px',
                      minWidth: '280px',
                      backgroundColor: palette.cardBg,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: `1px solid ${palette.cardBorder}`,
                    }}
                  >
                    {/* Category header */}
                    <div
                      style={{
                        backgroundColor: getHexColor(path.color || PATH_COLORS[pathIdx % PATH_COLORS.length]),
                        padding: '14px 18px',
                      }}
                    >
                      <h2 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                        {path.title}
                      </h2>
                      {path.subtitle && (
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginTop: '2px' }}>
                          {path.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Activities list */}
                    <div style={{ padding: '12px' }}>
                      {path.options && path.options.length > 0 ? (
                        path.options.map((option) => (
                          <div
                            key={option.id}
                            style={{
                              backgroundColor: palette.itemBg,
                              borderRadius: '8px',
                              padding: '12px 14px',
                              marginBottom: '10px',
                              border: `1px solid ${palette.cardBorder}`,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <h3 style={{ color: palette.titleText, fontSize: '15px', fontWeight: 600, margin: 0 }}>
                                {option.title}
                              </h3>
                              <span
                                style={{
                                  color: palette.xpText,
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  marginLeft: '8px',
                                }}
                              >
                                {option.xp} XP
                              </span>
                            </div>
                            <p style={{ color: palette.subText, fontSize: '13px', margin: 0, lineHeight: '1.4' }}>
                              {option.desc}
                            </p>
                            {option.type && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  marginTop: '6px',
                                  fontSize: '11px',
                                  color: palette.mutedText,
                                  backgroundColor: palette.cardBg,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  border: `1px solid ${palette.cardBorder}`,
                                }}
                              >
                                {option.type}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p style={{ color: palette.mutedText, fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                          No activities yet
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
