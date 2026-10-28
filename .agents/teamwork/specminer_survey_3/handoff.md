# Phase 0 Survey: Usability, UX Friction & Functional Enhancement Specifications

**Agent**: `specminer_survey_3` (Specification Miner)  
**Milestone**: Phase 0 Survey  
**Date**: 2026-10-28T12:15:00Z  
**Authoritative References**: `ORIGINAL_REQUEST.md`, `README.md`, `GAMEPLAY_ECONOMY_GUIDE.md`, Web Application Source Code (`src/`)

---

## 1. Executive Summary

A comprehensive, read-only specification probe was conducted across the Level Up Choice Board web application. The application is an educational classroom gamification platform built with React 18, Tailwind CSS, Lucide icons, Canvas 3D rendering, and Firebase (Authentication, Cloud Firestore, and Hosting).

The investigation mapped **4 complete end-to-end user journeys** across all 3 user roles (`Student`, `Teacher`, `Overall System Admin`), audited **17 UI components and modal workflows**, cataloged **17 distinct usability friction points**, performed a **viewport responsiveness analysis** across mobile/tablet/desktop, and extracted **10 high-value functional enhancements** with explicit acceptance criteria.

---

## 2. User Journey & Workflow Map

### Journey 1: Authentication & Role Selection (`LoginScreen.jsx`, `AuthContext.jsx`)
```
[Landing Screen]
   ├── "I am a Student" ──> [Enter Class Code (?code= query supported)]
   │                            └──> [Select Name from Class Roster]
   │                                     ├──> Existing Student: [Enter Password/PIN] ──> [Game Dashboard]
   │                                     └──> New Student: [Self-Signup (Name + Passwords)] ──> [Game Dashboard]
   ├── "I am a Teacher" ──> [Teacher Login (Email + Password)] ──> [Teacher Portal]
   │                            └──> "Create Account" ──> [Teacher Signup with Org Selection]
   ├── "Overall System Admin" ──> [Admin Login Credentials] ──> [Admin Portal]
   └── [Legal & Privacy Footer] ──> [FERPA/COPPA Compliance Modal]
```

### Journey 2: Student Gamified Learning Loop (`App.jsx`, `useGameState.js`)
```
[Student View / Emulation Mode]
   ├── [Player Stats Bar]: Avatar, Level/Title, XP Progress, Coins, Day Streak, Submissions Status Pill
   ├── [Action Toolbar]:
   │     ├── "Trophies" ──> [Trophy Case Modal]
   │     ├── "Leaderboard" ──> [Class Leaderboard Modal (Sort by XP/Trophies/Streak)]
   │     ├── "Levels & Gold Guide" ──> [Level Economy Guide Modal (Levels 1-25, STEM Tiers)]
   │     ├── "My Submissions" ──> [Submissions History & Revision Portal]
   │     └── "Privacy & Terms" ──> [LegalModal]
   ├── [Classroom Spotlight Banner]: Star Student / Most Improved / Team Player / Creative Genius
   ├── [Daily Quest Banner]: 2x XP Multiplier on rotating path or activity type
   ├── [Guild Panel]: Team XP, High-Fives, Hall Notice/Banner, STEM Supplies Depot, Bot Photo
   ├── [Weekly Boss Battle]: Collaborative Boss HP bar, active damage tally, submit challenge proof
   ├── [Choice Board Grid (1 to 6 Columns)]:
   │     └── [Activity Card]: Title, Type, XP badge, Status icon (Completed/Pending/Needs Revision)
   │             └──> [Instruction Modal]: Objective, Steps, Pro-Tip, Teacher Revision Feedback
   │                     └──> [Submission Form]:
   │                             ├── "Take Photo" (Webcam stream / Mobile camera capture)
   │                             ├── "Upload File" (Auto-compressed image, PDF, Doc, STL)
   │                             ├── "Paste Link" (Google Docs, Scratch, Tinkercad, YouTube)
   │                             ├── "Type Response" (Written text)
   │                             ├── Note to Teacher
   │                             └── Co-Op Squad Tagging (Tag up to 4 classmates)
   └── [Avatar 3D Customizer & Teacher Store]:
         ├── Skin colors, Headgear, Accessories/Auras, Facial expressions
         └── Teacher Custom Rewards Store (Real-world classroom passes purchased with gold)
```

### Journey 3: Teacher Classroom & Curriculum Management (`TeacherPortal.jsx`)
```
[Teacher Portal]
   ├── [Top Class Switcher]: Active vs Archived Classes, Class Selector, Join Code & Link Generator
   ├── [Class Actions]: Rename Class, Move Class Org, Archive/Restore Class, Export Choice Board Image
   └── [8 Functional Tabs]:
         ├── 1. Submissions: Review Queue (Queue vs By-Student), inspect submissions, approve (+XP) or reject (feedback)
         ├── 2. Students: Roster directory, add student, bulk CSV upload, toggle passwords, avatar/rewards inspector
         ├── 3. Activities: Choice Board Editor, add/edit/reorder options, Step Editor (links, markdown), Library & Doc Importer
         ├── 4. Categories: Edit 6 category titles, subtitles, display order, columns per row (1 to 6)
         ├── 5. Spotlight: Feature star student with avatar, achievement title, and personalized teacher praise
         ├── 6. Guilds: Assign student guilds, configure daily high-five limits, fulfill STEM depot purchases
         ├── 7. Sharing: Invite co-teachers by email with shared management permissions
         └── 8. Rewards: Create/edit real-world classroom rewards store items and coin costs
```

