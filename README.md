# 🎮 Level Up Choice Board Game

An interactive, gamified choice board web application built for educational organizations, teachers, and students. Students earn XP, level up, customize 3D avatars, unlock rewards, and join guilds by completing learning activities across flexible category paths.

---

## 🌟 Live Application & Firebase Details

- **Live Web Application**: [https://level-up-choice-board-game.web.app](https://level-up-choice-board-game.web.app)
- **Firebase Project Name**: `Level Up Choice Board Game`
- **Firebase Project ID**: `level-up-choice-board-game`
- **Primary Administrator**: `matthew.harbert@lcps.org`

---

## 🚀 Key Features & Role Capabilities

### 👑 1. System Administrator & Admin Portal (`AdminPortal.jsx`)
- **Organization Management**: Create, edit, and track educational organizations.
- **Teacher Roster & Role Elevation**: View registered teachers across all organizations and elevate teachers to Admin status with a single click.
- **Master Choice Board Templates**: Create, edit, duplicate, preview, and publish master choice board templates for entire organizations or specific user classes.
- **Custom Categories & Subtitles**: Custom category manager supporting up to 6 unique paths (`Building`, `Coding`, `Strategy`, `World Cup`, etc.) with customizable titles and subtitles.
- **Default Organization Templates**: Automatically defaults any newly created class within an organization to the organization's first master template.

### 👩‍🏫 2. Teacher Portal (`TeacherPortal.jsx`)
- **Class & Roster Management**: Create classes, generate student join links/codes, and manage student accounts.
- **Co-Teacher Support**: Invite co-teachers to manage shared classes and student submissions.
- **Selective Activity Importing**: Browse organization master templates and selectively import individual activities or entire categories without removing existing class activities.
- **Submission Reviewing & XP Awarding**: Approve or reject student text, link, and file submissions with teacher feedback notes.
- **Guilds, Rewards & Spotlight**: Set up team guilds, custom rewards store, and highlight star students with spotlight badges.

### 📄 3. Smart Document & Google Doc Importer (`DocumentImporterModal.jsx` & `documentParser.js`)
- **Multi-Activity Extraction**: Instantly parses multiple activities at once from a single document.
- **Google Doc & Word Support**: Paste text directly from Google Docs / Word or upload `.txt`, `.md`, or `.docx` files.
- **Smart Pattern Recognition**: Automatically extracts activity titles, descriptions, step-by-step instructions, XP values (e.g. `150 XP`), activity types (`Low Tech`, `High Tech`, `Collaboration`, `Reflection`, `Creation`), and category paths.
- **Live Preview & Batch Import**: Displays parsed activities in an interactive preview card grid prior to importing into choice boards.

### 🎮 4. Student View & Emulation Mode
- **3D Avatar Customizer**: Interactive 3D avatar customization with unlocked outfits and accessories.
- **Gamified Progression**: Real-time XP tracking, level progression, boss challenges, and guild leaderboards.
- **Live Student Emulation**: Top sticky mode switcher bar allowing Admins and Teachers to instantly test the game experience as a student with an **[ Exit Emulation ]** banner.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: React 18, Vite, Lucide Icons, Canvas 3D rendering.
- **Styling**: Tailwind CSS (Dark Mode, Glassmorphism, Responsive Modal Layouts).
- **Backend & Database**: Firebase Authentication, Cloud Firestore, Firestore Security Rules (`firestore.rules`).
- **Hosting**: Firebase Hosting (`level-up-choice-board-game.web.app`).
- **Services Architecture**:
  - `src/services/realBackend.js`: Live Firestore database integration with admin role checks and org template distribution.
  - `src/services/mockBackend.js`: Offline fallback mock service for local offline testing.

---

## 📁 Repository Structure

```
Level-Up-Adventure-Mission/
├── firestore.rules               # Firestore Security Rules with isAdmin() verification
├── firebase.json                 # Firebase Hosting & Firestore deployment configuration
├── src/
│   ├── App.jsx                   # Main Router & Sticky View Mode Switcher Header
│   ├── components/
│   │   ├── AdminPortal.jsx       # Admin Dashboard, Org CRUD, Roster & Master Templates
│   │   ├── TeacherPortal.jsx     # Teacher Dashboard, Classes, Roster & Submissions
│   │   ├── ActivityEditor.jsx    # Choice Board Editor & Category Manager
│   │   ├── DocumentImporterModal.jsx # Smart Document & Google Doc Importer Modal
│   │   ├── LoginScreen.jsx       # Teacher & Student Login / Org Signup
│   │   ├── StudentView.jsx       # Gamified Student Choice Board Experience
│   │   └── Avatar3D.jsx          # 3D Student Avatar Renderer
│   ├── context/
│   │   └── AuthContext.jsx       # Auth Provider & Admin Role State Management
│   ├── services/
│   │   ├── realBackend.js        # Firebase Firestore API Interface
│   │   └── mockBackend.js        # Mock API Service
│   └── utils/
│       └── documentParser.js     # Multi-Activity Google Doc / Word Parser
└── package.json
```

---

## 💻 Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vernificus/Level-Up-Adventure-Mission.git
   cd Level-Up-Adventure-Mission
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local dev server**:
   ```bash
   npm run dev
   ```

4. **Build production bundle**:
   ```bash
   npm run build
   ```

5. **Deploy to Firebase Hosting & Firestore Rules**:
   ```bash
   npx firebase deploy --only hosting,firestore:rules
   ```
