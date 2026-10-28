import React from 'react';
import { FileText, Archive } from 'lucide-react';

export function FileViewer({ content, fileName, fileType }) {
  if (!content) return null;

  // Check if media was pruned to preserve free tier quota
  if (typeof content === 'string' && content.startsWith('[Archived')) {
    return (
      <div className="mt-2 p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 text-xs text-slate-300 flex items-start gap-2.5 shadow-inner">
        <Archive className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <span className="font-bold text-amber-300 block mb-0.5">Media Archived (Free Tier Saver)</span>
          <p className="text-slate-400">{content}</p>
        </div>
      </div>
    );
  }

  // Check if it's an image
  if (fileType?.startsWith('image/') || (typeof content === 'string' && (content.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName || '')))) {
    return (
      <div className="mt-2">
        <img src={content} alt={`Submitted file: ${fileName}`} className="max-w-full max-h-64 rounded-lg border border-slate-600" />
      </div>
    );
  }

  // Check if it's a PDF
  if (fileType === 'application/pdf' || (fileName && /\.pdf$/i.test(fileName))) {
    return (
      <div className="mt-2">
        <a
          href={content}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold"
        >
          <FileText className="w-5 h-5" aria-hidden="true" /> Download / View PDF: {fileName}
        </a>
      </div>
    );
  }

  // Check if it's audio
  if (fileType?.startsWith('audio/') || (typeof content === 'string' && content.startsWith('data:audio/'))) {
    return (
      <div className="mt-2">
        <audio controls src={content} className="w-full" aria-label={`Audio file: ${fileName}`}>
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  // Check if it's video
  const isVideo = fileType?.startsWith('video/') ||
    (typeof content === 'string' && (content.startsWith('data:video/') || (content.includes('firebasestorage') && !fileType?.startsWith('image/')))) ||
    (fileName && /\.(webm|mp4|mov|mkv)$/i.test(fileName));

  if (isVideo) {
    return (
      <div className="mt-2">
        <video controls src={content} className="max-w-full max-h-64 rounded-lg bg-black" aria-label={`Video file: ${fileName}`}>
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // Default: download link for other file types
  return (
    <div className="mt-2">
      <a
        href={content}
        download={fileName}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white font-bold"
      >
        <FileText className="w-5 h-5" aria-hidden="true" /> Download: {fileName}
      </a>
    </div>
  );
}