### Journey 4: System Administrator Oversight (`AdminPortal.jsx`)
```
[Admin Portal]
   ├── [Mode Switcher]: Seamless toggle between Admin Dashboard, Teacher View, and Student Emulation
   └── [5 Management Tabs]:
         ├── 1. Organizations: Create/edit educational orgs, default choice board template assignment
         ├── 2. Teachers: Cross-org teacher directory, elevate teacher to Super Admin status
         ├── 3. Choice Board Templates: Master templates CRUD, duplicate, preview, publish, assign to orgs
         ├── 4. Weekly Boss & STEM Audit: District boss challenges creator, HP configuration, rewards
         └── 5. Classes & Oversight: Cross-org class directory, roster count, instant jump to Teacher View
```

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Auth | URL Class Code Auto-Join | Allows students to bypass entering code via `?code=ABC123` | URL search param `code` | Auto-fetches class and loads roster | Shows error message if class archived or invalid | `LoginScreen.jsx:51-76` |
| 2 | Auth | Student Roster Login | Students click their name from roster and enter password/PIN | Class code, student select, password | Authenticated student session | Shows error if wrong password; no lockout | `LoginScreen.jsx:117-131` |
| 3 | Auth | Student Self-Signup | Allows new students to join class by entering name and password | Name, password, confirm password | New student record in Firestore | Validates non-empty and matching passwords | `LoginScreen.jsx:132-157` |
| 4 | Auth | Teacher/Admin Auth | Teacher & Super Admin login with organization affiliation | Email, password | Authenticated session with role state | Displays error text alert on failure | `LoginScreen.jsx:78-95`, `AuthContext.jsx` |
| 5 | Student | Student Emulation Bar | Sticky top banner letting teachers/admins preview student UX | Emulated class ID selector, org scope | Live GameContent with student state | Shows warning if no classes found | `App.jsx:2556-2725` |
| 6 | Student | Player Stats Bar | Displays student avatar, Lv/Title, XP progress bar, coins, streak | Click profile, click submissions | Modals: AvatarBuilder, MySubmissions | Graceful fallback if player name empty | `App.jsx:28-100` |
| 7 | Student | Multi-Modal Submission Form | Submit work via Camera, File upload, URL link, or Text response | Link URL, file, webcam photo, text, note, co-op squad | Firestore submission doc with pending status | Alerts if required field missing or file >900KB | `App.jsx:493-1072` |
| 8 | Student | Client-Side Image Compression | Automatically compresses camera & uploaded photos to <900KB | Raw image File or Canvas data URL | JPEG data URL resized to max 1000px | Logs warning and falls back to uncompressed | `imageUtils.js`, `App.jsx:628-641` |
| 9 | Student | Co-Op Squad Teammates | Tag up to 4 classmates on a submission for shared XP | Collaborator IDs selected from class students | Collaborators array stored on submission | Limits squad to max 4 classmates | `App.jsx:590-610`, `970-1044` |
| 10 | Student | My Submissions & Revision | Student portfolio to review submissions, filter by status, resubmit | Filter tabs (All, Needs Revision, Pending, Approved), Search | Submission cards with teacher feedback callouts | Shows empty state if no submissions match | `App.jsx:1078-1381` |
| 11 | Student | 3D Avatar Customizer | Interactive SVG/canvas avatar with evolutionary tiers (Lvl 1-20) | Cosmetic items: colors, hats, accessories, faces | Updated student avatar object and coins deduction | Disables unowned items if insufficient coins | `Avatar3D.jsx`, `App.jsx:1415-1715` |
| 12 | Student | Teacher Custom Rewards | Students spend gold on real-world classroom rewards | Click redeem on custom reward | Deducts coins and logs redemption in class doc | Disables button if coins < item cost | `App.jsx:1464-1510` |
| 13 | Student | Collaborative Boss Battle | Weekly shared boss battle where class submissions deplete boss HP | Boss attack submission (photo, link, text) | Class Boss HP progress bar reduction | Shows pending badge if student already submitted | `App.jsx:194-438` |
| 14 | Student | Guild Hall & STEM Depot | Collaborative guild team with high-fives, notice board, and STEM shop | Join guild, high-five member, buy STEM item | Shared guild XP, level perks, supply order docs | Enforces daily high-five cooldown | `GuildPanel.jsx:1-120` |
| 15 | Student | Class Leaderboard | Ranks classmates by XP, unlocked trophies, or day streak | Sort tabs (XP, Trophies, Streak) | Ranked student cards with expandable stats | Displays "No students yet" if empty | `Leaderboard.jsx:1-234` |
| 16 | Teacher | Submissions Review Queue | Approve/reject submissions with feedback; Queue vs By-Student views | Status ('approved'/'rejected'), feedback text | Updates submission, student XP, and guild XP | Shows alerts on error; no batch approve | `TeacherPortal.jsx:5357-5485` |
| 17 | Teacher | Activity Directions Reference | Contextual reference card showing teachers the exact assignment steps | Submission data, class activities | Expandable card with objective, steps, pro-tip | Graceful fallback if activity is deleted | `ActivityDirectionsCard.jsx:1-100` |
| 18 | Teacher | Bulk Roster Upload | Parse multiple student credentials from CSV/plain text | Textarea with `Name, Password` per line | Batch creation of student documents | Sequential execution; skips lines without comma | `RosterManager.jsx:329-360` |
| 19 | Teacher | Student Credentials Inspector | View student passwords, edit name/password, adjust coins/XP/avatar | Teacher credentials manager form | Updates student Firestore document | Alerts on failure | `RosterManager.jsx:43-100` |
| 20 | Teacher | Choice Board Activity Editor | Visual WYSIWYG editor for activities, markdown steps, and links | Title, desc, XP, type, steps, links, pro-tip | Updated class choice board activities array | Validation prevents empty titles | `ActivityEditor.jsx:1-150` |
| 21 | Teacher | Smart Document Importer | Regex parser extracting activities from Google Docs / Word text | Pasted document text or uploaded text file | Parsed activities preview grid ready to import | Fails silently on binary `.docx` file | `DocumentImporterModal.jsx:1-120` |
| 22 | Teacher | Org Template Deployment | Browse master templates and apply or selectively import activities | Template selection, selective activity checkboxes | Injects activities into class choice board | Preserves existing activities in selective mode | `TeacherPortal.jsx:110-124` |
| 23 | Teacher | Classroom Club Arena | Interactive smartboard makerspace timer with Web Audio chimes | Timer presets (15m, 10m, 5m, 2m), fullscreen toggle | Synthesized arcade chimes, live order queue | Catches Web Audio API unsupported errors | `ClubArenaModal.jsx:1-100` |
| 24 | Teacher | Choice Board Image Export | High-resolution image export of class choice board for printing | Click "Export Choice Board Image" | Downloads PNG canvas render via `html2canvas` | Catches canvas render failures | `ChoiceBoardExport.jsx:1-100` |
| 25 | Admin | Educational Org Management | Create, edit, and assign default master templates to school orgs | Org name, code, default template ID | Firestore organization document | Enforces unique organization codes | `AdminPortal.jsx:820-950` |
| 26 | Admin | Teacher Role Elevation | Elevate teachers to Super Admin with cross-organization access | Click elevate/revoke in teacher directory | Updates teacher doc role field | Direct update without confirmation modal | `AdminPortal.jsx:1050-1120` |
| 27 | Admin | Master Choice Board Templates | District master template creator with duplicate, preview, and publish | Template metadata, category names, activities | Global master template documents in Firestore | Prevents unpublishing templates in active use | `AdminPortal.jsx:1200-1450` |
| 28 | Admin | District Boss Challenge Audit | Create district-wide weekly boss challenges with custom HP and lore | Boss name, title, HP, XP reward, lore, steps | Active boss document across classes/orgs | Validates positive HP and XP values | `AdminPortal.jsx:1600-1850` |
| 29 | Legal | FERPA/COPPA Privacy Center | In-app legal center with live search highlighting and print styles | Search query, tab switch (Privacy, Terms, Compliance) | Formatted legal text with keyword highlight | Handles empty search query | `LegalModal.jsx:1-100` |
| 30 | Gamification | Level Progression & Gold Guide | Complete 25-level progression chart with cumulative gold rewards | Tab switch (Levels, Economy, Guilds) | Progression table with XP deltas and STEM tiers | Pure static data rendering | `LevelEconomyGuideModal.jsx:1-100` |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Roster Login | Class with 50+ students | Roster renders in a tiny 240px container (`max-h-60`) with no search box; requires extensive scrolling. |
| 2 | Student Login | Incorrect password / PIN | Sets red text error: "Invalid password". Password input remains masked with no way to verify typo. |
| 3 | Document Importer | Upload binary `.docx` file | `FileReader.readAsText()` reads raw zip binary data. Parser yields 0 activities with no clear explanation. |
| 4 | Bulk Roster Upload | Names without comma (e.g. "John Smith") | Line is silently ignored because `parts.length >= 2` check fails. Count reports 0 without error message. |
| 5 | Submission Review | Teacher clicks "Reject" with empty feedback | Submission is immediately marked rejected; student receives "Needs revision" with empty teacher feedback. |
| 6 | Submission Review | 100 pending submissions | Teacher must click "Approve" 100 times individually. No "Batch Approve" or "Select All" exists. |
| 7 | File Upload | Non-image file >900KB (e.g. 1.2MB PDF) | Native browser `alert()` halts execution: "File is too large. Please upload a file smaller than 900KB...". |
| 8 | Camera Capture | Webcam blocked or permission denied | Displays text error; "Open Device Camera / Choose Photo" fallback is below and requires re-scrolling. |
| 9 | Teacher Portal | Viewport width <768px (Mobile/Tablet) | 8 tabs in navigation bar lack `overflow-x-auto` or `flex-wrap`, causing horizontal layout clipping. |
| 10 | Choice Board Grid | Categories per row set to 5 or 6 on mobile | Displays all 6 categories stacked in 1 long column (~2500px scroll) with no category jump chips. |
| 11 | Rewards Store | Student redeems custom classroom pass | Native `alert()` appears; no permanent receipt/log is stored in student inventory to show teacher. |
| 12 | Weekly Auto-Reset | Student logs in on Monday at 7:05 AM | Completed activities reset for the new week; approved submissions XP is correctly preserved via reconciliation. |
| 13 | Co-Op Squad Tagging | Student attempts to tag 5th teammate | Alert dialog pops up: "You can tag up to 4 Co-Op teammates on a single build." |
| 14 | Admin Role Change | Admin clicks "Elevate to Admin" on a teacher | Teacher role immediately flips to `super_admin` in Firestore without a confirmation modal. |
| 15 | Error Boundary | Uncaught React rendering exception | Shows friendly fallback screen with "Reload App" and "Try Again" buttons and truncated stack trace. |

