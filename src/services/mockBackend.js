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
    submissions: []
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
    const teacher = db.teachers.find(t => t.email === email && t.password === password); // In real app, hash password!
    if (!teacher) throw new Error('Invalid credentials');
    return { ...teacher, role: 'teacher' };
  },

  async registerTeacher(name, email, password) {
    await wait(DELAY);
    const db = getDB();
    if (db.teachers.find(t => t.email === email)) throw new Error('Email already exists');

    const newTeacher = {
      id: 't_' + Date.now(),
      name,
      email,
      password, // In real app, hash password!
    };

    db.teachers.push(newTeacher);
    saveDB(db);
    return { ...newTeacher, role: 'teacher' };
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

  async getClassByCode(code) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.code === code);
    if (!cls) throw new Error('Class not found');
    const teacher = db.teachers.find(t => t.id === cls.teacherId);
    return { ...cls, teacherName: teacher ? teacher.name : 'Unknown' };
  },

  // ================= STUDENT AUTH =================
  async joinClass(classCode, username) {
    await wait(DELAY);
    const db = getDB();
    const cls = db.classes.find(c => c.code === classCode);
    if (!cls) throw new Error('Invalid class code');

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
        pathCompletions: { path1: 0, path2: 0, path3: 0 },
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
      return db.submissions.filter(s => s.studentId === studentId);
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
      db.submissions[index] = {
        ...db.submissions[index],
        status,
        teacherFeedback: feedback,
        reviewedAt: new Date().toISOString()
      };
      saveDB(db);
      return db.submissions[index];
    }
    throw new Error('Submission not found');
  }
};
