import { LEVELS, GUILDS, DEFAULT_10_GUILDS, DEFAULT_15_GUILDS, DEFAULT_STEM_SUPPLIES, GUILD_LEVELS, GUILD_CHALLENGES, BOSS_CHALLENGES, getGuildLevelInfo, getHighFiveCooldownStatus } from "../data/gameData";

function calculateLevelAndBonusCoins(oldXp, newXp) {
  const oldLevel = LEVELS.reduce((acc, l) => oldXp >= l.xpRequired ? l : acc, LEVELS[0]);
  const newLevel = LEVELS.reduce((acc, l) => newXp >= l.xpRequired ? l : acc, LEVELS[0]);
  let bonusCoins = 0;
  if (newLevel.level > oldLevel.level) {
    for (let lvl = oldLevel.level + 1; lvl <= newLevel.level; lvl++) {
      const lvlData = LEVELS.find(l => l.level === lvl);
      if (lvlData?.coinReward) bonusCoins += lvlData.coinReward;
    }
  }
  return { oldLevel, newLevel, bonusCoins };
}

// Simulates a backend with a 500ms delay to mimic network latency
const DELAY = 500;
const DB_PREFIX = 'lvlup_v2_';

// Helper to simulate async behavior
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to read/write DB
const getDB = () => {
  const data = localStorage.getItem(DB_PREFIX + 'db');
  if (data) return JSON.parse(data);
  return {
    teachers: [],
    classes: [],
    students: [],
    submissions: [],
    organizations: [],
    orgTemplates: []
  };
};

const saveDB = (data) => {
  localStorage.setItem(DB_PREFIX + 'db', JSON.stringify(data));
};

/*
  IMPORTANT: This is a Mock Backend Service.
  It uses localStorage to simulate a database for demonstration purposes.

  TO MIGRATE TO FIREBASE:
  1. Initialize Firebase App in a new `firebase.js` file.
  2. Replace this file with `firebaseService.js` implementing the same method signatures.
  3. Update `loginTeacher` to use `signInWithEmailAndPassword`.
  4. Update `createClass`, `joinClass`, etc. to use Firestore `addDoc`, `getDocs`, `updateDoc`.

  Example structure for Firestore:
  - collection('teachers')
  - collection('classes')
  - collection('students') (or subcollection under classes)
  - collection('submissions')
*/