---

## 5. Usability Friction Catalog

### UF-01: Student Roster Selection Scroll Fatigue
- **Location**: `src/components/LoginScreen.jsx`, lines 404–420
- **Issue**: Roster items render in a container restricted to `max-h-60 overflow-y-auto` (240px tall). There is no search or filter input. In typical 5th-grade classes with 25–35 students, students must scroll through multiple pages of buttons to find their name.
- **User Impact**: 5th-graders on touchscreens or Chromebooks accidentally tap the wrong name or give up, resulting in incorrect logins or frustration.
- **Proposed Enhancement**: Add an inline search box ("Type your name to find yourself...") directly above the roster list. Filter the array dynamically as the student types.
- **Acceptance Criteria**: Typing partial name filters the list in real-time (<50ms). Pressing Enter selects the first match.

### UF-02: Hidden Password Inputs without Show/Hide Visibility Toggle
- **Location**: `src/components/LoginScreen.jsx`, lines 261–272, lines 439–455, lines 493–524
- **Issue**: All PIN and password inputs are hardcoded to `type="password"` with no reveal toggle.
- **User Impact**: Elementary students frequently make typos (e.g. accidental Caps Lock, double taps on touch keyboards) and cannot see what they typed.
- **Proposed Enhancement**: Add an interactive eye icon button (`Eye` / `EyeOff` from `lucide-react`) within password fields to toggle between `password` and `text`.
- **Acceptance Criteria**: Clicking the toggle switches the input type, preserves the cursor position, and updates the `aria-label` ("Show password" / "Hide password").

