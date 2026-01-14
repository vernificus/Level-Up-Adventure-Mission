import React from 'react';
import { FileText } from 'lucide-react';

export function FileViewer({ content, fileName, fileType }) {
  if (!content) return null;

  // Check if it's an image
  if (fileType?.startsWith('image/')) {
    return (
      <div className="mt-2">
        <img src={content} alt={fileName} className="max-w-full max-h-64 rounded-lg border border-slate-600" />
      </div>
    );
  }

  // Check if it's a PDF
  if (fileType === 'application/pdf') {
    return (
      <div className="mt-2">
        <a
          href={content}
          download={fileName}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold"
        >
          <FileText className="w-5 h-5" /> Download PDF: {fileName}
        </a>
      </div>
    );
  }

  // Check if it's audio
  if (fileType?.startsWith('audio/')) {
    return (
      <div className="mt-2">
        <audio controls src={content} className="w-full">
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  // Check if it's video
  if (fileType?.startsWith('video/')) {
    return (
      <div className="mt-2">
        <video controls src={content} className="max-w-full max-h-64 rounded-lg">
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
        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white font-bold"
      >
        <FileText className="w-5 h-5" /> Download: {fileName}
      </a>
    </div>
  );
}
