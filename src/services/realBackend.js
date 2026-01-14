import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "./firebase";

export const realBackend = {
  // ================= TEACHER AUTH =================
  async loginTeacher(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch extra teacher details if needed (like name)
      // We assume teacher data is stored in a 'teachers' collection
      // However, for simplicity, we can just return the auth user with a role
      // But let's try to get the name from the profile or a doc

      return {
        id: user.uid,
        email: user.email,
        name: user.displayName || email.split('@')[0],
        role: 'teacher'
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async registerTeacher(name, email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // Create a teacher document (optional, but good for data relationships)
      await setDoc(doc(db, "teachers", user.uid), {
        name,
        email,
        createdAt: serverTimestamp()
      });

      return {
        id: user.uid,
        email: user.email,
        name: name,
        role: 'teacher'
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // ================= CLASS MANAGEMENT =================
  async getClasses(teacherId) {
    try {
      const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));
      const querySnapshot = await getDocs(q);
      const classes = [];
      querySnapshot.forEach((doc) => {
        classes.push({ id: doc.id, ...doc.data() });
      });
      return classes;
    } catch (error) {
      console.error("Error getting classes: ", error);
      return [];
    }
  },

  async createClass(teacherId, className) {
    try {
      // Generate a simple 6-char code
      let code;
      let isUnique = false;

      // Simple loop to ensure uniqueness (collision rare but possible)
      // In production, maybe use a Cloud Function or better ID gen
      while (!isUnique) {
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const q = query(collection(db, "classes"), where("code", "==", code));
        const snapshot = await getDocs(q);
        if (snapshot.empty) isUnique = true;
      }

      const newClass = {
        teacherId,
        name: className,
        code,
        studentCount: 0,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "classes"), newClass);
      return { id: docRef.id, ...newClass };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getClassByCode(code) {
    const q = query(collection(db, "classes"), where("code", "==", code));
    const snapshot = await getDocs(q);

    if (snapshot.empty) throw new Error('Class not found');

    const classDoc = snapshot.docs[0];
    const classData = classDoc.data();

    // Fetch teacher name
    // Optimization: Store teacherName on class doc, but for now fetch it
    // Actually, we can just return 'Teacher' if we don't want extra reads
    // Or fetch the teacher doc
    let teacherName = "Unknown";
    try {
      const teacherDoc = await getDoc(doc(db, "teachers", classData.teacherId));
      if (teacherDoc.exists()) {
        teacherName = teacherDoc.data().name;
      }
    } catch (e) {
      console.log("Could not fetch teacher details", e);
    }

    return { id: classDoc.id, ...classData, teacherName };
  },

  // ================= STUDENT AUTH =================
  async joinClass(classCode, username) {
    try {
      // 1. Find the class
      const qClass = query(collection(db, "classes"), where("code", "==", classCode));
      const classSnapshot = await getDocs(qClass);

      if (classSnapshot.empty) throw new Error('Invalid class code');

      const classDoc = classSnapshot.docs[0];
      const classId = classDoc.id;
      const classData = classDoc.data();

      // 2. Check if student exists in this class
      const qStudent = query(
        collection(db, "students"),
        where("classId", "==", classId),
        where("name", "==", username) // Case sensitive usually, ideally normalize
      );

      const studentSnapshot = await getDocs(qStudent);

      let student;

      if (!studentSnapshot.empty) {
        // Existing student
        const studentDoc = studentSnapshot.docs[0];
        student = { id: studentDoc.id, ...studentDoc.data() };
      } else {
        // Create new student
        const newStudent = {
          classId,
          name: username,
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
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, "students"), newStudent);
        student = { id: docRef.id, ...newStudent };

        // Increment student count
        // Note: This is unsafe without transactions if high concurrency, but fine for this scale
        const currentCount = classData.studentCount || 0;
        await updateDoc(doc(db, "classes", classId), { studentCount: currentCount + 1 });
      }

      return { ...student, role: 'student', className: classData.name };

    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getStudent(studentId) {
    try {
      const docRef = doc(db, "students", studentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("Error getting student:", error);
      return null;
    }
  },

  async updateStudent(studentId, updates) {
    try {
      const docRef = doc(db, "students", studentId);
      await updateDoc(docRef, updates);
      return { id: studentId, ...updates };
    } catch (error) {
      console.error("Error updating student:", error);
      return null;
    }
  },

  // ================= SUBMISSIONS =================
  async getSubmissions(classId) {
    try {
      const q = query(collection(db, "submissions"), where("classId", "==", classId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting submissions:", error);
      return [];
    }
  },

  async getStudentSubmissions(studentId) {
    try {
      const q = query(collection(db, "submissions"), where("studentId", "==", studentId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting student submissions:", error);
      return [];
    }
  },

  async createSubmission(studentId, classId, submissionData) {
    try {
      const newSubmission = {
        studentId,
        classId,
        ...submissionData,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        teacherFeedback: ''
      };

      const docRef = await addDoc(collection(db, "submissions"), newSubmission);
      return { id: docRef.id, ...newSubmission };
    } catch (error) {
      console.error("Error creating submission:", error);
      throw error;
    }
  },

  async reviewSubmission(submissionId, status, feedback) {
    try {
      const docRef = doc(db, "submissions", submissionId);
      await updateDoc(docRef, {
        status,
        teacherFeedback: feedback,
        reviewedAt: new Date().toISOString()
      });
      return { id: submissionId, status, teacherFeedback: feedback };
    } catch (error) {
      console.error("Error reviewing submission:", error);
      throw error;
    }
  }
};