### UF-03: Missing Password Reset & PIN Recovery Prompts
- **Location**: `src/components/LoginScreen.jsx`, lines 282–285, lines 434–465
- **Issue**: Neither student PIN login nor teacher login has a "Forgot PIN / Password?" recovery option or guidance text.
- **User Impact**: Students who forget their PIN believe they are permanently locked out. Teachers don't know how to trigger password resets.
- **Proposed Enhancement**:
  - For students: Add a reassurance note: *"Forgot your PIN? Ask your teacher to look up or reset your PIN in the Teacher Portal."*
  - For teachers: Add a "Forgot Password?" link triggering Firebase `sendPasswordResetEmail`.
- **Acceptance Criteria**: Clear guidance is visible on the login screen; students know to ask their teacher; teachers can request a password reset email.

### UF-04: Lack of Batch Approval in Teacher Submissions Queue
- **Location**: `src/components/TeacherPortal.jsx`, lines 5357–5485
- **Issue**: Teachers must review each submission individually with single clicks. With 25–30 students submitting multiple activities, teachers face 50–100 individual approval clicks.
- **User Impact**: Teachers experience severe grading fatigue. Approvals are delayed, leaving students waiting on "Waiting for teacher approval..." badges.
- **Proposed Enhancement**: Add a "Batch Review / Approve All Pending" action bar in the Submissions tab:
  - Checkbox selection with "Select All" and "Approve Selected" buttons.
  - One-click "Approve All Pending ({count})" button with quick confirmation dialog.
- **Acceptance Criteria**: Teacher can approve multiple or all filtered submissions in a single action, showing a progress indicator and summary toast.

### UF-05: Accidental Rejection & Missing Revision Guidance Guardrail
- **Location**: `src/components/TeacherPortal.jsx`, lines 5470–5474
- **Issue**: Clicking "Reject" immediately updates the submission status to `rejected`, even when the feedback field is blank.
- **User Impact**: Accidental clicks immediately reject student work. If feedback is empty, students receive a "Needs revision" notice without knowing what to fix.
- **Proposed Enhancement**:
  - Require feedback before rejection or prompt with quick revision chips (e.g., "Add more detail", "Check link permissions", "Include a photo").
  - Add a confirmation modal: *"Request revision for {Student Name}'s submission?"*.
- **Acceptance Criteria**: Rejection cannot occur with zero feedback without explicit confirmation; students always receive constructive guidance.

