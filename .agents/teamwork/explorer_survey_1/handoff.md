# Phase 0 Survey Handoff Report: Architecture, Features & Tooling

**Agent Role**: teamwork_explorer (Survey Instance 1)  
**Date**: 2026-10-28  
**Working Directory**: `c:\Projects\Level-Up-Adventure-Mission\.agents\teamwork\explorer_survey_1`  

---

## 1. Observation

### 1.1 Repository Structure & Technology Stack
Direct inspection of repository files (`package.json:1-28`, `vite.config.js:1-11`, `index.html:1-15`, `src/main.jsx:1-11`):
- **Core Framework**: React 18 (`react: ^18.3.1`, `react-dom: ^18.3.1`) with JSX (ES Modules).
- **Bundler & Build Tool**: Vite 6 (`vite: ^6.0.3`, `@vitejs/plugin-react: ^4.3.4`).
  - Base URL configured as relative: `base: './'` (`vite.config.js:6`).
  - Build output directory: `dist` (`vite.config.js:8`).
- **Styling**: Tailwind CSS 3 (`tailwindcss: ^3.4.15`, `postcss: ^8.4.49`, `autoprefixer: ^10.4.20`).
  - Custom animations, WCAG focus-visible indicators (`outline-yellow-400`), reduced motion media query, skip link in `src/index.css:1-78`.
- **Backend & Database**: Firebase 12 (`firebase: ^12.7.0`).
  - Firebase Authentication (`src/services/firebase.js:19`).
  - Cloud Firestore (`src/services/firebase.js:20`, project ID: `level-up-choice-board-game`).
  - Security Rules in `firestore.rules:1-143`.
- **Other Runtime Dependencies**:
  - `lucide-react`: `^0.462.0` (UI iconography).
  - `html2canvas`: `^1.4.1` (used in `src/components/ChoiceBoardExport.jsx` for rendering choice board PNG screenshots).

### 1.2 Build & Test Mechanism Status
Inspection of `package.json` (`lines 6-10, 18-26`):
```json
6:   "scripts": {
7:     "dev": "vite",
8:     "build": "vite build",
9:     "preview": "vite preview"
10:   },
```
- **Test Scripts & Tooling**: Completely absent. There is no `"test"` script in `package.json`. No testing libraries (`vitest`, `jest`, `@testing-library/react`, `playwright`, `cypress`) are installed in `devDependencies` or `dependencies`.
- **Test Files**: Searching for `*test*` or `*spec*` across the repository yielded 0 results.
- **Host Execution Environment**:
  - Command: `npm run build`
  - Result: `npm : The term 'npm' is not recognized as the name of a cmdlet, function, script file, or operable program.`
  - Search for Node.js in PATH and standard directories: Node.js/npm is not installed on the system PATH.
- **CI/CD Configurations**:
  - `.github/workflows/deploy.yml`: Uses GitHub Actions `actions/setup-node@v4` with `node-version: 20`, runs `npm install`, `npm run build`, and deploys `./dist` to GitHub Pages.
  - `.github/workflows/firebase-hosting.yml`: Runs on merge to `main`, executes `npm install`, `npm run build`, deploys to Firebase Hosting channel `live` via `FirebaseExtended/action-hosting-deploy@v0` with Firebase Tools `15.34.0`.

### 1.3 Complete File and Component Inventory
The `src/` directory contains 27 files spanning 5 subdirectories (`components/`, `context/`, `data/`, `hooks/`, `services/`, `utils/`):

