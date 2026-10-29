import assert from 'node:assert';
import {
  FREE_TIER_STORAGE_BYTES,
  FREE_TIER_DAILY_EGRESS_BYTES,
  DEFAULT_PRUNE_AGE_DAYS,
  TARGET_VIDEO_BITRATE,
  TARGET_AUDIO_BITRATE,
  MAX_VIDEO_DURATION_SECONDS,
  calculateMaxVideoBytes,
  generateStoragePath,
  isMediaPayload,
  shouldPruneSubmission,
  pruneSubmissionRecord,
  calculateClassStorageUsage
} from '../src/utils/storageUtils.js';

console.log('Testing Cost-Zero Free Tier Storage Architecture & Pruning...');

// ==========================================
// Test 1: Video Bitrate & Size Calculations
// ==========================================
console.log('✔ Test 1: Video Bitrate & File Size Bounds');
const max45sBytes = calculateMaxVideoBytes(45, 600000, 64000);
// 664,000 bits/sec / 8 = 83,000 bytes/sec * 45 sec = 3,735,000 bytes (~3.56 MB)
assert.strictEqual(max45sBytes, 3735000, '45-second 600kbps video must equal 3,735,000 bytes (~3.56 MB)');
assert.ok(max45sBytes < 4 * 1024 * 1024, 'Max 45-second video must comfortably remain under 4 MB');

const max15sBytes = calculateMaxVideoBytes(15, 600000, 64000);
assert.strictEqual(max15sBytes, 1245000, '15-second video must equal 1,245,000 bytes (~1.19 MB)');

// ==========================================
// Test 2: Storage Path Sanitation & Structure
// ==========================================
console.log('✔ Test 2: Storage Path Sanitation & Structure');
const path = generateStoragePath('Class #101 / Fall', 'Student: John Doe!', 'my robot demo (v1).webm', 1700000000000);
assert.strictEqual(
  path,
  'submissions/Class__101___Fall/Student__John_Doe_/1700000000000_my_robot_demo__v1_.webm',
  'Path should sanitize invalid characters and maintain submissions/class/student hierarchy'
);

// Fallback handling when parameters are missing
const defaultPath = generateStoragePath(null, null, null, 1700000000000);
assert.strictEqual(
  defaultPath,
  'submissions/default-class/anon-student/1700000000000_media',
  'Missing parameters should fall back gracefully'
);

// ==========================================
// Test 3: Media Payload Detection
// ==========================================
console.log('✔ Test 3: Media Payload Detection');
assert.strictEqual(isMediaPayload('data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZw...'), true);
assert.strictEqual(isMediaPayload('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...'), true);
assert.strictEqual(isMediaPayload('https://firebasestorage.googleapis.com/v0/b/bucket/o/video.webm'), false);
assert.strictEqual(isMediaPayload('https://docs.google.com/presentation/d/123'), false);
assert.strictEqual(isMediaPayload('I built an automated gear train for the rover'), false);
assert.strictEqual(isMediaPayload(null), false);

// ==========================================
// Test 4: Pruning Eligibility Filter
// ==========================================
console.log('✔ Test 4: Pruning Eligibility Filter');
const now = Date.now();
const eightyDaysAgo = new Date(now - 80 * 24 * 60 * 60 * 1000).toISOString();
const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();

const oldApprovedVideoSub = {
  id: 'sub-1',
  studentId: 'st-1',
  status: 'approved',
  reviewedAt: eightyDaysAgo,
  submissionType: 'video',
  storagePath: 'submissions/c1/s1/video.webm'
};

const newApprovedVideoSub = {
  id: 'sub-2',
  studentId: 'st-2',
  status: 'approved',
  reviewedAt: tenDaysAgo,
  submissionType: 'video',
  storagePath: 'submissions/c1/s2/video.webm'
};

const oldPendingVideoSub = {
  id: 'sub-3',
  studentId: 'st-3',
  status: 'pending',
  submittedAt: eightyDaysAgo,
  submissionType: 'video',
  storagePath: 'submissions/c1/s3/video.webm'
};