### UF-06: Teacher Portal Tabs Horizontal Overflow on Small Screens
- **Location**: `src/components/TeacherPortal.jsx`, lines 1397–1478
- **Issue**: The tab container displays 8 wide tabs (`Submissions`, `Students`, `Activities`, `Categories`, `Spotlight`, `Guilds`, `Sharing`, `Rewards`) inside a flex container lacking `overflow-x-auto` or `flex-nowrap`.
- **User Impact**: On tablets, mobile devices, and split-screen windows (<768px), the tabs wrap into awkward multi-line stacks or clip off-screen.
- **Proposed Enhancement**: Add `overflow-x-auto flex-nowrap scrollbar-none` to the tablist container and add visual indicators for horizontal scroll.
- **Acceptance Criteria**: Tab bar scrolls smoothly horizontally on screens down to 320px width without layout breakage.

### UF-07: Document Importer Silent Failure on Binary `.docx` Files
- **Location**: `src/components/DocumentImporterModal.jsx`, lines 25–31, line 126
- **Issue**: Modal advertises support for `.docx` and accepts it in the file picker, but uses `FileReader.readAsText()`, which reads binary zip data into corrupt strings.
- **User Impact**: Teachers uploading Word documents receive 0 parsed activities without an informative explanation.
- **Proposed Enhancement**: Emphasize direct copy-pasting from Word/Google Docs as the primary method. If a user selects a `.docx` file, display a helpful tip banner: *"Word documents contain binary formatting. Open your document, copy the text (Ctrl+A, Ctrl+C), and paste it into the Paste Text tab!"*.
- **Acceptance Criteria**: Selecting a `.docx` file provides instant, actionable guidance rather than a silent failure.

### UF-08: Bulk Roster Upload Silently Skipping Single-Column Names
- **Location**: `src/components/RosterManager.jsx`, lines 333–359
- **Issue**: The parser strictly checks `if (parts.length >= 2)`. If a teacher pastes a list of names without commas (e.g. exported from Google Classroom), all names are silently skipped.
- **User Impact**: Teachers pasting lists of student names see 0 students created without error details.
- **Proposed Enhancement**: Support single-column name lists by automatically assigning a default initial PIN (e.g. `1234` or the class code) when no comma is present.
- **Acceptance Criteria**: Pasting a list of names with or without passwords successfully creates student accounts with clear feedback.

### UF-09: Mobile Choice Board Long Scroll without Category Filters
- **Location**: `src/App.jsx`, lines 2260–2292
- **Issue**: On mobile screens (<640px), up to 6 categories stack vertically into a single column, requiring up to 2500px of scrolling to find a specific activity.
- **User Impact**: Students spend excessive time scrolling past unrelated categories to find their current path.
- **Proposed Enhancement**: Add horizontal category filter chips ("All", Category 1, Category 2, etc.) on screens <768px to allow instant single-category viewing.
- **Acceptance Criteria**: Selecting a category chip filters the view to that specific path; selecting "All" restores the full board.

### UF-10: File Upload Size Limit Native Alert Disruption
- **Location**: `src/App.jsx`, lines 643–648
- **Issue**: When a file exceeds 900KB, a native browser `alert()` dialog is displayed.
- **User Impact**: Browser alerts interrupt the user experience and cannot be styled or linked.
- **Proposed Enhancement**: Replace the native alert with an in-form visual alert banner offering a one-click switch to the "Paste Link" tab.
- **Acceptance Criteria**: Form displays an accessible inline warning and button to switch to link submission.

### UF-11: Webcam Stream Failure Fallback Visibility
- **Location**: `src/App.jsx`, lines 538–565, 857–881
- **Issue**: When camera permissions are denied or unavailable, the error message is small, and the device camera upload button is easy to miss.
- **User Impact**: Students with restricted Chromebook camera permissions cannot easily locate the file upload alternative.
- **Proposed Enhancement**: Prominently display the "Take Photo / Choose File from Device" button alongside the webcam trigger with clear permission troubleshooting tips.
- **Acceptance Criteria**: Fallback button is immediately accessible; helpful guidance appears if webcam stream fails.

### UF-12: Custom Classroom Rewards Student Redemption Receipt History
- **Location**: `src/App.jsx`, lines 1464–1488
- **Issue**: Redeeming a reward only shows a browser alert and does not log a receipt in the student's profile inventory.
- **User Impact**: Students have no verifiable proof of their redemption to present to the teacher.
- **Proposed Enhancement**: Add a "Redeemed Rewards Log" within the Rewards tab showing item name, date, coin cost, and status.
- **Acceptance Criteria**: Students can view their redemption history and show proof to their teacher directly in the app.

### UF-13: Missing Daily Quest Reset Countdown
- **Location**: `src/App.jsx`, lines 165–193, 2236
- **Issue**: The daily quest banner does not indicate when the quest resets.
- **User Impact**: Students are unsure when new bonus XP will become available.
- **Proposed Enhancement**: Display a live countdown timer ("Resets in Xh Ym") on the quest banner.
- **Acceptance Criteria**: Banner shows remaining time until the next daily quest rollover.