| File Path | Lines | Size (bytes) | Primary Role / Responsibility |
|---|---|---|---|
| `src/main.jsx` | 11 | 245 | Application entry point; mounts `<App />` into `#root`. |
| `src/index.css` | 78 | 1,746 | Tailwind directives, keyframes, WCAG accessibility rules. |
| `src/App.jsx` | 2,740 | 132,078 | Main view router, top sticky mode switcher header, and embedded Student View (`GameContent`, `PlayerStats`, `BossChallenge`, `SubmissionForm`, `MySubmissions`, `TrophyCase`, `AvatarBuilder`, modals, `ErrorBoundary`). |
| `src/context/AuthContext.jsx` | 134 | 4,647 | React Context for session management (`sessionStorage`), teacher login/signup, student login/signup, role checking. |
| `src/data/gameData.js` | 846 | 34,209 | Static game configuration: 25 levels, 18 achievements, 15 guilds, STEM supplies shop, daily quests, boss challenges, mystery box rewards, default learning paths. |
| `src/hooks/useGameState.js` | 765 | 30,301 | Core student game loop hook: player stats, XP progression, weekly resets, class doc syncing, submissions state, guild joining, mystery box handling. |
| `src/services/firebase.js` | 21 | 768 | Firebase App initialization, exports `auth` and `db`. |
| `src/services/realBackend.js` | 2,615 | 95,544 | Production Firestore API service: teacher auth, classes, roster, submissions, review, choice boards, organizations, guilds, STEM store. |
| `src/services/mockBackend.js` | 1,104 | 39,314 | Unused localStorage mock backend service. |
| `src/components/AdminPortal.jsx` | 2,600 | 130,641 | System Admin dashboard: organizations CRUD, teacher roster & elevation, master choice board templates, class oversight, district weekly boss. |
| `src/components/TeacherPortal.jsx` | 5,714 | 305,264 | Comprehensive teacher hub: class management, submissions queue & grading, co-teachers, custom categories, student directory, rewards, Live Club Arena trigger. |
| `src/components/ActivityEditor.jsx` | 1,449 | 69,066 | Visual choice board editor: category management, step formatting, rich links, activity import/export, master template synchronization. |
| `src/components/DocumentImporterModal.jsx` | 250 | 12,159 | Modal for pasting or uploading curriculum docs to batch-parse activities. |
| `src/components/LoginScreen.jsx` | 577 | 25,552 | Multi-role authentication screen: student join by code, student password/self-signup, teacher login/signup with org selection. |
| `src/components/Avatar3D.jsx` | 1,046 | 51,152 | Procedural SVG/isometric character renderer with evolution stages, customizable hats, accessories, faces, colors, aura animations. |
| `src/components/ActivityDirectionsCard.jsx` | 381 | 15,879 | Reusable directions viewer card displaying formatted steps, resource links, pro-tips, and submission criteria. |
| `src/components/ChoiceBoardExport.jsx` | 271 | 10,720 | Modal rendering a choice board preview and generating PNG download via `html2canvas`. |
| `src/components/ClubArenaModal.jsx` | 647 | 26,848 | Fullscreen big-screen projector dashboard for STEM clubs: countdown timers with chimes, pitch pass queue, guild XP race, live activity ticker. |
| `src/components/FileViewer.jsx` | 66 | 1,945 | Renders submitted images, audio, video, or download buttons for PDFs/documents. |
| `src/components/GuildPanel.jsx` | 1,411 | 73,273 | Guild headquarters modal: guild selection, cheering/high-fives, guild hall customization, STEM supplies depot store. |
| `src/components/Leaderboard.jsx` | 234 | 10,956 | Class leaderboard modal with tabs for XP, Trophies, and Streaks. |
| `src/components/LegalModal.jsx` | 351 | 22,714 | Compliance dialog covering Privacy Policy, Terms of Service, FERPA, COPPA, SOPIPA compliance with search and print features. |
| `src/components/LevelEconomyGuideModal.jsx` | 371 | 20,390 | Reference modal for XP thresholds, gold rewards, STEM depot tiers. |
| `src/components/RosterManager.jsx` | 1,166 | 61,293 | Teacher roster tool: student password management, avatar inspector, item granting, guild assignment, individual student submissions portfolio. |
| `src/components/StudentSubmissionsModal.jsx` | 741 | 38,639 | Dedicated modal for reviewing and filtering all submissions belonging to a single student. |
| `src/utils/documentParser.js` | 153 | 5,670 | Regular-expression parser converting plain text / Google Docs into structured activity objects. |
| `src/utils/imageUtils.js` | 70 | 2,104 | Client-side canvas image downscaling to data URIs (<100KB) and URL validator. |

### 1.4 Code Redundancies & Dead Code Directly Observed
1. **Unused Mock Backend Service**:
   - `src/services/mockBackend.js` (1,104 lines) defines `export const mockBackend = { ... }`.
   - Grep search for `mockBackend` across `src/` returned only line 58 of `src/services/mockBackend.js`. Every module (`App.jsx:24`, `AuthContext.jsx:2`, `useGameState.js:3`, `AdminPortal.jsx:3`, `TeacherPortal.jsx:3`, etc.) imports `realBackend`. `mockBackend` is dead code.
2. **Duplicated Markdown Formatter `renderFormattedText`**:
   - `src/App.jsx:439-465`: `function renderFormattedText(text) { ... }`
   - `src/components/ActivityDirectionsCard.jsx:29-54`: `export function renderFormattedText(text) { ... }`
   - `src/components/ActivityEditor.jsx:26-56`: `function renderFormattedText(text) { ... }`
   - All three implement identical regex matching for `**bold**` and `*italic*`.