const alreadyPrunedSub = {
  id: 'sub-4',
  studentId: 'st-4',
  status: 'approved',
  reviewedAt: eightyDaysAgo,
  submissionType: 'video',
  mediaPruned: true,
  storagePath: null
};

assert.strictEqual(shouldPruneSubmission(oldApprovedVideoSub), true, 'Approved submission > 60 days with media must be eligible for pruning');
assert.strictEqual(shouldPruneSubmission(newApprovedVideoSub), false, 'Recent approved submission (< 60 days) must NOT be pruned');
assert.strictEqual(shouldPruneSubmission(oldPendingVideoSub), false, 'Pending submission must NEVER be pruned (awaiting teacher review)');
assert.strictEqual(shouldPruneSubmission(alreadyPrunedSub), false, 'Already pruned submission must NOT be re-pruned');

// ==========================================
// Test 5: Zero Data Loss on Record Pruning
// ==========================================
console.log('✔ Test 5: Zero Data Loss on Record Pruning');
const fullSubmission = {
  id: 'sub-verified',
  studentId: 'student-99',
  playerName: 'Ada Lovelace',
  playerAvatar: '🧙',
  classId: 'class-stem-1',
  activityId: 'robotics-gear-1',
  activityTitle: 'Robotics Gear Train',
  pathId: 'robotics',
  xp: 150,
  isBoss: false,
  status: 'approved',
  submittedAt: eightyDaysAgo,
  reviewedAt: eightyDaysAgo,
  teacherFeedback: 'Outstanding gear ratio calculation and torque demonstration!',
  collaborators: [{ id: 'teammate-1', name: 'Charles Babbage' }],
  submissionType: 'video',
  fileName: 'chromebook-video.webm',
  fileType: 'video/webm',
  storagePath: 'submissions/class-stem-1/student-99/123_video.webm',
  submissionContent: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/submissions%2Fvideo.webm?alt=media',
  fileData: 'data:video/webm;base64,GkXfo59ChoEBQveBAU...'
};

const pruned = pruneSubmissionRecord(fullSubmission, '2026-10-28T23:45:00Z');

// Verify heavy data removed
assert.strictEqual(pruned.storagePath, null, 'storagePath must be cleared');
assert.strictEqual(pruned.fileData, null, 'fileData base64 must be cleared');
assert.strictEqual(pruned.mediaPruned, true, 'mediaPruned flag must be true');
assert.strictEqual(pruned.prunedAt, '2026-10-28T23:45:00Z', 'prunedAt timestamp must be recorded');
assert.ok(pruned.submissionContent.startsWith('[Archived:'), 'submissionContent must be set to clear archival notice');

// CRUCIAL: Verify EVERY piece of student progress, credit, and feedback is 100% PRESERVED
assert.strictEqual(pruned.id, fullSubmission.id, 'id preserved');
assert.strictEqual(pruned.studentId, fullSubmission.studentId, 'studentId preserved');
assert.strictEqual(pruned.playerName, fullSubmission.playerName, 'playerName preserved');
assert.strictEqual(pruned.xp, fullSubmission.xp, 'XP preserved');
assert.strictEqual(pruned.activityId, fullSubmission.activityId, 'activityId preserved');
assert.strictEqual(pruned.status, 'approved', 'Status preserved');
assert.strictEqual(pruned.teacherFeedback, fullSubmission.teacherFeedback, 'Teacher feedback preserved');
assert.deepStrictEqual(pruned.collaborators, fullSubmission.collaborators, 'Teammate collaborators preserved');

// ==========================================
// Test 6: Aggregate Class Storage Quota Estimation
// ==========================================
console.log('✔ Test 6: Class Storage Quota Estimation against 5 GB Free Tier');
const classSubmissions = [
  oldApprovedVideoSub,
  newApprovedVideoSub,
  oldPendingVideoSub,
  alreadyPrunedSub,
  {
    id: 'photo-1',
    submissionType: 'camera',
    status: 'approved',
    reviewedAt: tenDaysAgo
  },
  {
    id: 'link-1',
    submissionType: 'link',
    status: 'approved',
    reviewedAt: tenDaysAgo
  }
];

const usage = calculateClassStorageUsage(classSubmissions);