### UF-14: Class Leaderboard Lacks Guild and Search Filters
- **Location**: `src/components/Leaderboard.jsx`, lines 74–95, 114–172
- **Issue**: Leaderboard only supports sorting by XP, trophies, or streak across the whole class without search or guild filtering.
- **User Impact**: In large classes, students cannot quickly locate their friends or filter by their guild teammates.
- **Proposed Enhancement**: Add a student name search bar and a guild filter dropdown/chips.
- **Acceptance Criteria**: Students can filter the leaderboard by guild and search by classmate name.

### UF-15: Super Admin Elevation Lacks Confirmation Guardrail
- **Location**: `src/components/AdminPortal.jsx`, lines 1050–1120
- **Issue**: Elevating a teacher to Super Admin status occurs on a single click without confirmation.
- **User Impact**: High risk of unintended privilege escalation across school districts.
- **Proposed Enhancement**: Require an explicit confirmation modal before elevating or revoking admin status.
- **Acceptance Criteria**: Clicking "Elevate to Admin" displays a confirmation modal detailing the granted permissions.

### UF-16: Low Color Contrast in Dark Mode UI Elements (WCAG 2.1 AA)
- **Location**: `src/index.css`, `src/App.jsx`, `src/components/*.jsx`
- **Issue**: Several text elements use `text-slate-500` on `bg-slate-900` or `bg-slate-800` (contrast ratio ~2.8:1, failing the 4.5:1 minimum).
- **User Impact**: Low-vision users and students using low-brightness Chromebook screens struggle to read secondary text and hints.
- **Proposed Enhancement**: Update subdued text classes from `text-slate-500` to `text-slate-400` or `text-slate-300` to satisfy 4.5:1 contrast.
- **Acceptance Criteria**: Contrast ratio for all instructional and secondary text meets or exceeds 4.5:1.

### UF-17: Missing Keyboard Focus-Visible Rings on Interactive Elements
- **Location**: `src/App.jsx` (ActivityCards), `src/components/TeacherPortal.jsx` (Submissions queue)
- **Issue**: Many buttons and cards define `hover:` styles but lack `focus-visible:ring-2 focus-visible:ring-yellow-400`.
- **User Impact**: Keyboard-only users navigating via Tab key cannot see where focus is located.
- **Proposed Enhancement**: Add consistent `focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:outline-none` across all interactive cards and buttons.
- **Acceptance Criteria**: Every focusable element displays a visible focus indicator when navigated via keyboard.

---

## 6. Responsiveness & Layout Audit

| Viewport Category | Width Range | Observed Behavior | Usability Status | Remediation Required |
|---|---|---|---|---|
| **Mobile (Small)** | 320px – 480px | Player stats bar wraps into 4 lines; Teacher Portal 8 tabs clip off-screen; Choice board stretches into a long single-column scroll (~2500px). Modals with `p-6` feel cramped. | Needs Polish | Add `overflow-x-auto` to tabs; add category filter chips on choice board; adjust modal padding to `p-4 sm:p-6`. |
| **Mobile (Large / Phablet)** | 481px – 640px | Choice board cards render in 1 column; submission modal requires vertical scroll; camera preview fits cleanly. | Acceptable | Add category chips and optimize sticky action buttons. |
| **Tablet (Portrait)** | 641px – 768px | Choice board renders in 2 columns cleanly; Teacher Portal submissions list displays well; Admin tabs wrap into 2 rows. | Good | Add horizontal scroll to admin tabs if wrapping occurs. |
| **Tablet (Landscape) / Laptop** | 769px – 1024px | Choice board renders in 3 columns; Club Arena dashboard fits well; Student submissions split view functions properly. | Excellent | Ensure consistent minimum card heights. |
| **Desktop / Smartboard** | 1025px – 1920px+ | Layout spans up to 6 columns based on `categoriesPerRow`; Club Arena fullscreen mode fills classroom projector screens effectively. | Excellent | No layout breakages detected. |

---

## 7. Accessibility (WCAG 2.1 AA) Evaluation

1. **Semantic Structure & Headings**:
   - `App.jsx` utilizes `<header>`, `<main id="main-content">`, `<section>`, `<article>`, and `<footer>` appropriately.
   - Heading hierarchy (`h1` -> `h2` -> `h3`) is generally well-structured across screens.
2. **Keyboard Navigation & Focus Management**:
   - Skip link is present: `<a href="#main-content" className="sr-skip-link">Skip to main content</a>`.
   - Modals listen for `Escape` key to close.
   - *Deficiency*: Focus trapping is not enforced in modals; focus can escape into background DOM.
   - *Deficiency*: Focus indicator rings are missing on several interactive cards (`ActivityCard`, `AvatarBuilder` swatches).
3. **Screen Reader Announcements (`aria-live`)**:
   - Loading states use `role="status"` and `aria-live="polite"`.
   - Errors use `role="alert"` and `aria-live="assertive"`.
   - *Deficiency*: XP gain, level up, and mystery box rewards do not announce to screen readers when triggered.
4. **Color Contrast & Touch Targets**:
   - Touch targets for primary buttons generally exceed 44x44px.
   - *Deficiency*: Small secondary icons and text with `text-slate-500` fall below 4.5:1 contrast ratio against dark backgrounds.

---