3. **Duplicated Step Normalization**:
   - `src/components/ActivityDirectionsCard.jsx:17-26`: `export function normalizeStep(step)` and `normalizeSteps(steps)`.
   - `src/components/ActivityEditor.jsx:15-23`: `function normalizeStep(step)` and `normalizeSteps(steps)`.
4. **Duplicated Category Ordering & Color Assignment Logic**:
   - `src/hooks/useGameState.js:136-184`
   - `src/components/ActivityEditor.jsx:440-475`
   - `src/components/ChoiceBoardExport.jsx:35-80`
   - All three implement the identical 45-line algorithm for checking `classDoc.categoryNames`, appending extra categories, filtering removed ones, sorting by `classDoc.categoryOrder`, and re-mapping `PATH_COLORS`.
5. **Inconsistent and Duplicated Admin Identity Checks**:
   - `src/App.jsx:2483-2489`: Checks `role === 'admin' || role === 'super_admin' || role === 'super admin' || email === 'matthew.harbert@lcps.org' || email === 'propellevelup@lcps.org'`.
   - `src/components/TeacherPortal.jsx:38-44`: Same check as `App.jsx`.
   - `src/components/ActivityEditor.jsx:489`: Checks `user?.role === 'admin' || user?.email?.toLowerCase() === 'matthew.harbert@lcps.org'` (missing `propellevelup@lcps.org`, `super_admin`, `super admin`).
   - `src/services/realBackend.js:49, 63, 96, 578, 657`: Hardcoded string checks against `matthew.harbert@lcps.org`.
6. **Documentation Drift**:
   - `README.md:71` documents `src/components/StudentView.jsx` as the component for "Gamified Student Choice Board Experience".
   - That file does not exist on disk; the entire student view is embedded within `src/App.jsx` (lines 2011-2408 as `GameContent` plus supporting subcomponents).

### 1.5 Functional Bugs & Usability Defects Observed
1. **Document Importer Binary File Read Trap (`DocumentImporterModal.jsx:25-30, 95`)**:
   - UI states: `Upload Document File (.txt, .docx, .md)`.
   - Code execution:
     ```javascript
     const reader = new FileReader();
     reader.onload = (event) => {
       const content = event.target.result;
       handleParse(content);
     };
     reader.readAsText(file);
     ```
   - When a user uploads a `.docx` file (which is a zipped XML package), `readAsText` reads raw binary data, injecting corrupted garbage strings into `parseDocumentToActivities`, resulting in parsing failure or unusable garbage activities.
2. **Monolithic Component Complexity**:
   - `TeacherPortal.jsx` is 5,714 lines long. Multiple sub-features (e.g. co-teacher modal, rename modal, move org modal, rewards editor, student detail views) are crammed into one single component, creating massive re-renders and making state changes hard to trace.
   - `App.jsx` is 2,740 lines long because `GameContent`, `PlayerStats`, `BossChallenge`, `SubmissionForm`, `MySubmissions`, `TrophyCase`, `AvatarBuilder`, `InstructionModal`, and all modals are co-located in `App.jsx`.

---

## 2. Logic Chain

1. **Premise 1 (Tooling & Environment)**:
   - Observation: `package.json` contains no test dependencies or test scripts (`package.json:6-10`), and `npm run build` fails on the host because `npm` is not in the system `PATH`.
   - Reasoning: The project was developed without local automated testing (relying on manual testing and CI/CD for build verification). To fulfill requirement R3 ("Write automated tests that verify fixed bugs and validate new functionality"), a testing framework must be introduced (e.g., `vitest` + `@testing-library/react`), and Node.js must be made available in the execution environment.
2. **Premise 2 (Dead Code & Redundancy)**:
   - Observation: `mockBackend.js` is 1,104 lines long and has 0 imports in the codebase; functions like `renderFormattedText`, `normalizeSteps`, and category resolution logic are duplicated across 3 separate files.
   - Reasoning: Removing `mockBackend.js` immediately eliminates over 1,100 lines of dead code with zero functional impact. Extracting `renderFormattedText`, `normalizeSteps`, and `resolveClassLearningPaths` into shared utility files (`src/utils/textUtils.js` or `src/utils/gameUtils.js`) consolidates logic, ensures consistent behavior, and prevents synchronization bugs.
3. **Premise 3 (Architecture & Modularization)**:
   - Observation: `README.md` references `src/components/StudentView.jsx`, yet the entire student experience lives inside `App.jsx` (lines 2011-2408), swelling `App.jsx` to 2,740 lines.
   - Reasoning: Extracting `GameContent` and its subcomponents (`PlayerStats`, `BossChallenge`, `SubmissionForm`, `MySubmissions`, `TrophyCase`, `AvatarBuilder`, `ActivityCard`, `InstructionModal`, modals) into `src/components/StudentView/` or `StudentView.jsx` directly aligns the codebase with its documented architecture, decouples student-specific state from root routing, and brings `App.jsx` down to ~150 lines.
