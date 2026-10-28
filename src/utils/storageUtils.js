/**
 * Storage & Cost-Zero Free Tier Utilities
 *
 * Ensures all media submissions (Chromebook video recordings, camera photos, file uploads)
 * stay within Firebase's 100% Free Tier (5 GB Cloud Storage, 1 GB/day bandwidth, 1 MiB Firestore limit)
 * without ever generating billing costs for schools.
 */

export const FREE_TIER_STORAGE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
export const FREE_TIER_DAILY_EGRESS_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB / day
export const DEFAULT_PRUNE_AGE_DAYS = 60; // 60 days retention for raw media
export const TARGET_VIDEO_BITRATE = 600000; // 600 kbps video (480p STEM student demos)
export const TARGET_AUDIO_BITRATE = 64000; // 64 kbps audio (crystal clear student voice)
export const MAX_VIDEO_DURATION_SECONDS = 45; // 45 seconds max recording
export const MAX_MANUAL_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB manual upload cap

/**
 * Calculates estimated maximum file size for a video recording.
 */
export function calculateMaxVideoBytes(
  durationSec = MAX_VIDEO_DURATION_SECONDS,
  videoBitrate = TARGET_VIDEO_BITRATE,
  audioBitrate = TARGET_AUDIO_BITRATE
) {
  const totalBitrate = Number(videoBitrate) + Number(audioBitrate);
  return Math.round((totalBitrate / 8) * durationSec);
}

/**
 * Generates an isolated, safe Cloud Storage path for a student submission.
 */
export function generateStoragePath(classId, studentId, fileName = 'video.webm', timestamp = Date.now()) {
  const safeClassId = String(classId || 'default-class').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeStudentId = String(studentId || 'anon-student').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const rawName = String(fileName || 'media').trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
  const safeFileName = rawName.length > 60 ? rawName.slice(-60) : rawName;
  return `submissions/${safeClassId}/${safeStudentId}/${timestamp}_${safeFileName}`;
}

/**
 * Checks if content is a heavy inline media payload (data URL or base64)
 */
export function isMediaPayload(content) {
  if (typeof content !== 'string') return false;
  return content.startsWith('data:video/') ||
    content.startsWith('data:image/') ||
    content.startsWith('data:application/') ||
    content.startsWith('data:audio/');
}

/**
 * Determines if an approved submission is eligible for media pruning
 * to maintain the $0 storage tier.
 */
export function shouldPruneSubmission(submission, cutoffMs = null) {
  if (!submission || typeof submission !== 'object') return false;
  if (submission.mediaPruned) return false;
  if (submission.status !== 'approved') return false;

  const cutoff = cutoffMs !== null
    ? cutoffMs
    : Date.now() - (DEFAULT_PRUNE_AGE_DAYS * 24 * 60 * 60 * 1000);

  const subDate = new Date(submission.reviewedAt || submission.submittedAt || 0).getTime();
  if (isNaN(subDate) || subDate > cutoff) return false;

  // Has media to prune: storagePath, large data URL, or is a video/file submission
  const hasStorage = Boolean(submission.storagePath);
  const hasDataUrl = isMediaPayload(submission.submissionContent) || isMediaPayload(submission.fileData);
  const isVideoOrFile = submission.submissionType === 'video' ||
    submission.submissionType === 'file' ||
    submission.submissionType === 'camera';

  return hasStorage || hasDataUrl || isVideoOrFile;
}

/**
 * Pure transform: returns an archived clone of the submission with heavy media
 * pruned while preserving 100% of student XP, coins, badges, and teacher feedback.
 */
export function pruneSubmissionRecord(submission, pruneTimestamp = new Date().toISOString()) {
  if (!submission) return submission;
  return {
    ...submission,
    submissionContent: '[Archived: Media pruned to maintain free tier quota. Student XP, coins, and grades remain intact.]',
    mediaPruned: true,
    prunedAt: pruneTimestamp,
    storagePath: null,
    fileData: null
  };
}

/**
 * Calculates aggregate storage metrics and estimated usage against Firebase free tier.
 */
export function calculateClassStorageUsage(submissions = [], pruneCutoffMs = null) {
  const cutoff = pruneCutoffMs !== null
    ? pruneCutoffMs
    : Date.now() - (DEFAULT_PRUNE_AGE_DAYS * 24 * 60 * 60 * 1000);

  let totalSubmissions = 0;
  let videoCount = 0;
  let photoCount = 0;
  let otherFileCount = 0;
  let prunedCount = 0;
  let cloudStoredCount = 0;
  let eligibleForPruningCount = 0;
  let estimatedBytes = 0;
  let reclaimableBytes = 0;

  for (const s of submissions) {
    if (!s) continue;
    totalSubmissions++;

    if (s.mediaPruned) {
      prunedCount++;
      continue;
    }

    let itemBytes = 0;
    const isVideo = s.submissionType === 'video' || s.fileType?.startsWith('video/') || (s.fileName && /\.(webm|mp4|mov)$/i.test(s.fileName));
    const isPhoto = s.submissionType === 'camera' || s.fileType?.startsWith('image/') || (s.fileName && /\.(jpg|jpeg|png|webp)$/i.test(s.fileName));
    const isOtherFile = s.submissionType === 'file';

    if (isVideo) {
      videoCount++;
      itemBytes = 2.5 * 1024 * 1024; // ~2.5 MB average for 45s @ 600 kbps
    } else if (isPhoto) {
      photoCount++;
      itemBytes = 250 * 1024; // ~250 KB compressed photo
    } else if (isOtherFile) {
      otherFileCount++;
      itemBytes = 500 * 1024; // ~500 KB average file
    }

    if (s.storagePath || s.mediaStoredInCloud) {
      cloudStoredCount++;
    }

    estimatedBytes += itemBytes;

    if (shouldPruneSubmission(s, cutoff)) {
      eligibleForPruningCount++;
      reclaimableBytes += itemBytes;
    }
  }

  const usagePercent = Math.min(100, (estimatedBytes / FREE_TIER_STORAGE_BYTES) * 100);
  const remainingBytes = Math.max(0, FREE_TIER_STORAGE_BYTES - estimatedBytes);

  return {
    totalSubmissions,
    videoCount,
    photoCount,
    otherFileCount,
    prunedCount,
    cloudStoredCount,
    eligibleForPruningCount,
    estimatedBytes,
    estimatedMb: (estimatedBytes / (1024 * 1024)).toFixed(1),
    reclaimableMb: (reclaimableBytes / (1024 * 1024)).toFixed(1),
    usagePercent: Number(usagePercent.toFixed(1)),
    freeTierRemainingMb: (remainingBytes / (1024 * 1024)).toFixed(0),
    freeTierCapMb: 5120
  };
}
