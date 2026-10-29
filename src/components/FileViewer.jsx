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

  // Clean legacy codecs from data URLs (e.g., data:video/webm;codecs=vp8,opus;base64,... -> data:video/webm;base64,...)
  const cleanContent = typeof activeContent === 'string' && activeContent.startsWith('data:video/')
    ? activeContent.replace(/^data:video\/([^;]+);codecs=[^;]+;base64,/, 'data:video/$1;base64,')
    : activeContent;

  const [videoPlaybackError, setVideoPlaybackError] = useState(false);

  // Check if it's video
  const isVideo = fileType?.startsWith('video/') ||
    (typeof cleanContent === 'string' && (cleanContent.startsWith('data:video/') || (cleanContent.includes('firebasestorage') && !fileType?.startsWith('image/')))) ||
    (fileName && /\.(webm|mp4|mov|mkv)$/i.test(fileName));

  if (isVideo) {
    return (
      <div className="mt-2 space-y-2">
        <video
          controls
          src={cleanContent}
          onError={() => setVideoPlaybackError(true)}
          className="max-w-full max-h-64 rounded-lg bg-black"
          aria-label={`Video file: ${fileName}`}
        >
          Your browser does not support video playback.
        </video>
        {videoPlaybackError && (
          <div className="p-2.5 bg-amber-950/70 border border-amber-600/50 rounded-lg text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
            <span>Video codec or stream requires direct download.</span>
            <a
              href={cleanContent}
              download={fileName || 'video.webm'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold shrink-0 inline-flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> Download / Open Video
            </a>
          </div>
        )}
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