4. **Premise 4 (Bug Remediation & Usability)**:
   - Observation: `DocumentImporterModal.jsx` accepts `.docx` files but executes `readAsText()`, which breaks on binary docx files.
   - Reasoning: Either `.docx` support must be handled via a library (e.g. `mammoth`), or the UI and file input accept list must be scoped to `.txt` and `.md` (or raw text pasting) with clear user guidance to prevent uploading incompatible binary files.
   - Observation: Admin role checks are inconsistent (`ActivityEditor.jsx` misses `propellevelup@lcps.org` and `super_admin`).
   - Reasoning: Creating a single central auth helper `isElevatedUser(user)` in `AuthContext.jsx` or an auth utility guarantees consistent permissions across all views.

---

## 3. Caveats

1. **Host Node.js Environment**: The local Windows terminal environment currently lacks `node` and `npm` on its PATH. Any automated tests or local build verifications require Node.js to be installed/linked or tests executed via a Node runner.
2. **Live Firebase Backend**: The application is wired to a live Firebase project (`level-up-choice-board-game`). Offline unit tests for utilities and components must mock Firebase/backend calls so they can run reliably in any environment without real network access.
3. **No Prior Test Baseline**: Because there are 0 existing tests, regression testing must be established from scratch.

---

## 4. Conclusion

The application is a functional, feature-rich gamified educational platform built with React 18, Vite 6, Tailwind CSS, and Firebase Firestore. However, it suffers from:
1. **Zero Test Automation**: No testing framework is configured, and 0 automated tests exist.
2. **Significant Redundancy & Dead Code**: 1,104 lines of dead code in `mockBackend.js`, and redundant utilities (`renderFormattedText`, `normalizeSteps`, category path resolution) duplicated across multiple modules.
3. **Severe Component Bloat**: `TeacherPortal.jsx` (5,714 lines) and `App.jsx` (2,740 lines) bundle dozens of separate workflows into monoliths.
4. **Usability & Functional Glitches**: Document importer `.docx` binary corruption, inconsistent admin checks across 5 files, and architectural drift between code and documentation.

### Recommended Milestone Decomposition for Next Phases:
- **Milestone 1: Test Infrastructure & Baseline Verification Setup**
  - Install `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.
  - Add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json`.
  - Create baseline unit tests for utilities (`documentParser.test.js`, `imageUtils.test.js`, `gameData.test.js`).
- **Milestone 2: Dead Code Removal & Shared Utility Consolidation**
  - Remove dead `mockBackend.js`.
  - Consolidate `renderFormattedText`, `normalizeStep(s)`, `resolveClassLearningPaths`, and `isAdminUser` into shared utilities.
  - Fix admin role check inconsistency.
- **Milestone 3: Architecture & Component Modularization**
  - Extract `StudentView.jsx` and sub-modals out of `App.jsx`.
  - Fix the `.docx` document importer bug (scope to `.txt`, `.md`, pasted text or integrate proper text extraction).
- **Milestone 4: Usability & Functional Polish**
  - Refine modal layout responsiveness, submission feedback workflows, and error states.
  - Validate against regression with comprehensive test suite.

---

## 5. Verification Method

To independently verify these findings:
1. **Inspect package.json & scripts**:
   - Tool: `view_file` on `c:\Projects\Level-Up-Adventure-Mission\package.json`
   - Observe lines 6-10 (scripts) and lines 18-26 (devDependencies). Verify absence of test scripts and test runners.
2. **Verify dead code in mockBackend.js**:
   - Tool: `grep_search` with Query `mockBackend` in `src/`.
   - Observe it is only referenced in `src/services/mockBackend.js:58`.
3. **Verify duplicated utilities**:
   - Tool: `grep_search` with Query `renderFormattedText` in `src/`.
   - Observe definitions in `App.jsx:439`, `ActivityDirectionsCard.jsx:29`, and `ActivityEditor.jsx:26`.
4. **Verify Document Importer `.docx` issue**:
   - Tool: `view_file` on `src/components/DocumentImporterModal.jsx:20-31, 95`.
   - Observe `readAsText(file)` used on user-supplied files while claiming `.docx` support.
5. **Verify StudentView missing on disk**:
   - Tool: `find_by_name` with Pattern `StudentView.jsx` in `src/`.
   - Observe 0 matches, while `README.md:71` references it.
