import React, { useState, useEffect } from 'react';
import { FileText, Archive, Loader2 } from 'lucide-react';
import { realBackend as backend } from '../services/realBackend';

export function FileViewer({ content, fileName, fileType, submissionId, isChunked }) {
  const [chunkedData, setChunkedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if ((content === '[CHUNKED_MEDIA]' || isChunked) && submissionId && !chunkedData) {
      setIsLoading(true);
      setLoadError(null);
      backend.loadChunkedMedia(submissionId)
        .then((assembled) => {
          if (!isMounted) return;
          if (assembled) {
            setChunkedData(assembled);
          } else {
            setLoadError('Failed to load video media from cloud storage.');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setLoadError(err?.message || 'Error loading chunked media.');
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [content, isChunked, submissionId, chunkedData]);

  if (isLoading) {
    return (
      <div className="mt-2 p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2.5 shadow-inner">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" aria-hidden="true" />
        <span>Loading full video ({fileName || 'video'})...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mt-2 p-3 rounded-xl bg-slate-900/90 border border-red-500/30 text-xs text-red-300">
        <p>{loadError}</p>
      </div>
    );
  }

  const activeContent = chunkedData || (content !== '[CHUNKED_MEDIA]' ? content : null);

  if (!activeContent) return null;

  // Check if media was pruned to preserve free tier quota
  if (typeof activeContent === 'string' && activeContent.startsWith('[Archived')) {
    return (
      <div className="mt-2 p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 text-xs text-slate-300 flex items-start gap-2.5 shadow-inner">
        <Archive className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <span className="font-bold text-amber-300 block mb-0.5">Media Archived (Free Tier Saver)</span>
          <p className="text-slate-400">{activeContent}</p>
        </div>
      </div>
    );
  }

  // Check if it's an image
  if (fileType?.startsWith('image/') || (typeof activeContent === 'string' && (activeContent.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName || '')))) {
    return (
      <div className="mt-2">
        <img src={activeContent} alt={`Submitted file: ${fileName}`} className="max-w-full max-h-64 rounded-lg border border-slate-600" />
      </div>
    );
  }

  // Check if it's a PDF
  if (fileType === 'application/pdf' || (fileName && /\.pdf$/i.test(fileName))) {
    return (
      <div className="mt-2">
        <a
          href={activeContent}
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
  if (fileType?.startsWith('audio/') || (typeof activeContent === 'string' && activeContent.startsWith('data:audio/'))) {
    return (
      <div className="mt-2">
        <audio controls src={activeContent} className="w-full" aria-label={`Audio file: ${fileName}`}>
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  // Check if it's video
  const isVideo = fileType?.startsWith('video/') ||
    (typeof activeContent === 'string' && (activeContent.startsWith('data:video/') || (activeContent.includes('firebasestorage') && !fileType?.startsWith('image/')))) ||
    (fileName && /\.(webm|mp4|mov|mkv)$/i.test(fileName));

  if (isVideo) {
    return (
      <div className="mt-2">
        <video controls src={activeContent} className="max-w-full max-h-64 rounded-lg bg-black" aria-label={`Video file: ${fileName}`}>
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // Default: download link for other file types
  return (
    <div className="mt-2">
      <a
        href={activeContent}
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