export const mockBackend = {
  // ================= TEACHER AUTH =================
  async loginTeacher(email, password) {
    await wait(DELAY);
    const db = getDB();
    const teacher = db.teachers.find(t => t.email === email && t.password === password);
    if (!teacher) throw new Error('Invalid credentials');
    return {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role || 'teacher',
      organizationId: teacher.organizationId || null,
      organizationName: teacher.organizationName || ''
    };
  },

  async registerTeacher(name, email, password, organizationId = null, organizationName = '') {
    await wait(DELAY);
    const db = getDB();
    if (db.teachers.find(t => t.email === email)) throw new Error('Email already exists');

    const newTeacher = {
      id: 't_' + Date.now(),
      name,
      email,
      password,
      role: 'teacher',
      organizationId: organizationId || null,
      organizationName: organizationName || ''
    };

    db.teachers.push(newTeacher);

    if (organizationId && db.organizations) {
      const org = db.organizations.find(o => o.id === organizationId);
      if (org) org.teacherCount = (org.teacherCount || 0) + 1;
    }

    saveDB(db);
    return { ...newTeacher };
  },

  // ================= CLASS MANAGEMENT =================
  async getClasses(teacherId) {
    await wait(DELAY);
    const db = getDB();
    return db.classes.filter(c => c.teacherId === teacherId);
  },

  async createClass(teacherId, className) {
    await wait(DELAY);
    const db = getDB();

    // Generate a simple 6-char code
    let code;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (db.classes.find(c => c.code === code));

    const newClass = {
      id: 'c_' + Date.now(),
      teacherId,
      name: className,
      code,
      studentCount: 0
    };

    db.classes.push(newClass);
    saveDB(db);
    return newClass;
  },

  async updateClass(classId, updates) {
    await wait(DELAY);
    const db = getDB();
    const idx = db.classes.findIndex(c => c.id === classId);
    if (idx === -1) throw new Error("Class not found");
    db.classes[idx] = { ...db.classes[idx], ...updates };
    saveDB(db);
    return db.classes[idx];
  },

  async updateClassName(classId, newName) {
    if (!newName || !newName.trim()) {
      throw new Error("Class name cannot be empty");
    }
    return await this.updateClass(classId, { name: newName.trim() });
  },

  async deleteClass(classId) {
    await wait(DELAY);
    const db = getDB();
    db.classes = db.classes.filter(c => c.id !== classId);
    saveDB(db);
    return true;
  },

  async archiveClass(classId) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    if (!cls) throw new Error("Class not found");
    cls.archived = true;
    cls.archivedAt = new Date().toISOString();
    saveDB(db);
    return true;
  },

  async unarchiveClass(classId) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    if (!cls) throw new Error("Class not found");
    cls.archived = false;
    cls.archivedAt = null;
    saveDB(db);
    return true;
  },

  async getClassByCode(code) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.code === code);
    if (!cls) throw new Error('Class not found');
    if (cls.archived) {
      throw new Error('This class has been archived by the teacher. Please contact your teacher for assistance.');
    }
    const teacher = (db.teachers || []).find(t => t.id === cls.teacherId);
    return { ...cls, teacherName: teacher?.name || 'Teacher' };
  },

  async getAllClassesByOrg(orgId) {
    await wait(DELAY);
    const db = getDB();
    const teachersInOrg = (db.teachers || []).filter(t => t.organizationId === orgId);
    const teacherIds = new Set(teachersInOrg.map(t => t.id));
    const teachersMap = new Map((db.teachers || []).map(t => [t.id, t.name || t.email]));

    return (db.classes || [])
      .filter(c => c.organizationId === orgId || teacherIds.has(c.teacherId))
      .map(c => ({
        ...c,
        organizationId: c.organizationId || orgId,
        teacherName: c.teacherName || teachersMap.get(c.teacherId) || 'Teacher'
      }));
  },

  async getClassesForOrganization(organizationId) {
    return await this.getAllClassesByOrg(organizationId);
  },

  async getAllClasses() {
    await wait(DELAY);
    const db = getDB();
    const teachersMap = new Map((db.teachers || []).map(t => [t.id, t.name || t.email]));
    return (db.classes || []).map(c => ({
      ...c,
      teacherName: c.teacherName || teachersMap.get(c.teacherId) || 'Teacher'
    }));
  },

  // ================= STUDENT AUTH =================
  async joinClass(classCode, username) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.code === classCode);
    if (!cls) throw new Error('Invalid class code');
    if (cls.archived) {
      throw new Error('This class has been archived by the teacher. Please contact your teacher for assistance.');
    }

    // Check if student exists in this class
    let student = db.students.find(s => s.classId === cls.id && s.name.toLowerCase() === username.toLowerCase());

    if (!student) {
      // Create new student profile
      student = {
        id: 's_' + Date.now(),
        classId: cls.id,
        name: username,
        // Initial Game State
        xp: 0,
        coins: 100,
        completedActivities: [],
        completedBossChallenges: [],
        currentStreak: 0,
        lastActivityDate: null,
        streakShieldActive: false,
        unlockedAchievements: [],
        guild: null,
        guildXpContributed: 0,
        avatar: { color: 'default', hat: 'none', accessory: 'none', face: 'happy' },
        ownedItems: ['default', 'none', 'happy'],
        dailyQuestCompleted: false,
        lastDailyQuestDate: null,
        mysteryBoxesOpened: 0,
        pendingMysteryBoxes: 0,
        doubleXpActive: false,
        totalActivitiesCompleted: 0,
        collaborationCount: 0,
        pathCompletions: {},
        lastActivityReset: new Date().toISOString(),
      };
      db.students.push(student);

      // Update class count
      cls.studentCount = (cls.studentCount || 0) + 1;
      saveDB(db);
    }

    return { ...student, role: 'student', className: cls.name };
  },

  async getStudent(studentId) {
    // No delay needed for frequent updates, or keep it small
    const db = getDB();
    return db.students.find(s => s.id === studentId);
  },

  async updateStudent(studentId, updates) {
    // No delay for game state updates to feel snappy
    const db = getDB();
    const index = db.students.findIndex(s => s.id === studentId);
    if (index !== -1) {
      db.students[index] = { ...db.students[index], ...updates };
      saveDB(db);
      return db.students[index];
    }
    return null;
  },

  // ================= SUBMISSIONS =================
  async getSubmissions(classId) {
    await wait(DELAY);
    const db = getDB();
    return db.submissions.filter(s => {
      // Find the student for this submission to check classId
      // Actually, we should store classId on submission for easier query
      return s.classId === classId;
    }).map(sub => {
        // Hydrate with student name
        const student = db.students.find(st => st.id === sub.studentId);
        return { ...sub, playerName: student ? student.name : 'Unknown' };
    });
  },

  async getStudentSubmissions(studentId) {
      await wait(DELAY);
      const db = getDB();
      const student = db.students.find(st => st.id === studentId);
      return db.submissions.filter(s => s.studentId === studentId).map(sub => ({
        ...sub,
        playerName: sub.playerName || (student ? student.name : 'Unknown')
      }));
  },

  async createSubmission(studentId, classId, submissionData) {
    await wait(DELAY);
    const db = getDB();

    const newSubmission = {
      id: 'sub_' + Date.now(),
      studentId,
      classId,
      ...submissionData, // activityId, activityTitle, etc.
      submittedAt: new Date().toISOString(),
      status: 'pending',
      teacherFeedback: ''
    };

    db.submissions.push(newSubmission);
    saveDB(db);
    return newSubmission;
  },

  async reviewSubmission(submissionId, status, feedback) {
    await wait(DELAY);
    const db = getDB();
    const index = db.submissions.findIndex(s => s.id === submissionId);
    if (index !== -1) {
      const sub = db.submissions[index];
      const prevStatus = sub.status || 'pending';
      const xpEarned = Number(sub.xp) || (sub.isBoss ? 300 : 100);

      db.submissions[index] = {
        ...sub,
        status,
        teacherFeedback: feedback !== undefined ? feedback : (sub.teacherFeedback || ''),
        reviewedAt: new Date().toISOString()
      };

      // Sync student completedActivities, XP, Coins, Level, Guild XP
      if (sub.studentId) {
        const student = db.students.find(st => st.id === sub.studentId);
        if (student) {
          const currentXp = Number(student.xp) || 0;
          const currentCoins = Number(student.coins) || 100;
          const currentGuildXp = Number(student.guildXpContributed) || 0;
          const completed = Array.isArray(student.completedActivities)
            ? [...student.completedActivities]
            : [];
          const completedBosses = Array.isArray(student.completedBossChallenges)
            ? [...student.completedBossChallenges]
            : [];
          const totalCompleted = Number(student.totalActivitiesCompleted) || completed.length;

          if (status === 'approved' && prevStatus !== 'approved') {
            const newXp = currentXp + xpEarned;
            const { bonusCoins } = calculateLevelAndBonusCoins(currentXp, newXp);
            student.xp = newXp;
            student.coins = currentCoins + bonusCoins;
            if (student.guild) {
              student.guildXpContributed = currentGuildXp + xpEarned;
            }
            student.totalActivitiesCompleted = totalCompleted + 1;
            if (student.totalActivitiesCompleted % 3 === 0) {
              student.pendingMysteryBoxes = (Number(student.pendingMysteryBoxes) || 0) + 1;
            }

            if (sub.isBoss) {
              if (sub.activityId && !completedBosses.includes(sub.activityId)) {
                completedBosses.push(sub.activityId);
              }
              student.completedBossChallenges = completedBosses;
            } else {
              if (sub.activityId && !completed.includes(sub.activityId)) {
                completed.push(sub.activityId);
              }
              student.completedActivities = completed;
            }
            db.submissions[index].xpAwarded = xpEarned;
          } else if (status !== 'approved' && prevStatus === 'approved') {
            const xpToDeduct = Number(sub.xpAwarded) || xpEarned;
            student.xp = Math.max(0, currentXp - xpToDeduct);
            student.guildXpContributed = Math.max(0, currentGuildXp - xpToDeduct);
            student.totalActivitiesCompleted = Math.max(0, totalCompleted - 1);

            if (sub.isBoss) {
              student.completedBossChallenges = completedBosses.filter(id => id !== sub.activityId);
            } else {
              student.completedActivities = completed.filter(id => id !== sub.activityId);
            }
            db.submissions[index].xpAwarded = 0;
          }
        }
      }

      saveDB(db);
      return db.submissions[index];
    }
    throw new Error('Submission not found');
  },

  async syncStudentSubmissions(studentId) {
    await wait(DELAY);
    const db = getDB();
    const student = db.students.find(s => s.id === studentId);
    if (!student) throw new Error("Student not found");

    const subs = db.submissions.filter(s =>
      s.studentId === student.id ||
      (student.name && s.playerName && s.playerName.trim().toLowerCase() === student.name.trim().toLowerCase())
    );

    const approvedSubs = subs.filter(s => s.status === 'approved');
    const approvedXpTotal = approvedSubs.reduce(
      (sum, s) => sum + (Number(s.xp) || (s.isBoss ? 300 : 100)),
      0
    );

    const currentXp = Number(student.xp) || 0;
    let updated = false;

    if (currentXp < approvedXpTotal) {
      student.xp = approvedXpTotal;
      const { bonusCoins } = calculateLevelAndBonusCoins(currentXp, approvedXpTotal);
      if (bonusCoins > 0) {
        student.coins = (Number(student.coins) || 100) + bonusCoins;
      }
      if (student.guild) {
        student.guildXpContributed = Math.max(Number(student.guildXpContributed) || 0, approvedXpTotal);
      }
      updated = true;
    }

    const approvedActivityIds = approvedSubs.filter(s => !s.isBoss && s.activityId).map(s => s.activityId);
    student.completedActivities = Array.from(new Set([...(student.completedActivities || []), ...approvedActivityIds]));
    student.totalActivitiesCompleted = Math.max(Number(student.totalActivitiesCompleted) || 0, approvedSubs.length);

    saveDB(db);
    return {
      studentId,
      updated,
      oldXp: currentXp,
      newXp: student.xp,
      approvedCount: approvedSubs.length,
      talliedXp: approvedXpTotal
    };
  },

  async reconcileClassSubmissions(classId) {
    await wait(DELAY);
    const db = getDB();
    const students = db.students.filter(s => s.classId === classId);
    let updatedCount = 0;
    const details = [];

    for (const student of students) {
      const stSubs = db.submissions.filter(s =>
        s.studentId === student.id ||
        (student.name && s.playerName && s.playerName.trim().toLowerCase() === student.name.trim().toLowerCase())
      );

      const approvedSubs = stSubs.filter(s => s.status === 'approved');
      const approvedXpTotal = approvedSubs.reduce(
        (sum, s) => sum + (Number(s.xp) || (s.isBoss ? 300 : 100)),
        0
      );

      const currentXp = Number(student.xp) || 0;
      let needsUpdate = false;

      if (currentXp < approvedXpTotal) {
        student.xp = approvedXpTotal;
        const { bonusCoins } = calculateLevelAndBonusCoins(currentXp, approvedXpTotal);
        if (bonusCoins > 0) {
          student.coins = (Number(student.coins) || 100) + bonusCoins;
        }
        if (student.guild) {
          student.guildXpContributed = Math.max(Number(student.guildXpContributed) || 0, approvedXpTotal);
        }
        needsUpdate = true;
      }

      const approvedActivityIds = approvedSubs.filter(s => !s.isBoss && s.activityId).map(s => s.activityId);
      const mergedCompleted = Array.from(new Set([...(student.completedActivities || []), ...approvedActivityIds]));
      if (mergedCompleted.length !== (student.completedActivities || []).length) {
        student.completedActivities = mergedCompleted;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updatedCount++;
        details.push({
          studentId: student.id,
          name: student.name,
          oldXp: currentXp,
          newXp: student.xp,
          approvedSubsCount: approvedSubs.length,
          talliedXp: approvedXpTotal
        });
      }
    }

    saveDB(db);
    return { totalStudents: students.length, updatedCount, details };
  },

  async updateTeacherRole(teacherId, newRole) {
    await wait(DELAY);
    const db = getDB();
    const teacher = db.teachers.find(t => t.id === teacherId);
    if (teacher) {
      teacher.role = newRole;
      saveDB(db);
      return true;
    }
    return false;
  },

  async importTemplateActivitiesToClass(classId, activitiesToImport, categoryNames = {}, categorySubtitles = {}, mode = 'merge') {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    if (cls) {
      if (mode === 'overwrite') {
        cls.activities = activitiesToImport;
        cls.categoryNames = categoryNames;
        cls.categorySubtitles = categorySubtitles;
        cls.categoryOrder = activitiesToImport.map(p => p.id);
        saveDB(db);
        return { success: true, activities: activitiesToImport, categoryNames, categorySubtitles };
      }

      let currentActivities = cls.activities || [];
      const updatedActivities = currentActivities.map(path => {
        const matchingImportPath = activitiesToImport.find(p => p.id === path.id);
        if (!matchingImportPath || !matchingImportPath.options) return path;

        const existingOptIds = new Set((path.options || []).map(o => o.id));
        const newOptions = matchingImportPath.options.filter(o => !existingOptIds.has(o.id));

        return {
          ...path,
          options: [...(path.options || []), ...newOptions]
        };
      });

      const existingPathIds = new Set(updatedActivities.map(p => p.id));
      activitiesToImport.forEach(importPath => {
        if (!existingPathIds.has(importPath.id)) {
          updatedActivities.push(importPath);
        }
      });

      cls.activities = updatedActivities;
      cls.categoryNames = { ...(cls.categoryNames || {}), ...categoryNames };
      cls.categorySubtitles = { ...(cls.categorySubtitles || {}), ...categorySubtitles };
      cls.categoryOrder = [...new Set([...(cls.categoryOrder || []), ...updatedActivities.map(p => p.id)])];
      saveDB(db);
      return { success: true, activities: updatedActivities, categoryNames: cls.categoryNames, categorySubtitles: cls.categorySubtitles };
    }
    throw new Error('Class not found');
  },

  // ================= ACTIVITY LIBRARY =================
  async publishActivity(activity, organizationId = null, organizationName = '') {
    await wait(DELAY);
    const db = getDB();
    if (!db.activity_library) {
      db.activity_library = [];
    }
    const currentTeacher = (db.teachers || []).find(t => t.id === 'teacher_mock') || {};
    const orgId = currentTeacher.organizationId || organizationId || null;
    const orgName = currentTeacher.organizationName || organizationName || '';

    const newActivity = {
      title: activity.title || 'Untitled Activity',
      desc: activity.desc || '',
      type: activity.type || 'Low Tech',
      categoryTag: activity.categoryTag || activity.pathTitle || '',
      xp: Number(activity.xp) || 100,
      steps: Array.isArray(activity.steps) ? activity.steps : [{ text: '' }],
      proTip: activity.proTip || '',
      id: 'lib_' + Date.now(),
      authorId: currentTeacher.id || 'teacher_mock',
      authorName: currentTeacher.name || 'Demo Teacher',
      organizationId: orgId,
      organizationName: orgName,
      publishedAt: new Date().toISOString()
    };
    db.activity_library.push(newActivity);
    saveDB(db);
    return newActivity;
  },

  async getPublicActivities(organizationId = null) {
    await wait(DELAY);
    const db = getDB();
    const all = db.activity_library || [];
    const validOrgId = (organizationId && typeof organizationId === 'string' && organizationId.trim() !== '')
      ? organizationId.trim()
      : null;
    if (validOrgId) {
      return all.filter(a => a.organizationId === validOrgId);
    }
    return [];
  },

  async getTeacher(teacherId) {
    await wait(DELAY);
    const db = getDB();
    return (db.teachers || []).find(t => t.id === teacherId) || null;
  },

  async deleteLibraryActivity(activityId) {
    await wait(DELAY);
    const db = getDB();
    if (db.activity_library) {
      db.activity_library = db.activity_library.filter(a => a.id !== activityId);
      saveDB(db);
    }
    return { success: true };
  },

  // ================= GUILD 2.0 (MOCK) =================
  async getGuildLeaderboard(classId) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    const activeGuilds = cls?.guilds && cls.guilds.length > 0 ? cls.guilds : GUILDS;
    const students = (db.students || []).filter(s => s.classId === classId);
    const guildStats = {};

    activeGuilds.forEach(g => {
      guildStats[g.id] = {
        id: g.id,
        name: g.name,
        color: g.color,
        borderColor: g.borderColor || 'border-slate-500',
        gradient: g.gradient || 'from-slate-600 to-slate-700',
        emoji: g.emoji,
        motto: g.motto || '',
        botPictureUrl: g.botPictureUrl || '',
        totalXp: 0,
        memberCount: 0,
        members: [],
        levelInfo: getGuildLevelInfo(0),
        challenges: GUILD_CHALLENGES.map(ch => ({
          ...ch,
          current: 0,
          percent: 0,
          completed: false
        })),
        mvps: { champion: null, flamekeeper: null, collabHero: null }
      };
    });

    students.forEach(s => {
      if (s.guild && guildStats[s.guild]) {
        const g = guildStats[s.guild];
        const contributedXp = s.guildXpContributed || 0;
        g.totalXp += contributedXp;
        g.memberCount += 1;
        g.members.push({
          id: s.id,
          name: s.name,
          xp: contributedXp,
          totalXp: s.xp || 0,
          coins: s.coins || 0,
          currentStreak: s.currentStreak || 0,
          completedActivities: s.completedActivities || [],
          completedBossChallenges: s.completedBossChallenges || [],
          collaborationCount: s.collaborationCount || 0,
          claimedGuildChallenges: s.claimedGuildChallenges || [],
          unlockedAchievements: s.unlockedAchievements || [],
          avatar: s.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' }
        });
      }
    });

    Object.keys(guildStats).forEach(guildId => {
      const g = guildStats[guildId];
      g.levelInfo = getGuildLevelInfo(g.totalXp);
      g.members.sort((a, b) => (b.xp || 0) - (a.xp || 0));

      if (g.members.length > 0) {
        g.mvps.champion = g.members[0];
        const sortedByStreak = [...g.members].sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0));
        if (sortedByStreak[0]?.currentStreak > 0) g.mvps.flamekeeper = sortedByStreak[0];
        const sortedByCollab = [...g.members].sort((a, b) => (b.collaborationCount || 0) - (a.collaborationCount || 0));
        if (sortedByCollab[0]?.collaborationCount > 0) g.mvps.collabHero = sortedByCollab[0];
      }

      g.challenges = GUILD_CHALLENGES.map(ch => {
        let currentVal = 0;
        if (ch.type === 'activities') currentVal = g.members.reduce((acc, m) => acc + (m.completedActivities?.length || 0), 0);
        else if (ch.type === 'streakers') currentVal = g.members.filter(m => (m.currentStreak || 0) >= 3).length;
        else if (ch.type === 'paths') currentVal = g.members.reduce((acc, m) => acc + (m.completedActivities?.length || 0), 0);
        else if (ch.type === 'bosses') currentVal = g.members.reduce((acc, m) => acc + (m.completedBossChallenges?.length || 0), 0);
        else if (ch.type === 'collab') currentVal = g.members.reduce((acc, m) => acc + (m.collaborationCount || 0), 0);

        const target = ch.target || 1;
        return {
          ...ch,
          current: currentVal,
          percent: Math.min(100, Math.round((currentVal / target) * 100)),
          completed: currentVal >= target
        };
      });
    });

    return guildStats;
  },

  async getGuildHall(classId, guildId) {
    await wait(DELAY);
    const db = getDB();
    if (!db.guildHalls) db.guildHalls = {};
    const key = `${classId}_${guildId}`;
    return db.guildHalls[key] || {
      id: guildId,
      trophies: [],
      description: '',
      banner: 'default',
      spiritFlame: 0,
      recentCheers: [],
      notice: null
    };
  },

  async updateGuildHall(classId, guildId, data) {
    await wait(DELAY);
    const db = getDB();
    if (!db.guildHalls) db.guildHalls = {};
    const key = `${classId}_${guildId}`;
    db.guildHalls[key] = {
      ...(db.guildHalls[key] || { id: guildId, trophies: [], description: '', banner: 'default', spiritFlame: 0, recentCheers: [] }),
      ...data,
      updatedAt: new Date().toISOString()
    };
    saveDB(db);
    return true;
  },

  async addGuildHallTrophy(classId, guildId, trophy) {
    await wait(DELAY);
    const hall = await this.getGuildHall(classId, guildId);
    const trophies = [...(hall.trophies || []), { ...trophy, awardedAt: new Date().toISOString() }];
    return this.updateGuildHall(classId, guildId, { trophies });
  },

  async sendGuildCheer(classId, senderId, senderName, receiverId, receiverName, guildId) {
    await wait(DELAY);
    if (!classId || !senderId || !receiverId) throw new Error('Invalid cheer parameters');
    if (senderId === receiverId) throw new Error('Cannot high-five yourself.');

    const db = getDB();
    const cls = (db.classes || []).find(c => c.id === classId);
    const limit = cls?.highFiveLimit || 'daily';

    if (limit === 'disabled') {
      throw new Error('Guild high-fives are currently disabled by your teacher.');
    }

    const sender = (db.students || []).find(s => s.id === senderId);
    const receiver = (db.students || []).find(s => s.id === receiverId);

    if (!sender) throw new Error('Sender student profile not found');
    const highFivesSent = sender.highFivesSent || {};
    const lastSentIso = highFivesSent[receiverId];

    const cooldown = getHighFiveCooldownStatus(lastSentIso, limit);
    if (!cooldown.canCheer) {
      throw new Error(
        cooldown.reason
          ? `High-five cooldown active: ${cooldown.reason}.`
          : `You have already high-fived ${receiverName || 'this teammate'} ${limit === 'weekly' ? 'this week' : 'today'}.`
      );
    }

    const nowIso = new Date().toISOString();
    sender.highFivesSent = {
      ...highFivesSent,
      [receiverId]: nowIso
    };
    sender.lastHighFiveAt = nowIso;
    sender.xp = (sender.xp || 0) + 10;
    sender.guildXpContributed = (sender.guildXpContributed || 0) + 10;

    if (receiver) {
      receiver.xp = (receiver.xp || 0) + 15;
      receiver.guildXpContributed = (receiver.guildXpContributed || 0) + 15;
      receiver.lastHighFiveReceivedAt = nowIso;
    }
    saveDB(db);

    if (guildId) {
      const hall = await this.getGuildHall(classId, guildId);
      const spiritFlame = (hall.spiritFlame || 0) + 1;
      const recentCheers = [
        { senderName, receiverName, timestamp: nowIso },
        ...(hall.recentCheers || []).slice(0, 9)
      ];
      await this.updateGuildHall(classId, guildId, { spiritFlame, recentCheers });
    }
    return { success: true, senderXpEarned: 10, receiverXpEarned: 15, nowIso };
  },

  async claimGuildChallengeReward(classId, studentId, guildId, challengeId, rewardXp, rewardCoins) {
    await wait(DELAY);
    const db = getDB();
    const student = (db.students || []).find(s => s.id === studentId);
    if (student) {
      const claimed = student.claimedGuildChallenges || [];
      if (claimed.includes(challengeId)) return { alreadyClaimed: true };
      student.xp = (student.xp || 0) + (rewardXp || 100);
      student.coins = (student.coins || 0) + (rewardCoins || 50);
      student.guildXpContributed = (student.guildXpContributed || 0) + (rewardXp || 100);
      student.claimedGuildChallenges = [...claimed, challengeId];
      saveDB(db);
      return { success: true, rewardXp, rewardCoins };
    }
    throw new Error('Student not found');
  },

  async assignStudentGuild(studentId, guildId) {
    await wait(DELAY);
    const db = getDB();
    const st = (db.students || []).find(s => s.id === studentId);
    if (st) {
      st.guild = guildId || null;
      saveDB(db);
      return true;
    }
    return false;
  },

  async autoBalanceGuilds(classId, mode = 'unassigned') {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    const activeGuilds = cls?.guilds && cls.guilds.length > 0 ? cls.guilds : GUILDS;
    const students = (db.students || []).filter(s => s.classId === classId);
    const targetStudents = mode === 'all' ? [...students] : students.filter(s => !s.guild);
    if (targetStudents.length === 0) return { updatedCount: 0 };

    const guildCounts = {};
    activeGuilds.forEach(g => {
      guildCounts[g.id] = mode === 'all' ? 0 : students.filter(s => s.guild === g.id).length;
    });

    let updatedCount = 0;
    targetStudents.forEach(student => {
      const targetGuild = Object.keys(guildCounts).reduce((minId, currentId) => {
        return guildCounts[currentId] < guildCounts[minId] ? currentId : minId;
      }, activeGuilds[0].id);

      guildCounts[targetGuild]++;
      student.guild = targetGuild;
      updatedCount++;
    });

    saveDB(db);
    return { updatedCount };
  },

  async rewardGuild(classId, guildId, rewardType, rewardValue) {
    await wait(DELAY);
    const db = getDB();
    const students = (db.students || []).filter(s => s.classId === classId && s.guild === guildId);
    students.forEach(student => {
      if (rewardType === 'xp') {
        student.xp = Math.max(0, (student.xp || 0) + rewardValue);
        student.guildXpContributed = Math.max(0, (student.guildXpContributed || 0) + rewardValue);
      } else if (rewardType === 'coins') {
        student.coins = Math.max(0, (student.coins || 0) + rewardValue);
      } else if (rewardType === 'achievement') {
        const current = student.unlockedAchievements || [];
        if (!current.includes(rewardValue)) student.unlockedAchievements = [...current, rewardValue];
      }
    });
    saveDB(db);
    return students.length;
  },

  async resetGuildMembersXp(classId, guildId, { resetTotalXp = false, resetSpiritFlame = false, xpDeduction = null } = {}) {
    await wait(DELAY);
    const db = getDB();
    const students = (db.students || []).filter(s => s.classId === classId && s.guild === guildId);
    students.forEach(student => {
      if (xpDeduction != null) {
        student.xp = Math.max(0, (student.xp || 0) - xpDeduction);
        student.guildXpContributed = Math.max(0, (student.guildXpContributed || 0) - xpDeduction);
      } else {
        student.guildXpContributed = 0;
        if (resetTotalXp) student.xp = 0;
      }
    });

    if (resetSpiritFlame) {
      await this.updateGuildHall(classId, guildId, { spiritFlame: 0, recentCheers: [] });
    }

    saveDB(db);
    return students.length;
  },

  async updateClassGuilds(classId, guilds) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    if (cls) {
      cls.guilds = guilds;
      saveDB(db);
      return { success: true };
    }
    throw new Error('Class not found');
  },

  async updateGuildBotPicture(classId, guildId, botPictureUrl) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    if (cls) {
      const guilds = cls.guilds && cls.guilds.length > 0 ? [...cls.guilds] : [...GUILDS];
      cls.guilds = guilds.map(g => g.id === guildId ? { ...g, botPictureUrl } : g);
      saveDB(db);
      return { success: true, botPictureUrl };
    }
    throw new Error('Class not found');
  },

  async getStemShopItems(classId) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    return cls?.stemSupplies && cls.stemSupplies.length > 0 ? cls.stemSupplies : DEFAULT_STEM_SUPPLIES;
  },

  async updateStemShopItems(classId, stemSupplies) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    if (cls) {
      cls.stemSupplies = stemSupplies;
      saveDB(db);
      return { success: true };
    }
    throw new Error('Class not found');
  },

  async buyStemSupply(classId, studentId, itemId) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    const student = db.students.find(s => s.id === studentId);
    if (!student) throw new Error("Student not found");
    if (!student.guild) throw new Error("Join a guild before purchasing STEM supplies!");

    const items = cls?.stemSupplies && cls.stemSupplies.length > 0 ? cls.stemSupplies : DEFAULT_STEM_SUPPLIES;
    const item = items.find(i => i.id === itemId);
    if (!item) throw new Error("Item not found");

    if ((student.coins || 0) < item.costCoins) {
      throw new Error(`Not enough coins! You have ${student.coins || 0} coins, but this item costs ${item.costCoins} coins.`);
    }

    student.coins = (student.coins || 0) - item.costCoins;
    if (!db.stem_purchases) db.stem_purchases = [];

    const activeGuilds = cls?.guilds && cls.guilds.length > 0 ? cls.guilds : GUILDS;
    const guildInfo = activeGuilds.find(g => g.id === student.guild);

    const purchase = {
      id: 'pur_' + Date.now(),
      classId,
      studentId,
      studentName: student.name,
      guildId: student.guild,
      guildName: guildInfo?.name || student.guild,
      guildEmoji: guildInfo?.emoji || '🛡️',
      itemId: item.id,
      itemName: item.name,
      tier: item.tier || 1,
      costCoins: item.costCoins,
      icon: item.icon || '⚙️',
      timestamp: new Date().toISOString(),
      fulfilled: false,
      fulfilledAt: null,
    };
    db.stem_purchases.push(purchase);
    saveDB(db);
    return { success: true, purchaseId: purchase.id, newCoins: student.coins, item, purchase };
  },

  async getStemPurchases(classId) {
    await wait(DELAY);
    const db = getDB();
    const purchases = (db.stem_purchases || []).filter(p => p.classId === classId);
    purchases.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return purchases;
  },

  async markStemPurchaseFulfilled(purchaseId, fulfilled = true) {
    await wait(DELAY);
    const db = getDB();
    const p = (db.stem_purchases || []).find(x => x.id === purchaseId);
    if (p) {
      p.fulfilled = fulfilled;
      p.fulfilledAt = fulfilled ? new Date().toISOString() : null;
      saveDB(db);
      return { success: true };
    }
    throw new Error('Purchase not found');
  },

  async deleteStemPurchase(purchaseId) {
    await wait(DELAY);
    const db = getDB();
    db.stem_purchases = (db.stem_purchases || []).filter(x => x.id !== purchaseId);
    saveDB(db);
    return { success: true };
  },

  async getOrgStemPurchases(organizationId) {
    await wait(DELAY);
    const db = getDB();
    return db.stem_purchases || [];
  },

  async setClassCustomBoss(classId, bossData) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    if (cls) {
      cls.customBoss = bossData;
      saveDB(db);
      return { success: true };
    }
    throw new Error('Class not found');
  },

  async clearClassCustomBoss(classId) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.id === classId);
    if (cls) {
      cls.customBoss = null;
      saveDB(db);
      return { success: true };
    }
    throw new Error('Class not found');
  },

  async setOrgWeeklyBoss(organizationId, bossData) {
    await wait(DELAY);
    const db = getDB();
    const org = (db.organizations || []).find(o => o.id === organizationId);
    if (org) {
      org.activeBoss = bossData;
      saveDB(db);
      return { success: true };
    }
    return { success: true };
  },

  async clearOrgWeeklyBoss(organizationId) {
    await wait(DELAY);
    const db = getDB();
    const org = (db.organizations || []).find(o => o.id === organizationId);
    if (org) {
      org.activeBoss = null;
      saveDB(db);
      return { success: true };
    }
    return { success: true };
  },

  async getActiveBoss(classId, organizationId) {
    await wait(DELAY);
    const db = getDB();
    if (classId) {
      const cls = db.classes.find(c => c.id === classId);
      if (cls?.customBoss) return { ...cls.customBoss, source: 'class' };
    }
    if (organizationId) {
      const org = (db.organizations || []).find(o => o.id === organizationId);
      if (org?.activeBoss) return { ...org.activeBoss, source: 'org' };
    }
    const today = new Date();
    const weekOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 604800000);
    return { ...BOSS_CHALLENGES[weekOfYear % BOSS_CHALLENGES.length], source: 'default' };
  }
};
