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
  deleteDoc,
  query,
  where,
  setDoc,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import { auth, db } from "./firebase";

export const realBackend = {
  // ================= TEACHER AUTH =================
  async loginTeacher(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
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

  async createStudent(classId, name, password) {
    try {
      // Check if student exists in this class with this name
      const q = query(
        collection(db, "students"),
        where("classId", "==", classId),
        where("name", "==", name)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) throw new Error("Student already exists");

      const newStudent = {
        classId,
        name,
        password, // In production, hash this!
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

      // Update count
      const classRef = doc(db, "classes", classId);
      const classSnap = await getDoc(classRef);
      if (classSnap.exists()) {
        const count = classSnap.data().studentCount || 0;
        await updateDoc(classRef, { studentCount: count + 1 });
      }

      return { id: docRef.id, ...newStudent };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async loginStudent(classId, studentId, password) {
    try {
      const docRef = doc(db, "students", studentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) throw new Error("Student not found");

      const student = docSnap.data();

      if (student.classId !== classId) throw new Error("Invalid class for this student");

      // Check password (simple string check for now)
      if (student.password && student.password !== password) {
        throw new Error("Incorrect password");
      }

      // Note: If no password set (legacy students), we might allow it or require setting one.
      // For this feature, we assume passwords are set via RosterManager.

      return { id: docSnap.id, ...student, role: 'student' };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async createClass(teacherId, className) {
    try {
      let code;
      let isUnique = false;

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

  async deleteClass(classId) {
    try {
      await deleteDoc(doc(db, "classes", classId));
      return true;
    } catch (error) {
      console.error("Error deleting class:", error);
      throw error;
    }
  },

  async getClassByCode(code) {
    const q = query(collection(db, "classes"), where("code", "==", code));
    const snapshot = await getDocs(q);

    if (snapshot.empty) throw new Error('Class not found');

    const classDoc = snapshot.docs[0];
    const classData = classDoc.data();

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

  async getStudents(classId) {
    try {
      const q = query(collection(db, "students"), where("classId", "==", classId));
      const querySnapshot = await getDocs(q);
      const students = [];
      querySnapshot.forEach((doc) => {
        students.push({ id: doc.id, ...doc.data() });
      });
      return students;
    } catch (error) {
      console.error("Error getting students:", error);
      return [];
    }
  },

  // ================= ACTIVITIES =================
  async saveClassActivities(classId, activities) {
    try {
      await updateDoc(doc(db, "classes", classId), { activities });
      return true;
    } catch (error) {
      console.error("Error saving activities:", error);
      throw error;
    }
  },

  async getClassActivities(classId) {
    try {
      const docSnap = await getDoc(doc(db, "classes", classId));
      if (docSnap.exists() && docSnap.data().activities) {
        return docSnap.data().activities;
      }
      return null;
    } catch (error) {
      console.error("Error fetching activities:", error);
      return null;
    }
  },

  // ================= ACTIVITY LIBRARY =================
  async publishActivity(activity) {
    try {
      // Get current user to add as author
      const user = auth.currentUser;
      if (!user) throw new Error("Must be logged in to publish");

      const newActivity = {
        ...activity,
        authorId: user.uid,
        authorName: user.displayName || "Unknown Teacher",
        publishedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "activity_library"), newActivity);
      return { id: docRef.id, ...newActivity };
    } catch (error) {
      console.error("Error publishing activity:", error);
      throw error;
    }
  },

  async getPublicActivities() {
    try {
      const q = query(collection(db, "activity_library"));
      const querySnapshot = await getDocs(q);
      const activities = [];
      querySnapshot.forEach((doc) => {
        activities.push({ id: doc.id, ...doc.data() });
      });
      return activities;
    } catch (error) {
      console.error("Error fetching library activities:", error);
      return [];
    }
  },

  // ================= STUDENT AUTH =================
  async joinClass(classCode, username) {
    // Deprecated legacy join (creates student on fly)
    // We keep this for backward compatibility if needed,
    // OR we change this to just "Get Class Info" for the new flow.
    // The new flow uses `getClassByCode` then `loginStudent`.
    return this.getClassByCode(classCode);
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

  subscribeToSubmissions(classId, callback) {
    const q = query(collection(db, "submissions"), where("classId", "==", classId));
    return onSnapshot(q, (querySnapshot) => {
      const submissions = [];
      querySnapshot.forEach((doc) => {
        submissions.push({ id: doc.id, ...doc.data() });
      });
      callback(submissions);
    });
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