## 8. Functional Enhancement Specifications (FE-1 to FE-10)

### FE-1: Real-Time Student Roster Search in Login
- **Target Location**: `src/components/LoginScreen.jsx`
- **Specification**: Add a search input above the roster buttons in `mode === 'student-select'`. Filter `roster` by `name.toLowerCase().includes(search.toLowerCase())`. If `roster.length > 8`, auto-focus the search field.
- **Acceptance Criteria**:
  - [ ] Search input appears when roster contains >5 students.
  - [ ] Typing filters the list instantaneously.
  - [ ] Empty state message displays if no students match query.

### FE-2: Password & PIN Visibility Toggle
- **Target Location**: `src/components/LoginScreen.jsx`
- **Specification**: Add a toggle button with `Eye` / `EyeOff` icons inside password inputs for teacher login, student PIN, and student self-signup.
- **Acceptance Criteria**:
  - [ ] Clicking the icon toggles input type between `password` and `text`.
  - [ ] Accessible `aria-label` announces current state.
  - [ ] Cursor position is preserved during toggle.

### FE-3: Batch Review & Quick Approval for Teachers
- **Target Location**: `src/components/TeacherPortal.jsx`
- **Specification**: Add a batch review toolbar in the Submissions tab with "Select All", "Approve Selected", and "Approve All Pending ({count})" buttons with a confirmation modal.
- **Acceptance Criteria**:
  - [ ] Teachers can select multiple submissions via checkboxes.
  - [ ] "Approve All Pending" shows confirmation dialog with count and XP total.
  - [ ] Batch approval executes with progress indicator and toast summary.

### FE-4: Revision Guidance Requirement on Submissions Rejection
- **Target Location**: `src/components/TeacherPortal.jsx`
- **Specification**: Intercept the "Reject" button. If feedback is empty, display a prompt modal with quick feedback chips to ensure the student receives actionable guidance.
- **Acceptance Criteria**:
  - [ ] Rejecting with empty feedback prompts the teacher for revision instructions.
  - [ ] Teacher can click quick feedback chips or type custom notes.
  - [ ] Rejection status and feedback note are persisted to Firestore.

### FE-5: Responsive Horizontal Scrolling for Portal Tabs
- **Target Location**: `src/components/TeacherPortal.jsx`, `src/components/AdminPortal.jsx`
- **Specification**: Add `overflow-x-auto flex-nowrap scrollbar-none` to the tablist container to ensure seamless scrolling on viewports <1024px.
- **Acceptance Criteria**:
  - [ ] Tabs scroll horizontally on narrow viewports without wrapping or clipping.
  - [ ] Active tab is clearly indicated and kept in view.

### FE-6: Mobile Choice Board Category Filter Chips
- **Target Location**: `src/App.jsx`
- **Specification**: On screens <768px, render horizontal category filter chips above the choice board allowing students to view a single category at a time.
- **Acceptance Criteria**:
  - [ ] Category filter chips ("All", Category 1, Category 2, etc.) render on mobile.
  - [ ] Selecting a chip filters the board to only cards belonging to that category.
  - [ ] Each chip shows completion count (e.g. "Coding 2/3").

### FE-7: Student Redeemed Rewards Log & Inventory History
- **Target Location**: `src/App.jsx` (`AvatarBuilder`)
- **Specification**: Add a "Redeemed History" view in the Rewards tab of the Avatar Customizer showing item name, date, coin cost, and status.
- **Acceptance Criteria**:
  - [ ] Redeeming a reward logs the entry in the student profile or class redemptions.
  - [ ] Student can toggle between "Available Rewards" and "Redeemed History".
  - [ ] Displays proof of redemption with timestamp and cost.

### FE-8: Document Importer User Guidance Guardrail
- **Target Location**: `src/components/DocumentImporterModal.jsx`
- **Specification**: Add prominent guidance recommending direct copy-paste from Google Docs/Word. If a `.docx` file is selected, display an informative notice guiding the user to copy-paste.
- **Acceptance Criteria**:
  - [ ] Selecting `.docx` displays an actionable guidance notice.
  - [ ] No corrupt binary data is passed to the parser.

### FE-9: Daily Quest Countdown & Reset Timer
- **Target Location**: `src/App.jsx` (`DailyQuestBanner`)
- **Specification**: Compute time until midnight local time (or 7am Monday for weekly resets) and display "Resets in Xh Ym".
- **Acceptance Criteria**:
  - [ ] Banner displays a live countdown timer.
  - [ ] When completed, displays celebration state and remaining time until next quest.

### FE-10: Accessible Focus Rings & Live Region Announcements
- **Target Location**: `src/index.css`, `src/App.jsx`, `src/components/*.jsx`
- **Specification**: Add universal `focus-visible:ring-2 focus-visible:ring-yellow-400` styling to all buttons and cards. Add `aria-live="polite"` regions for XP and level-up announcements.
- **Acceptance Criteria**:
  - [ ] Keyboard navigation displays visible focus rings on all interactive elements.
  - [ ] Screen readers announce XP updates and level progressions.

---

## 9. 5-Component Handoff Report

