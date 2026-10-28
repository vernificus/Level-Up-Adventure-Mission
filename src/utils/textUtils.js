import React from 'react';

/**
 * Normalizes a single step to canonical object format:
 * { text: string, link: string, linkText: string, completed: boolean }
 * Backward compatible with plain strings and legacy step objects.
 */
export function normalizeStep(step) {
  if (!step) {
    return { text: '', link: '', linkText: '', completed: false };
  }
  if (typeof step === 'string') {
    return { text: step, link: '', linkText: '', completed: false };
  }
  return {
    ...step,
    text: String(step.text || ''),
    link: String(step.link || ''),
    linkText: String(step.linkText || ''),
    completed: Boolean(step.completed),
  };
}

/**
 * Normalizes an array of steps, filtering out empty entries.
 */
export function normalizeSteps(steps) {
  if (!steps || !Array.isArray(steps)) return [];
  return steps.map(normalizeStep).filter(s => s && (s.text || s.link));
}

/**
 * Renders basic markdown-style text formatting: **bold** and *italic* into React elements.
 * Uses React.createElement to ensure standard JS compatibility across bundlers.
 */
export function renderFormattedText(text) {
  if (!text || typeof text !== 'string') return text || null;
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(React.createElement('span', { key: key++ }, text.slice(lastIndex, match.index)));
    }
    if (match[2]) {
      parts.push(React.createElement('strong', { key: key++, className: 'font-bold text-white' }, match[2]));
    } else if (match[3]) {
      parts.push(React.createElement('em', { key: key++, className: 'italic text-slate-200' }, match[3]));
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(React.createElement('span', { key: key++ }, text.slice(lastIndex)));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Parses raw roster input (CSV or single-column name list) into structured student credentials.
 * Defaults password to '1234' if omitted.
 * @param {string} rawText
 * @returns {Array<{ name: string, pass: string }>}
 */
export function parseRosterLines(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const lines = rawText.split(/\r?\n/).filter(line => line.trim());
  const parsed = [];
  for (const line of lines) {
    const parts = line.split(',');
    const name = parts[0]?.trim();
    if (name) {
      const pass = (parts.length >= 2 && parts[1]?.trim()) ? parts[1].trim() : '1234';
      parsed.push({ name, pass });
    }
  }
  return parsed;
}
