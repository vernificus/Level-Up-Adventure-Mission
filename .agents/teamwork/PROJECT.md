# Project: Level Up Adventure Mission

## Architecture
- **Frontend Stack**: React 18, Vite 6, Tailwind CSS 3, Lucide React icons, Canvas 3D renderer (`Avatar3D.jsx`).
- **Backend & Persistence**: Firebase 12 (Authentication, Cloud Firestore, Firebase Hosting), security rules in `firestore.rules`.
- **State Management & Routing**:
  - `AuthContext.jsx`: Session state, teacher/admin authentication, student session storage.
  - `useGameState.js`: Student gameplay loop, XP progression, weekly resets, quest/boss synchronization.
  - `App.jsx`: View router switching between Admin Portal, Teacher Portal, and Student View with top emulation banner.
  - `realBackend.js`: Firestore database API abstraction layer.
- **Shared Utilities**:
  - `src/utils/textUtils.js`: Markdown formatting, step normalization, roster line parsing.
  - `src/utils/gameUtils.js`: Category ordering, learning path resolution, level calculations, Monday 7am reset calculations, pure state transition functions (`reconcileRevocationState`, `calculateRewardState`, `calculateStreak`, `calculatePathMastersProgress`).
  - `src/utils/authUtils.js`: Centralized admin role & email elevation checking.
  - `src/utils/documentParser.js`: Curriculum document parsing and `.docx` file detection.
  - `src/utils/imageUtils.js`: Client-side image compression.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | URL Class Code Auto-Join | Students bypass code input via `?code=ABC123` | M2 | survey |
| 2 | Student Roster Login | Select name from class roster and enter password/PIN | M2 | survey |
| 3 | Student Self-Signup | Allows new students to join class by entering name and password | M2 | survey |
| 4 | Teacher/Admin Auth | Teacher & Super Admin login with organization affiliation | M1 | survey |
| 5 | Student Emulation Bar | Sticky top banner letting teachers/admins preview student UX | M2 | survey |
| 6 | Player Stats Bar | Displays avatar, Lv/Title, XP progress bar, coins, streak | M1 | survey |
| 7 | Multi-Modal Submission Form | Submit work via Camera, File upload, URL link, or Text response | M2 | survey |
| 8 | Client-Side Image Compression | Resizes camera/uploaded photos to <900KB | M1 | survey |
| 9 | Co-Op Squad Teammates | Tag up to 4 classmates on a submission for shared XP | M1 | survey |
| 10 | My Submissions & Revision | Student portfolio to review submissions, filter by status, resubmit | M2 | survey |
| 11 | 3D Avatar Customizer | Interactive procedural SVG/canvas avatar with evolutionary tiers | M1 | survey |
| 12 | Teacher Custom Rewards | Students spend gold on real-world classroom rewards | M2 | survey |
| 13 | Collaborative Boss Battle | Weekly shared boss battle where class submissions deplete boss HP | M1 | survey |
| 14 | Guild Hall & STEM Depot | Collaborative guild team with high-fives, notice board, and STEM shop | M1 | survey |
| 15 | Class Leaderboard | Ranks classmates by XP, unlocked trophies, or day streak | M2 | survey |
| 16 | Submissions Review Queue | Approve/reject submissions with feedback; Queue vs By-Student views | M2 | survey |
| 17 | Activity Directions Reference | Contextual reference card showing teachers the exact assignment steps | M1 | survey |
| 18 | Bulk Roster Upload | Parse multiple student credentials from CSV/plain text | M1 | survey |
| 19 | Student Credentials Inspector | View student passwords, edit name/password, adjust coins/XP/avatar | M1 | survey |
| 20 | Choice Board Activity Editor | Visual WYSIWYG editor for activities, markdown steps, and links | M1 | survey |
| 21 | Smart Document Importer | Regex parser extracting activities from Google Docs / Word text | M1 | survey |
| 22 | Org Template Deployment | Browse master templates and apply or selectively import activities | M1 | survey |
| 23 | Classroom Club Arena | Interactive smartboard makerspace timer with Web Audio chimes | M1 | survey |
| 24 | Choice Board Image Export | High-resolution image export of class choice board for printing | M1 | survey |
| 25 | Educational Org Management | Create, edit, and assign default master templates to school orgs | M1 | survey |
| 26 | Teacher Role Elevation | Elevate teachers to Super Admin with cross-organization access | M1 | survey |
| 27 | Master Choice Board Templates | District master template creator with duplicate, preview, and publish | M1 | survey |
| 28 | District Boss Challenge Audit | Create district-wide weekly boss challenges with custom HP and lore | M1 | survey |
| 29 | FERPA/COPPA Privacy Center | In-app legal center with live search highlighting and print styles | M2 | survey |
| 30 | Level Progression & Gold Guide | Complete 25-level progression chart with cumulative gold rewards | M1 | survey |
| 31 | Dead Code Elimination | Remove unused 1,104-line mockBackend.js and dead hook exports | M1 | survey |
| 32 | Shared Utility Consolidation | Consolidate text formatting, step normalization, category paths | M1 | survey |
| 33 | Student Data Protection Guard | Prevent data wipe on load failure in useGameState | M1 | survey |
| 34 | Boss Level-Up Progression | Ensure Boss completion triggers level-up check and bonus coins | M1 | survey |
| 35 | Mystery Box Token Consumption | Wire up 2x XP multiplier and consume doubleXpActive & streakShield | M1 | survey |
| 36 | Submission Revocation Sync | Reconcile student local state when teacher revokes an approval | M1 | survey |
| 37 | Guild Path Masters Calculation | Ensure guild challenge counts unique learning paths | M1 | survey |
| 38 | Teacher Batch Review & Guidance | One-click batch approval and mandatory revision feedback prompt | M2 | survey |
| 39 | Login Usability & Visibility | Real-time roster search filter and password show/hide toggle | M2 | survey |
| 40 | Responsive & Accessible Navigation | Mobile category chips, horizontal tab scrolling, WCAG focus rings | M2 | survey |
| 41 | Automated Regression Prevention | Vitest test suites verifying fixed bugs, utilities, and components | M3 | survey |
| 42 | Clean Build & Production Verification | Ensure zero build errors, zero warnings, and clean bundle packaging | M3 | survey |
| 43 | Guild Challenge Persistence & Loading | Persist and restore claimedGuildChallenges from student profile on mount | M1-Followup | follow-up |
| 44 | Guild Immediate State Sync & Duplicate Guard | Immediate XP/coin/guildXP sync on claim & duplicate rejection | M1-Followup | follow-up |
| 45 | Teacher Guild Reset & Grant Sync | Multi-member guild achievement reflection and teacher reset | M1-Followup | follow-up |
| 46 | Chromebook MediaRecorder Video Component | In-app video recording with camera preview, timer countdown, controls | M2-Followup | follow-up |
| 47 | Video Submission Preview & Storage | Review playback, retake, size limits/compression, payload integration | M2-Followup | follow-up |
| 48 | Video Review Queue Playback | HTML5 video controls in FileViewer, StudentSubmissionsModal, TeacherPortal | M2-Followup | follow-up |
| 49 | Rendering & List Optimization | Memoize heavy lists, avoid unnecessary re-renders in App, GuildPanel, ClubArena | M3-Followup | follow-up |
| 50 | Media Stream Teardown Lifecycle | Cleanly stop all camera/mic tracks on unmount/close/tab switch | M3-Followup | follow-up |
| 51 | Verification & Automated Test Suite Pass | Zero test regressions (node tests/runAllTests.js) and clean npm run build | M3-Followup | follow-up |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1-Followup | Guild Achievement & Challenge Redemption Reliability (R1) | Fix claimedGuildChallenges persistence/loading in GuildPanel.jsx, useGameState.js, realBackend.js, immediate state updates, duplicate guards, teacher reset reflection in TeacherPortal.jsx | none | IN_PROGRESS |
| M2-Followup | In-App Chromebook Camera Video Recording & Submission (R2) | HTML5 MediaRecorder in App.jsx, preview/countdown/review, size limits, HTML5 video playback in FileViewer.jsx, StudentSubmissionsModal.jsx, TeacherPortal.jsx | M1-Followup | PLANNED |
| M3-Followup | Site Efficiency & Rendering Optimization, Tests, and Build (R3) | Memoization & rendering optimization in App.jsx, GuildPanel.jsx, ClubArenaModal.jsx, media stream teardown, node tests/runAllTests.js pass, clean npm run build | M1-Followup, M2-Followup | PLANNED |