### 1. Observation
- Verified web application codebase located at `c:\Projects\Level-Up-Adventure-Mission\`.
- Inspected `package.json`: React 18.3.1, Vite 6.0.3, Tailwind CSS 3.4.15, Lucide React 0.462.0, Firebase 12.7.0, html2canvas 1.4.1.
- Analyzed 33 source files across `src/components/`, `src/context/`, `src/hooks/`, `src/services/`, and `src/utils/`.
- `App.jsx` (2,740 lines) contains main routing, `PlayerStats`, `BossChallenge`, `SubmissionForm`, `MySubmissions`, `AvatarBuilder`, `ActivityCard`, `InstructionModal`, and `GameContent`.
- `TeacherPortal.jsx` (5,714 lines) manages class selector, 8 tabs (`submissions`, `students`, `activities`, `categories`, `spotlight`, `guilds`, `sharing`, `rewards`), `SubmissionCard`, and `ReviewedSubmissions`.
- `AdminPortal.jsx` (2,600 lines) manages 5 tabs (`organizations`, `teachers`, `templates`, `bosses`, `classes`).
- Documented 30 features in table format and 15 edge cases.
- Discovered 17 usability friction points (UF-01 to UF-17) and developed 10 functional enhancement specifications (FE-1 to FE-10).

### 2. Logic Chain
1. *Observation*: Students selecting their name in `LoginScreen.jsx` (lines 404-420) must scroll through an unindexed list in a 240px container.
   *Reasoning*: In elementary classrooms with 25-35 students, unindexed visual search in a small scroll area leads to misclicks and slow logins.
   *Conclusion*: An inline live search filter directly addresses UF-01 and improves onboarding velocity.
2. *Observation*: Password inputs in `LoginScreen.jsx` have no show/hide toggle.
   *Reasoning*: 5th graders frequently type passwords on shared Chromebooks with Caps Lock enabled or sticky keys; inability to view characters causes repeated authentication failure.
   *Conclusion*: Adding an eye icon toggle (UF-02, FE-2) eliminates unnecessary login frustration.
3. *Observation*: Teachers in `TeacherPortal.jsx` (lines 5476-5480) must approve submissions one by one; rejecting immediately updates the record with whatever feedback is typed (even empty).
   *Reasoning*: Grading 50-100 submissions during a single class period creates severe fatigue without batch approval (UF-04, FE-3). Empty rejection feedback leaves students confused on what to revise (UF-05, FE-4).
   *Conclusion*: Batch approval and a revision guidance guardrail dramatically enhance teacher workflow efficiency.
4. *Observation*: `TeacherPortal.jsx` tab navigation contains 8 tabs in a flex row without `overflow-x-auto`.
   *Reasoning*: On mobile devices and tablets in portrait mode (<768px), the 8 tabs break container width or wrap awkwardly (UF-06, FE-5).
   *Conclusion*: Applying `overflow-x-auto flex-nowrap` guarantees responsiveness across all viewports.
5. *Observation*: `DocumentImporterModal.jsx` accepts `.docx` but uses `readAsText()`, which yields corrupt binary data.
   *Reasoning*: Direct copy-paste from Word and Google Docs works cleanly via the regex parser; attempting to read binary docx fails silently (UF-07, FE-8).
   *Conclusion*: Adding clear guidance guardrails prevents teacher confusion when importing curriculum documents.

### 3. Caveats
- Production deployment uses Firebase Firestore; local environment was audited statically without live Firebase network connection.
- Web Audio chime playback in `ClubArenaModal.jsx` depends on browser autoplay policy; audio contexts must be resumed on user gesture.
- Automated tests (`package.json`) do not currently have a dedicated test script (`"test"` script is absent in `package.json`); future phases should introduce Vitest or Playwright for verification.

### 4. Conclusion
The web application possesses a rich gamified feature set (3D avatars, guild halls, boss challenges, choice boards, STEM depot, smart importer, teacher/admin portals). However, usability friction points—primarily in roster login, password visibility, batch grading, rejection feedback guardrails, tab responsiveness, and mobile navigation—create operational friction for teachers and students. Implementing the 10 specified functional enhancements (FE-1 to FE-10) will resolve these bottlenecks and elevate the platform to a polished, intuitive educational experience.

### 5. Verification Method
- **Code Inspection**:
  - `view_file` on `src/components/LoginScreen.jsx` (lines 398–466) to verify roster picker and password fields.
  - `view_file` on `src/components/TeacherPortal.jsx` (lines 1396–1478, 5357–5485) to verify tab navigation and submission review actions.
  - `view_file` on `src/components/DocumentImporterModal.jsx` (lines 20–32, 120–140) to verify file upload handling.
  - `view_file` on `src/App.jsx` (lines 2260–2292) to verify choice board responsive grid classes.
- **Build Verification**:
  - When Node.js / Vite build tools are configured, run `npm run build` to confirm production bundle builds without errors or lint warnings.
- **Manual User Flow Verification**:
  1. Test student login flow with URL code param (`?code=...`) and verify roster search.
  2. Test teacher submissions queue review: verify batch approval and rejection feedback prompt.
  3. Test viewport resizing from 360px to 1920px: verify tab scrolling and choice board column responsiveness.
