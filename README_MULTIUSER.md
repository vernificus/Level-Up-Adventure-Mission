# Multi-User System Implementation

This project is configured to support multiple teachers, students, and organizations with multiple classes using **Firebase**.

## Architecture

- **Backend:** Firebase (Authentication & Cloud Firestore)
- **Frontend:** React (Vite) + Tailwind CSS
- **State Management:** React Context + Custom Hooks (`useGameState`, `useAuth`)
- **Hosting / Deploy:** Automated via GitHub Actions to GitHub Pages and Firebase Hosting

## Configuration

The Firebase configuration is located in `src/services/firebase.js`. It is currently set up with the provided project credentials.

---

## User Guide

### For Teachers
1. Select **"I am a Teacher"** on the home screen.
2. Sign up or log into your account.
3. Use the **+** button to create a class.
4. Share the **Class Code** with your students.
5. Click on a class to review pending submissions, manage 2–10 guilds, customize bot photos, audit student STEM supply orders, and edit the choice board.
6. Click **"Levels & Gold Guide"** on the dashboard bar to review student level XP and gold economy at any time.

### For Students
1. Select **"I am a Student"** on the home screen.
2. Enter the **Class Code** provided by your teacher.
3. Enter your name or log in with your credentials.
4. Complete choice board activities, participate in daily quests, and take down the weekly boss challenge!
5. Spend earned gold in the **Avatar Shop** or contribute supplies to your guild in the **STEM Supplies Depot**.
6. Click **"Levels & Gold Guide"** on your dashboard to see how much XP is needed for your next level and upcoming gold rewards.

---

## 🏆 Student Level Progression & Gold Economy Guide

Students progress through 25 levels by earning XP. Every level-up automatically grants gold (coins). Completing all 25 levels awards a total of **7,625 Coins**!

| Level | Rank / Title | Total XP Required | XP From Prev Level | Gold (Coins) Awarded | Cumulative Gold |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **1** | Rookie | **0 XP** | Start | — | 0 Coins |
| **2** | Apprentice | **200 XP** | +200 XP | 🪙 **+25** | 25 Coins |
| **3** | Challenger | **500 XP** | +300 XP | 🪙 **+50** | 75 Coins |
| **4** | Warrior | **900 XP** | +400 XP | 🪙 **+75** | 150 Coins |
| **5** | Champion | **1,400 XP** | +500 XP | 🪙 **+100** | 250 Coins |
| **6** | Master | **2,000 XP** | +600 XP | 🪙 **+125** | 375 Coins |
| **7** | Legend | **2,800 XP** | +800 XP | 🪙 **+150** | 525 Coins |
| **8** | Mythic | **3,800 XP** | +1,000 XP | 🪙 **+200** | 725 Coins |
| **9** | Titan | **5,000 XP** | +1,200 XP | 🪙 **+200** | 925 Coins |
| **10** | Immortal | **6,500 XP** | +1,500 XP | 🪙 **+250** | 1,175 Coins |
| **11** | Sentinel | **8,200 XP** | +1,700 XP | 🪙 **+250** | 1,425 Coins |
| **12** | Vanguard | **10,100 XP** | +1,900 XP | 🪙 **+275** | 1,700 Coins |
| **13** | Warden | **12,200 XP** | +2,100 XP | 🪙 **+275** | 1,975 Coins |
| **14** | Overlord | **14,500 XP** | +2,300 XP | 🪙 **+300** | 2,275 Coins |
| **15** | Sage | **17,000 XP** | +2,500 XP | 🪙 **+350** | 2,625 Coins |
| **16** | Archon | **19,800 XP** | +2,800 XP | 🪙 **+350** | 2,975 Coins |
| **17** | Paragon | **22,800 XP** | +3,000 XP | 🪙 **+375** | 3,350 Coins |
| **18** | Sovereign | **26,000 XP** | +3,200 XP | 🪙 **+375** | 3,725 Coins |
| **19** | Ascendant | **29,500 XP** | +3,500 XP | 🪙 **+400** | 4,125 Coins |
| **20** | Eternal | **33,500 XP** | +4,000 XP | 🪙 **+500** | 4,625 Coins |
| **21** | Celestial | **38,000 XP** | +4,500 XP | 🪙 **+500** | 5,125 Coins |
| **22** | Transcendent | **43,000 XP** | +5,000 XP | 🪙 **+500** | 5,625 Coins |
| **23** | Apex | **48,500 XP** | +5,500 XP | 🪙 **+500** | 6,125 Coins |
| **24** | Infinite | **55,000 XP** | +6,500 XP | 🪙 **+500** | 6,625 Coins |
| **25** | Godlike | **62,000 XP** | +7,000 XP | 🪙 **+1,000** | 7,625 Coins |

### How XP is Earned
- **High Tech Activities:** 150 XP
- **Collaboration Activities:** 130 XP
- **Self-Reflection Activities:** 120 XP
- **Low Tech Activities:** 100 XP
- **Daily Quest Match:** 2x Double XP on featured category
- **Daily Login Bonus:** +50 XP
- **Streak Bonus:** +25 XP / day
- **Weekly Boss Challenge:** 300 to 350+ XP
- **Achievement Badges:** +50 to +2,000 XP

### How Gold (Coins) is Earned & Spent
- **Earned via:** Level-ups (+25 to +1,000), Mystery Boxes (+25, +50, +100), Weekly Bosses (+100 to +120), Guild Challenges (+60 to +100), and Teacher Grants.
- **Spent on:**
  - **Guild STEM Supplies Depot:** Students spend coins on physical materials, gears, sensors, VEX pitch arena access, and 3D printing filament.
  - **Avatar Customization Shop:** Outfits, hats, auras, accessories, and glowing skins.

### Guild Progression (Levels 1–10) & STEM Tiers
- **Lvl 1 (0 XP):** Tier 1 STEM Supplies (Drafting paper & cardstock)
- **Lvl 2 (1,000 XP):** Tier 2 STEM Supplies (Hardware, brackets, fasteners)
- **Lvl 3 (2,500 XP):** Tier 3 STEM Supplies (Motors, gears, power cells)
- **Lvl 4 (5,000 XP):** Tier 3 Extended Modules
- **Lvl 5 (8,000 XP):** Tier 4 STEM Supplies (Sensors, microcontrollers, VEX Pitch arena access)
- **Lvl 6 (12,000 XP):** Tier 4 Advanced Robotics Kits
- **Lvl 7 (17,000 XP):** Tier 5 STEM Supplies (3D printer filament & custom laser CNC)
- **Lvl 8 (23,000 XP):** Tier 5 Autonomous Sensor Arrays
- **Lvl 9 (30,000 XP):** Tier 5 Master Engineering Lab Access
- **Lvl 10 (40,000 XP):** Tier 5 Legendary Prototyping Suite

---

## Build & Deployment

### Automated CI/CD (GitHub Actions)
Pushing to the `main` branch automatically triggers two deployment workflows:
1. **GitHub Pages (`deploy.yml`):** Builds the Vite project and deploys to GitHub Pages (`gh-pages`).
2. **Firebase Hosting (`firebase-hosting.yml`):** Builds and deploys live to Firebase Hosting (`level-up-choice-board-game.web.app`).

### Manual Build
```bash
npm run build
```
The output will be bundled cleanly to the `dist/` directory.

### Manual Firebase Hosting Deploy
```bash
firebase deploy --only hosting
```