## Interface Contracts
### `src/utils/textUtils.js`
```javascript
// Renders markdown bold (**text**) and italic (*text*) into React JSX elements
export function renderFormattedText(text): JSX.Element | string;

// Normalizes step object or string into canonical { text, link, linkText, completed }
export function normalizeStep(step): { text: string, link: string, linkText: string, completed: boolean };
export function normalizeSteps(steps): Array<{ text: string, link: string, linkText: string, completed: boolean }>;
export function parseRosterLines(rawText): Array<{ name: string, password: string }>;
```

### `src/utils/gameUtils.js`
```javascript
// Resolves class category ordering, path colors, and custom names against defaults
export function resolveClassLearningPaths(classDoc, defaultPaths): Array<{ id, name, subtitle, color, bgLight, icon, ... }>;

// Returns level object { level, title, minXp, maxXp, rewardCoins, badge } for given XP
export function getLevelForXp(xp): Object;

// Computes level transition, coins gained, and celebratory metadata
export function calculateLevelAndBonusCoins(oldXp, newXp, levels): { oldLevel, newLevel, bonusCoins, leveledUp };

// Returns timestamp of the most recent Monday at 7:00 AM local time
export function getMostRecentMonday7am(now?: Date): Date;

// Pure state transformation functions for testability
export function reconcileRevocationState(prev, submission): Object;
export function calculateRewardState(prev, submission, options): Object;
export function calculateStreak(prev, today): { newStreak, streakShieldActive };
export function calculatePathMastersProgress(members, defaultPaths, threshold): number;
```

### `src/utils/authUtils.js`
```javascript
// Universal elevated user check: role is admin/super_admin or authorized system email
export function isAdminUser(user): boolean;
```

## Code Layout
```
c:\Projects\Level-Up-Adventure-Mission\
├── src/
│   ├── components/       # UI components (Student, Teacher, Admin, Modals, 3D Avatar)
│   ├── context/          # React contexts (AuthContext.jsx)
│   ├── data/             # Static game data & levels (gameData.js)
│   ├── hooks/            # Game loop & state hooks (useGameState.js)
│   ├── services/         # Firebase Firestore backend (realBackend.js, firebase.js)
│   └── utils/            # Consolidated utilities (textUtils.js, gameUtils.js, authUtils.js, dateUtils.js, imageUtils.js, documentParser.js)
├── tests/                # Automated unit, integration, and regression test suites
└── .agents/teamwork/     # Orchestration metadata and coordination logs
```