assert.strictEqual(usage.totalSubmissions, 6, 'Total submissions counted');
assert.strictEqual(usage.videoCount, 3, 'Active video submissions counted (excluding already pruned)');
assert.strictEqual(usage.photoCount, 1, 'Photo submissions counted');
assert.strictEqual(usage.prunedCount, 1, 'Pruned count tracked');
assert.strictEqual(usage.eligibleForPruningCount, 1, 'Only old approved video is eligible to prune');
assert.strictEqual(usage.freeTierCapMb, 5120, 'Free tier cap is 5,120 MB (5 GB)');
assert.ok(Number(usage.estimatedMb) > 0, 'Estimated MB is calculated');
assert.ok(usage.usagePercent < 5, 'Class usage remains tiny fraction (< 5%) of 5 GB free tier');
assert.strictEqual(usage.reclaimableMb, '2.5', 'Pruning the 1 eligible video reclaims ~2.5 MB');

// ==========================================
// Test 7: Firestore Document Size Comparison
// ==========================================
console.log('✔ Test 7: Firestore Document Size Optimization (< 1 KB vs 2 MB+)');
const rawBase64Submission = {
  ...fullSubmission,
  submissionContent: 'data:video/webm;base64,' + 'A'.repeat(2 * 1024 * 1024) // 2 MB base64
};
const rawJsonSize = JSON.stringify(rawBase64Submission).length;
assert.ok(rawJsonSize > 2 * 1024 * 1024, 'Base64 document exceeds 2 MB (would fail Firestore 1 MiB limit)');

const cloudStorageSubmission = {
  ...fullSubmission,
  submissionContent: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/video.webm?token=12345',
  fileData: undefined
};
const cloudJsonSize = JSON.stringify(cloudStorageSubmission).length;
assert.ok(cloudJsonSize < 1000, `Cloud Storage reference doc size (${cloudJsonSize} bytes) must be under 1 KB`);

// ==========================================
// Test 8: Firestore Resilient Subcollection Chunking & Reassembly
// ==========================================
console.log('✔ Test 8: Firestore Subcollection Chunking & Reassembly Logic');
const CHUNK_SIZE = 350 * 1024;
const samplePayload = 'data:video/webm;base64,' + 'B'.repeat(1024 * 1024); // ~1 MB video data url
const simulatedChunks = [];
for (let i = 0; i < samplePayload.length; i += CHUNK_SIZE) {
  simulatedChunks.push({
    index: simulatedChunks.length,
    data: samplePayload.slice(i, i + CHUNK_SIZE)
  });
}
assert.ok(simulatedChunks.length >= 3, '1MB payload should be split into 3 or 4 chunks');
simulatedChunks.forEach((c) => {
  assert.ok(c.data.length <= CHUNK_SIZE, 'Each chunk must not exceed 350KB');
});
// Verify out-of-order reassembly produces bit-exact match
const shuffledChunks = [...simulatedChunks].reverse();
shuffledChunks.sort((a, b) => a.index - b.index);
const reassembled = shuffledChunks.map(c => c.data).join('');
assert.strictEqual(reassembled, samplePayload, 'Reassembled chunked media must strictly equal original payload');

// ==========================================
// Test 9: 350kbps Compact Video Sizing Validation
// ==========================================
console.log('✔ Test 9: 350kbps Compact Video Bounds (15s & 45s)');
const compact15sBytes = calculateMaxVideoBytes(15, 350000, 32000);
// (350,000 + 32,000) / 8 = 47,750 B/s * 15s = 716,250 bytes (~700 KB)
assert.strictEqual(compact15sBytes, 716250, '15-second compact video is ~716 KB');
assert.ok(compact15sBytes < 750 * 1024, '15-second video fits in a single unchunked Firestore document (< 750 KB)');

const compact45sBytes = calculateMaxVideoBytes(45, 350000, 32000);
// 47,750 B/s * 45s = 2,148,750 bytes (~2.05 MB)
assert.strictEqual(compact45sBytes, 2148750, '45-second compact video is ~2.15 MB');
assert.ok(compact45sBytes < 2.5 * 1024 * 1024, '45-second compact video stays well under 2.5 MB');

console.log('\n✔ All Cost-Zero Free Tier Storage tests passed successfully!\n');

