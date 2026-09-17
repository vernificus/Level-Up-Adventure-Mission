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
import { GUILDS, DEFAULT_10_GUILDS, DEFAULT_STEM_SUPPLIES, GUILD_LEVELS, GUILD_CHALLENGES, BOSS_CHALLENGES, getGuildLevelInfo } from "../data/gameData";

export const realBackend = {
  // ================= TEACHER AUTH =================
  async loginTeacher(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      let role = 'teacher';
      let organizationId = null;
      let organizationName = '';

      if (user.email?.toLowerCase() === 'matthew.harbert@lcps.org') {
        role = 'admin';
      }

      try {
        const docSnap = await getDoc(doc(db, "teachers", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.role) role = data.role;
          if (data.organizationId) organizationId = data.organizationId;
          if (data.organizationName) organizationName = data.organizationName;
        }

        // Always ensure matthew.harbert@lcps.org has admin role persisted in Firestore
        if (user.email?.toLowerCase() === 'matthew.harbert@lcps.org') {
          role = 'admin';
          await setDoc(doc(db, "teachers", user.uid), {
            name: user.displayName || 'Matthew Harbert',
            email: user.email,
            role: 'admin',
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (e) {
        console.error("Error fetching teacher profile:", e);
      }

      return {
        id: user.uid,
        email: user.email,
        name: user.displayName || email.split('@')[0],
        role,
        organizationId,
        organizationName
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async registerTeacher(name, email, password, organizationId = null, organizationName = '') {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      const isDefaultAdmin = email.toLowerCase() === 'matthew.harbert@lcps.org';
      const assignedRole = isDefaultAdmin ? 'admin' : 'teacher';

      const teacherData = {
        name,
        email,
        role: assignedRole,
        organizationId: organizationId || null,
        organizationName: organizationName || '',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, "teachers", user.uid), teacherData);

      // Increment teacher count on organization if linked
      if (organizationId) {
        try {
          const orgRef = doc(db, "organizations", organizationId);
          const orgSnap = await getDoc(orgRef);
          if (orgSnap.exists()) {
            const count = orgSnap.data().teacherCount || 0;
            await updateDoc(orgRef, { teacherCount: count + 1 });
          }
        } catch (e) {
          console.error("Error updating org teacher count:", e);
        }
      }

      return {
        id: user.uid,
        email: user.email,
        name: name,
        role: 'teacher',
        organizationId,
        organizationName
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // ================= CLASS MANAGEMENT =================
  async getClasses(teacherId) {
    try {
      // Get classes owned by this teacher
      const ownedQuery = query(collection(db, "classes"), where("teacherId", "==", teacherId));
      const ownedSnapshot = await getDocs(ownedQuery);
      const classes = [];
      ownedSnapshot.forEach((d) => {
        classes.push({ id: d.id, ...d.data() });
      });

      // Get classes where this teacher is a co-teacher
      const coQuery = query(collection(db, "classes"), where("coTeacherIds", "array-contains", teacherId));
      const coSnapshot = await getDocs(coQuery);
      coSnapshot.forEach((d) => {
        // Avoid duplicates
        if (!classes.find(c => c.id === d.id)) {
          classes.push({ id: d.id, ...d.data(), isCoTeacher: true });
        }
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
        pathCompletions: {},
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

  async createClass(teacherId, className, organizationId = null) {
    try {
      let code;
      let isUnique = false;

      while (!isUnique) {
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const q = query(collection(db, "classes"), where("code", "==", code));
        const snapshot = await getDocs(q);
        if (snapshot.empty) isUnique = true;
      }

      let orgId = organizationId;
      if (!orgId) {
        try {
          const tDoc = await getDoc(doc(db, "teachers", teacherId));
          if (tDoc.exists() && tDoc.data().organizationId) {
            orgId = tDoc.data().organizationId;
          }
        } catch (e) {
          console.error("Could not fetch teacher org for class:", e);
        }
      }

      let defaultActivities = null;
      let defaultCatNames = null;
      let defaultCatSubtitles = null;

      // Default to the FIRST template created in that organization if available
      if (orgId) {
        try {
          const templates = await this.getOrgTemplates(orgId);
          if (templates && templates.length > 0) {
            const firstTemplate = templates[0];
            defaultActivities = firstTemplate.activities || null;
            defaultCatNames = firstTemplate.categoryNames || null;
            defaultCatSubtitles = firstTemplate.categorySubtitles || null;
          }
        } catch (e) {
          console.error("Could not fetch org templates for default class setup:", e);
        }
      }

      const newClass = {
        teacherId,
        organizationId: orgId || null,
        name: className,
        code,
        studentCount: 0,
        activities: defaultActivities,
        categoryNames: defaultCatNames,
        categorySubtitles: defaultCatSubtitles,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "classes"), newClass);

      if (orgId) {
        try {
          const orgRef = doc(db, "organizations", orgId);
          const orgSnap = await getDoc(orgRef);
          if (orgSnap.exists()) {
            const count = orgSnap.data().classCount || 0;
            await updateDoc(orgRef, { classCount: count + 1 });
          }
        } catch (e) {
          console.error("Error updating org class count:", e);
        }
      }

      return { id: docRef.id, ...newClass };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getClass(classId) {
    try {
      const docSnap = await getDoc(doc(db, "classes", classId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("Error getting class:", error);
      return null;
    }
  },

  async updateClass(classId, updates) {
    try {
      const classRef = doc(db, "classes", classId);
      await updateDoc(classRef, updates);
      return { id: classId, ...updates };
    } catch (error) {
      console.error("Error updating class:", error);
      throw error;
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
    if (!classId || typeof classId !== 'string') {
      throw new Error("A valid Class ID is required to save activities.");
    }
    try {
      const sanitizedActivities = (activities || []).map(path => ({
        id: path.id || '',
        title: path.title || '',
        subtitle: path.subtitle || '',
        icon: path.icon || 'BookOpen',
        color: path.color || 'bg-blue-600',
        options: (path.options || []).map(opt => {
          const cleanOpt = {
            id: opt.id || `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: opt.title || 'Untitled Activity',
            desc: opt.desc || '',
            type: opt.type || 'Low Tech',
            xp: typeof opt.xp === 'number' ? opt.xp : (parseInt(opt.xp) || 100),
            steps: Array.isArray(opt.steps)
              ? opt.steps.map(s => {
                  if (typeof s === 'string') return { text: s };
                  const cleanStep = { text: s?.text || '' };
                  if (s?.link) cleanStep.link = s.link;
                  if (s?.linkText) cleanStep.linkText = s.linkText;
                  return cleanStep;
                })
              : [{ text: '' }],
            proTip: opt.proTip || ''
          };
          if (opt.categoryTag) cleanOpt.categoryTag = opt.categoryTag;
          return cleanOpt;
        })
      }));
      await updateDoc(doc(db, "classes", classId), { activities: sanitizedActivities });
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
  async publishActivity(activity, organizationId = null, organizationName = '') {
    try {
      // Get current user to add as author
      const user = auth.currentUser;
      if (!user) throw new Error("Must be logged in to publish activities to the library");

      // Check the user list ('teachers' collection) for the user's assigned organization
      let userOrgId = null;
      let userOrgName = '';
      let isUserAdmin = false;

      try {
        const teacherDoc = await getDoc(doc(db, "teachers", user.uid));
        if (teacherDoc.exists()) {
          const tData = teacherDoc.data();
          userOrgId = tData.organizationId || null;
          userOrgName = tData.organizationName || '';
          isUserAdmin = tData.role === 'admin';
        }
      } catch (e) {
        console.warn("Could not load user profile from teachers collection:", e);
      }

      // Default to the organization the user is assigned to in the user list!
      let orgId = userOrgId;
      let orgName = userOrgName;

      // If user has no assigned organization (e.g. unassigned admin), fall back to passed org
      if (!orgId && isUserAdmin && organizationId && typeof organizationId === 'string' && organizationId.trim() !== '') {
        orgId = organizationId.trim();
        orgName = organizationName || '';
      }

      if (orgId && !orgName) {
        try {
          const orgDoc = await getDoc(doc(db, "organizations", orgId));
          if (orgDoc.exists()) {
            orgName = orgDoc.data().name || '';
          }
        } catch (e) {
          // ignore lookup error
        }
      }

      if (!orgId) {
        throw new Error("Cannot publish activity: Your account is not assigned to an organization in the user list.");
      }

      // Sanitize fields to ensure Firestore compatibility (no undefined properties)
      const newActivity = {
        title: activity.title || "Untitled Activity",
        desc: activity.desc || "",
        type: activity.type || "Low Tech",
        categoryTag: activity.categoryTag || activity.pathTitle || "",
        xp: Number(activity.xp) || 100,
        steps: Array.isArray(activity.steps)
          ? activity.steps.map(s => {
              if (typeof s === 'string') return { text: s };
              const cleanStep = { text: s?.text || '' };
              if (s?.link) cleanStep.link = s.link;
              if (s?.linkText) cleanStep.linkText = s.linkText;
              return cleanStep;
            })
          : [{ text: '' }],
        proTip: activity.proTip || "",
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || "Teacher",
        organizationId: orgId,
        organizationName: orgName,
        publishedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "activity_library"), newActivity);
      return { id: docRef.id, ...newActivity };
    } catch (error) {
      console.error("Error publishing activity:", error);
      throw error;
    }
  },

  async getPublicActivities(organizationId = null) {
    try {
      const user = auth.currentUser;
      let userOrgId = null;
      let isUserAdmin = false;

      if (user) {
        try {
          const teacherDoc = await getDoc(doc(db, "teachers", user.uid));
          if (teacherDoc.exists()) {
            const tData = teacherDoc.data();
            userOrgId = tData.organizationId || null;
            isUserAdmin = tData.role === 'admin';
          }
        } catch (e) {
          console.warn("Could not load user profile in getPublicActivities:", e);
        }
        if (user.email && user.email.toLowerCase() === 'matthew.harbert@lcps.org') {
          isUserAdmin = true;
        }
      }

      // Target organization determination:
      let targetOrgId = null;
      if (organizationId && typeof organizationId === 'string' && organizationId.trim() !== '') {
        targetOrgId = organizationId.trim();
      } else if (!isUserAdmin) {
        // Non-admin teachers can ONLY see activities for their assigned organization
        targetOrgId = userOrgId;
      } else {
        targetOrgId = userOrgId;
      }

      // If no valid organization is resolved, return empty list (activities are strictly private to organizations)
      if (!targetOrgId) {
        return [];
      }

      const q = query(collection(db, "activity_library"), where("organizationId", "==", targetOrgId));
      const querySnapshot = await getDocs(q);
      const activities = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        activities.push({
          id: docSnap.id,
          title: data.title || "Untitled Activity",
          desc: data.desc || "",
          type: data.type || "Low Tech",
          categoryTag: data.categoryTag || "",
          xp: typeof data.xp === 'number' ? data.xp : 100,
          steps: Array.isArray(data.steps) ? data.steps : [{ text: '' }],
          proTip: data.proTip || "",
          authorName: data.authorName || "Teacher",
          authorId: data.authorId || "",
          organizationId: data.organizationId || null,
          organizationName: data.organizationName || "",
          publishedAt: data.publishedAt || null
        });
      });
      return activities;
    } catch (error) {
      console.error("Error fetching library activities:", error);
      return [];
    }
  },

  async deleteLibraryActivity(activityId) {
    try {
      await deleteDoc(doc(db, "activity_library", activityId));
      return { success: true };
    } catch (error) {
      console.error("Error deleting library activity:", error);
      throw error;
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

  async deleteStudent(studentId, classId) {
    try {
      await deleteDoc(doc(db, "students", studentId));

      // Update count
      if (classId) {
        const classRef = doc(db, "classes", classId);
        const classSnap = await getDoc(classRef);
        if (classSnap.exists()) {
          const count = classSnap.data().studentCount || 0;
          await updateDoc(classRef, { studentCount: Math.max(0, count - 1) });
        }
      }
      return true;
    } catch (error) {
      console.error("Error deleting student:", error);
      throw error;
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
  },

  // ================= ACTIVITY RESET =================
  async resetStudentActivities(studentId) {
    try {
      const docRef = doc(db, "students", studentId);
      await updateDoc(docRef, {
        completedActivities: [],
        lastActivityReset: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error("Error resetting student activities:", error);
      throw error;
    }
  },

  async resetClassActivities(classId) {
    try {
      const q = query(collection(db, "students"), where("classId", "==", classId));
      const querySnapshot = await getDocs(q);
      const updates = [];
      querySnapshot.forEach((studentDoc) => {
        updates.push(updateDoc(doc(db, "students", studentDoc.id), {
          completedActivities: [],
          lastActivityReset: new Date().toISOString()
        }));
      });
      await Promise.all(updates);
      return querySnapshot.size;
    } catch (error) {
      console.error("Error resetting class activities:", error);
      throw error;
    }
  },

  // ================= CO-TEACHER MANAGEMENT =================
  async addCoTeacher(classId, email) {
    try {
      // Look up teacher by email
      const q = query(collection(db, "teachers"), where("email", "==", email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error("No teacher found with that email. They must create an account first.");
      }

      const coTeacherDoc = snapshot.docs[0];
      const coTeacherId = coTeacherDoc.id;

      // Get the class to check ownership and existing co-teachers
      const classRef = doc(db, "classes", classId);
      const classSnap = await getDoc(classRef);
      if (!classSnap.exists()) throw new Error("Class not found");

      const classData = classSnap.data();

      if (classData.teacherId === coTeacherId) {
        throw new Error("That teacher already owns this class.");
      }

      const existing = classData.coTeacherIds || [];
      if (existing.includes(coTeacherId)) {
        throw new Error("That teacher is already a co-teacher for this class.");
      }

      await updateDoc(classRef, {
        coTeacherIds: [...existing, coTeacherId]
      });

      return { id: coTeacherDoc.id, name: coTeacherDoc.data().name, email: coTeacherDoc.data().email };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async removeCoTeacher(classId, coTeacherId) {
    try {
      const classRef = doc(db, "classes", classId);
      const classSnap = await getDoc(classRef);
      if (!classSnap.exists()) throw new Error("Class not found");

      const classData = classSnap.data();
      const updated = (classData.coTeacherIds || []).filter(id => id !== coTeacherId);

      await updateDoc(classRef, { coTeacherIds: updated });
      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getCoTeachers(classId) {
    try {
      const classRef = doc(db, "classes", classId);
      const classSnap = await getDoc(classRef);
      if (!classSnap.exists()) return [];

      const coTeacherIds = classSnap.data().coTeacherIds || [];
      const coTeachers = [];

      for (const id of coTeacherIds) {
        const teacherSnap = await getDoc(doc(db, "teachers", id));
        if (teacherSnap.exists()) {
          coTeachers.push({ id: teacherSnap.id, ...teacherSnap.data() });
        }
      }

      return coTeachers;
    } catch (error) {
      console.error("Error getting co-teachers:", error);
      return [];
    }
  },

  // ================= STUDENT SELF-SIGNUP =================
  async studentSelfSignup(classId, name, password) {
    // Same as createStudent but intended for the student-facing signup flow
    return this.createStudent(classId, name, password);
  },

  // ================= LEADERBOARD =================
  async getClassLeaderboard(classId) {
    try {
      const students = await this.getStudents(classId);
      return students
        .map(s => ({
          id: s.id,
          name: s.name,
          xp: s.xp || 0,
          avatar: s.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' },
          unlockedAchievements: s.unlockedAchievements || [],
          guild: s.guild || null,
          guildXpContributed: s.guildXpContributed || 0,
          totalActivitiesCompleted: s.totalActivitiesCompleted || 0,
          currentStreak: s.currentStreak || 0,
        }))
        .sort((a, b) => b.xp - a.xp);
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return [];
    }
  },

  // ================= STUDENT SPOTLIGHT =================
  async setStudentSpotlight(classId, spotlightData) {
    try {
      const classRef = doc(db, "classes", classId);
      await updateDoc(classRef, { spotlight: spotlightData });
      return true;
    } catch (error) {
      console.error("Error setting spotlight:", error);
      throw error;
    }
  },

  async clearStudentSpotlight(classId) {
    try {
      const classRef = doc(db, "classes", classId);
      await updateDoc(classRef, { spotlight: null });
      return true;
    } catch (error) {
      console.error("Error clearing spotlight:", error);
      throw error;
    }
  },

  // ================= GUILD SYSTEM 2.0 =================
  async getGuildLeaderboard(classId) {
    try {
      const classDoc = await this.getClass(classId);
      const activeGuilds = classDoc?.guilds && classDoc.guilds.length > 0 ? classDoc.guilds : GUILDS;
      const students = await this.getStudents(classId);
      const guildStats = {};

      // Initialize all active guilds (supports up to 10 customizable guilds)
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
          mvps: {
            champion: null,
            flamekeeper: null,
            collabHero: null
          }
        };
      });

      // Distribute students to guilds and compute statistics
      students.forEach(s => {
        if (s.guild && guildStats[s.guild]) {
          const g = guildStats[s.guild];
          const contributedXp = s.guildXpContributed || 0;
          g.totalXp += contributedXp;
          g.memberCount += 1;

          const memberObj = {
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
            avatar: s.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' },
          };
          g.members.push(memberObj);
        }
      });

      // Compute level info, MVPs, and live guild challenge progress for each guild
      Object.keys(guildStats).forEach(guildId => {
        const g = guildStats[guildId];
        g.levelInfo = getGuildLevelInfo(g.totalXp);

        // Sort members by contributed XP descending
        g.members.sort((a, b) => (b.xp || 0) - (a.xp || 0));

        if (g.members.length > 0) {
          // Champion (highest contributed XP)
          g.mvps.champion = g.members[0];

          // Flamekeeper (highest streak)
          const sortedByStreak = [...g.members].sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0));
          if (sortedByStreak[0]?.currentStreak > 0) {
            g.mvps.flamekeeper = sortedByStreak[0];
          }

          // Collaboration Hero
          const sortedByCollab = [...g.members].sort((a, b) => (b.collaborationCount || 0) - (a.collaborationCount || 0));
          if (sortedByCollab[0]?.collaborationCount > 0) {
            g.mvps.collabHero = sortedByCollab[0];
          }
        }

        // Compute live challenge progress across all guild members
        g.challenges = GUILD_CHALLENGES.map(ch => {
          let currentVal = 0;
          if (ch.type === 'activities') {
            currentVal = g.members.reduce((acc, m) => acc + (m.completedActivities?.length || 0), 0);
          } else if (ch.type === 'streakers') {
            currentVal = g.members.filter(m => (m.currentStreak || 0) >= 3).length;
          } else if (ch.type === 'paths') {
            // Count unique activities across paths
            currentVal = g.members.reduce((acc, m) => acc + (m.completedActivities?.length || 0), 0);
          } else if (ch.type === 'bosses') {
            currentVal = g.members.reduce((acc, m) => acc + (m.completedBossChallenges?.length || 0), 0);
          } else if (ch.type === 'collab') {
            currentVal = g.members.reduce((acc, m) => acc + (m.collaborationCount || 0), 0);
          }

          const target = ch.target || 1;
          const percent = Math.min(100, Math.round((currentVal / target) * 100));
          const completed = currentVal >= target;

          return {
            ...ch,
            current: currentVal,
            percent,
            completed
          };
        });
      });

      return guildStats;
    } catch (error) {
      console.error("Error getting guild leaderboard:", error);
      return {};
    }
  },

  // ================= SEND GUILD CHEER / HIGH FIVE =================
  async sendGuildCheer(classId, senderId, senderName, receiverId, receiverName, guildId) {
    try {
      if (!classId || !senderId || !receiverId) throw new Error('Invalid cheer parameters');

      // 1. Grant sender +10 XP and receiver +15 XP
      const senderRef = doc(db, "students", senderId);
      const receiverRef = doc(db, "students", receiverId);

      const [senderDoc, receiverDoc] = await Promise.all([
        getDoc(senderRef),
        getDoc(receiverRef)
      ]);

      if (senderDoc.exists()) {
        const sData = senderDoc.data();
        await updateDoc(senderRef, {
          xp: (sData.xp || 0) + 10,
          guildXpContributed: (sData.guildXpContributed || 0) + 10
        });
      }

      if (receiverDoc.exists()) {
        const rData = receiverDoc.data();
        await updateDoc(receiverRef, {
          xp: (rData.xp || 0) + 15,
          guildXpContributed: (rData.guildXpContributed || 0) + 15
        });
      }

      // 2. Update Guild Hall spirit flame and cheer log
      if (guildId) {
        const hall = await this.getGuildHall(classId, guildId);
        const cheers = (hall.spiritFlame || 0) + 1;
        const recentCheers = [
          {
            senderName,
            receiverName,
            timestamp: new Date().toISOString()
          },
          ...(hall.recentCheers || []).slice(0, 9)
        ];

        await this.updateGuildHall(classId, guildId, {
          spiritFlame: cheers,
          recentCheers
        });
      }

      return { success: true, senderXpEarned: 10, receiverXpEarned: 15 };
    } catch (error) {
      console.error("Error sending guild cheer:", error);
      throw error;
    }
  },

  // ================= CLAIM GUILD CHALLENGE REWARD =================
  async claimGuildChallengeReward(classId, studentId, guildId, challengeId, rewardXp, rewardCoins) {
    try {
      const studentRef = doc(db, "students", studentId);
      const studentDoc = await getDoc(studentRef);
      if (!studentDoc.exists()) throw new Error('Student not found');

      const sData = studentDoc.data();
      const claimed = sData.claimedGuildChallenges || [];
      if (claimed.includes(challengeId)) {
        return { alreadyClaimed: true };
      }

      const updates = {
        xp: (sData.xp || 0) + (rewardXp || 100),
        coins: (sData.coins || 0) + (rewardCoins || 50),
        guildXpContributed: (sData.guildXpContributed || 0) + (rewardXp || 100),
        claimedGuildChallenges: [...claimed, challengeId]
      };

      await updateDoc(studentRef, updates);
      return { success: true, rewardXp, rewardCoins };
    } catch (error) {
      console.error("Error claiming guild reward:", error);
      throw error;
    }
  },

  // ================= AUTO-BALANCE GUILDS (TEACHER) =================
  async autoBalanceGuilds(classId, mode = 'unassigned') {
    try {
      const classDoc = await this.getClass(classId);
      const activeGuilds = classDoc?.guilds && classDoc.guilds.length > 0 ? classDoc.guilds : GUILDS;
      const students = await this.getStudents(classId);
      if (!students || students.length === 0) return { updatedCount: 0 };

      const targetStudents = mode === 'all'
        ? [...students]
        : students.filter(s => !s.guild);

      if (targetStudents.length === 0) return { updatedCount: 0 };

      // Shuffle students randomly for fair distribution
      for (let i = targetStudents.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targetStudents[i], targetStudents[j]] = [targetStudents[j], targetStudents[i]];
      }

      // Count current members per guild if balancing unassigned
      const guildCounts = {};
      activeGuilds.forEach(g => {
        guildCounts[g.id] = mode === 'all' ? 0 : students.filter(s => s.guild === g.id).length;
      });

      let updatedCount = 0;
      for (const student of targetStudents) {
        // Find guild with smallest count
        const targetGuild = Object.keys(guildCounts).reduce((minId, currentId) => {
          return guildCounts[currentId] < guildCounts[minId] ? currentId : minId;
        }, activeGuilds[0].id);

        guildCounts[targetGuild]++;
        await updateDoc(doc(db, "students", student.id), { guild: targetGuild });
        updatedCount++;
      }

      return { updatedCount };
    } catch (error) {
      console.error("Error auto-balancing guilds:", error);
      throw error;
    }
  },

  // ================= GUILD REWARDS (TEACHER) =================
  async rewardGuild(classId, guildId, rewardType, rewardValue) {
    try {
      const students = await this.getStudents(classId);
      const guildMembers = students.filter(s => s.guild === guildId);
      if (guildMembers.length === 0) throw new Error('No members in this guild');

      for (const student of guildMembers) {
        const updates = {};
        if (rewardType === 'xp') {
          updates.xp = (student.xp || 0) + rewardValue;
          updates.guildXpContributed = (student.guildXpContributed || 0) + rewardValue;
        } else if (rewardType === 'coins') {
          updates.coins = (student.coins || 0) + rewardValue;
        } else if (rewardType === 'achievement') {
          const current = student.unlockedAchievements || [];
          if (!current.includes(rewardValue)) {
            updates.unlockedAchievements = [...current, rewardValue];
          }
        }
        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, "students", student.id), updates);
        }
      }
      return guildMembers.length;
    } catch (error) {
      console.error("Error rewarding guild:", error);
      throw error;
    }
  },

  // ================= GUILD HALL =================
  async getGuildHall(classId, guildId) {
    try {
      const hallDoc = await getDoc(doc(db, "classes", classId, "guildHalls", guildId));
      if (hallDoc.exists()) {
        return { id: hallDoc.id, ...hallDoc.data() };
      }
      return {
        id: guildId,
        trophies: [],
        description: '',
        banner: 'default',
        spiritFlame: 0,
        recentCheers: [],
        notice: null
      };
    } catch (error) {
      console.error("Error getting guild hall:", error);
      return {
        id: guildId,
        trophies: [],
        description: '',
        banner: 'default',
        spiritFlame: 0,
        recentCheers: [],
        notice: null
      };
    }
  },

  async updateGuildHall(classId, guildId, data) {
    try {
      await setDoc(doc(db, "classes", classId, "guildHalls", guildId), {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error("Error updating guild hall:", error);
      throw error;
    }
  },

  async addGuildHallTrophy(classId, guildId, trophy) {
    try {
      const hall = await this.getGuildHall(classId, guildId);
      const trophies = [...(hall.trophies || []), { ...trophy, awardedAt: new Date().toISOString() }];
      await this.updateGuildHall(classId, guildId, { trophies });
      return true;
    } catch (error) {
      console.error("Error adding guild hall trophy:", error);
      throw error;
    }
  },

  // ================= CUSTOM REWARDS (TEACHER-CREATED SHOP ITEMS) =================
  async getCustomRewards(classId) {
    try {
      const q = query(collection(db, "classes", classId, "customRewards"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Error getting custom rewards:", error);
      return [];
    }
  },

  async createCustomReward(classId, rewardData) {
    try {
      const docRef = await addDoc(collection(db, "classes", classId, "customRewards"), {
        ...rewardData,
        active: true,
        createdAt: serverTimestamp(),
      });
      return { id: docRef.id, ...rewardData, active: true };
    } catch (error) {
      console.error("Error creating custom reward:", error);
      throw error;
    }
  },

  async updateCustomReward(classId, rewardId, updates) {
    try {
      const docRef = doc(db, "classes", classId, "customRewards", rewardId);
      await updateDoc(docRef, updates);
      return { id: rewardId, ...updates };
    } catch (error) {
      console.error("Error updating custom reward:", error);
      throw error;
    }
  },

  async deleteCustomReward(classId, rewardId) {
    try {
      await deleteDoc(doc(db, "classes", classId, "customRewards", rewardId));
      return true;
    } catch (error) {
      console.error("Error deleting custom reward:", error);
      throw error;
    }
  },

  // ================= REWARD REDEMPTIONS =================
  async redeemCustomReward(classId, rewardId, redemptionData) {
    try {
      const docRef = await addDoc(collection(db, "classes", classId, "redemptions"), {
        rewardId,
        ...redemptionData,
        status: 'pending', // pending, fulfilled, cancelled
        redeemedAt: serverTimestamp(),
      });
      return { id: docRef.id, rewardId, ...redemptionData, status: 'pending' };
    } catch (error) {
      console.error("Error redeeming reward:", error);
      throw error;
    }
  },

  async getRedemptions(classId) {
    try {
      const q = query(collection(db, "classes", classId, "redemptions"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Error getting redemptions:", error);
      return [];
    }
  },

  subscribeToRedemptions(classId, callback) {
    const q = query(collection(db, "classes", classId, "redemptions"));
    return onSnapshot(q, (snapshot) => {
      const redemptions = [];
      snapshot.forEach((d) => {
        redemptions.push({ id: d.id, ...d.data() });
      });
      callback(redemptions);
    });
  },

  async updateRedemption(classId, redemptionId, updates) {
    try {
      const docRef = doc(db, "classes", classId, "redemptions", redemptionId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error("Error updating redemption:", error);
      throw error;
    }
  },

  // ================= ORGANIZATIONS =================
  async createOrganization(name, description = '') {
    try {
      let code;
      let isUnique = false;

      while (!isUnique) {
        code = 'ORG-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        const q = query(collection(db, "organizations"), where("code", "==", code));
        const snapshot = await getDocs(q);
        if (snapshot.empty) isUnique = true;
      }

      const newOrg = {
        name,
        description,
        code,
        teacherCount: 0,
        classCount: 0,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "organizations"), newOrg);
      return { id: docRef.id, ...newOrg };
    } catch (error) {
      throw new Error("Failed to create organization: " + error.message);
    }
  },

  async getOrganizations() {
    try {
      const q = query(collection(db, "organizations"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return list;
    } catch (error) {
      console.error("Error fetching organizations:", error);
      return [];
    }
  },

  async getOrganization(orgId) {
    try {
      const docSnap = await getDoc(doc(db, "organizations", orgId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("Error fetching organization:", error);
      return null;
    }
  },

  async getOrganizationByCode(code) {
    try {
      const q = query(collection(db, "organizations"), where("code", "==", code.trim().toUpperCase()));
      const snapshot = await getDocs(q);
      if (snapshot.empty) throw new Error("Organization not found with code: " + code);
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async updateOrganization(orgId, updates) {
    try {
      const docRef = doc(db, "organizations", orgId);
      await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
      return { id: orgId, ...updates };
    } catch (error) {
      throw new Error("Error updating organization: " + error.message);
    }
  },

  async deleteOrganization(orgId) {
    try {
      await deleteDoc(doc(db, "organizations", orgId));
      return true;
    } catch (error) {
      throw new Error("Error deleting organization: " + error.message);
    }
  },

  // ================= ADMIN & TEACHER USER MANAGEMENT =================
  async getTeacher(teacherId) {
    try {
      const docSnap = await getDoc(doc(db, "teachers", teacherId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("Error fetching teacher:", error);
      return null;
    }
  },

  async getAllTeachers() {
    try {
      const snapshot = await getDocs(collection(db, "teachers"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Error fetching teachers:", error);
      return [];
    }
  },

  async getTeachersByOrganization(orgId) {
    try {
      const q = query(collection(db, "teachers"), where("organizationId", "==", orgId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Error fetching teachers by org:", error);
      return [];
    }
  },

  async assignTeacherToOrg(teacherId, organizationId, organizationName = '') {
    try {
      const teacherRef = doc(db, "teachers", teacherId);
      await updateDoc(teacherRef, {
        organizationId: organizationId || null,
        organizationName: organizationName || '',
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      throw new Error("Failed to assign teacher to organization: " + error.message);
    }
  },

  async updateTeacherRole(teacherId, newRole) {
    try {
      const teacherRef = doc(db, "teachers", teacherId);
      await updateDoc(teacherRef, {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      throw new Error("Failed to update teacher role: " + error.message);
    }
  },

  async createTeacherUserByAdmin(name, email, password, organizationId = null, organizationName = '', role = 'teacher') {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      const teacherDoc = {
        name,
        email,
        role: role || 'teacher',
        organizationId: organizationId || null,
        organizationName: organizationName || '',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, "teachers", user.uid), teacherDoc);

      if (organizationId) {
        const orgRef = doc(db, "organizations", organizationId);
        const orgSnap = await getDoc(orgRef);
        if (orgSnap.exists()) {
          const count = orgSnap.data().teacherCount || 0;
          await updateDoc(orgRef, { teacherCount: count + 1 });
        }
      }

      return { id: user.uid, ...teacherDoc };
    } catch (error) {
      throw new Error("Failed to create teacher user: " + error.message);
    }
  },

  // ================= ORGANIZATION CHOICE BOARD TEMPLATES =================
  async createOrgTemplate(orgId, templateData) {
    if (!orgId) throw new Error("Organization ID is required.");
    try {
      const sanitizedActivities = (templateData.activities || []).map(path => ({
        id: path.id || '',
        title: path.title || '',
        subtitle: path.subtitle || '',
        icon: path.icon || 'BookOpen',
        color: path.color || 'bg-blue-600',
        options: (path.options || []).map(opt => ({
          id: opt.id || `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: opt.title || 'Untitled Activity',
          desc: opt.desc || '',
          type: opt.type || 'Low Tech',
          xp: typeof opt.xp === 'number' ? opt.xp : (parseInt(opt.xp) || 100),
          steps: Array.isArray(opt.steps)
            ? opt.steps.map(s => {
                if (typeof s === 'string') return { text: s };
                const cleanStep = { text: s?.text || '' };
                if (s?.link) cleanStep.link = s.link;
                if (s?.linkText) cleanStep.linkText = s.linkText;
                return cleanStep;
              })
            : [{ text: '' }],
          proTip: opt.proTip || '',
          ...(opt.categoryTag ? { categoryTag: opt.categoryTag } : {})
        }))
      }));

      const newTemplate = {
        orgId,
        title: templateData.title || 'Untitled Choice Board Template',
        description: templateData.description || '',
        activities: sanitizedActivities,
        categoryNames: templateData.categoryNames || {},
        categorySubtitles: templateData.categorySubtitles || {},
        createdBy: templateData.createdBy || 'Admin',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "orgTemplates"), newTemplate);
      return { id: docRef.id, ...newTemplate };
    } catch (error) {
      throw new Error("Failed to create choice board template: " + error.message);
    }
  },

  async getOrgTemplates(orgId) {
    try {
      const q = query(collection(db, "orgTemplates"), where("orgId", "==", orgId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Error getting organization choice board templates:", error);
      return [];
    }
  },

  async updateOrgTemplate(templateId, updates) {
    if (!templateId) throw new Error("Template ID is required.");
    try {
      const cleanUpdates = { ...updates };
      if (cleanUpdates.activities) {
        cleanUpdates.activities = cleanUpdates.activities.map(path => ({
          id: path.id || '',
          title: path.title || '',
          subtitle: path.subtitle || '',
          icon: path.icon || 'BookOpen',
          color: path.color || 'bg-blue-600',
          options: (path.options || []).map(opt => ({
            id: opt.id || `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: opt.title || 'Untitled Activity',
            desc: opt.desc || '',
            type: opt.type || 'Low Tech',
            xp: typeof opt.xp === 'number' ? opt.xp : (parseInt(opt.xp) || 100),
            steps: Array.isArray(opt.steps)
              ? opt.steps.map(s => {
                  if (typeof s === 'string') return { text: s };
                  const cleanStep = { text: s?.text || '' };
                  if (s?.link) cleanStep.link = s.link;
                  if (s?.linkText) cleanStep.linkText = s.linkText;
                  return cleanStep;
                })
              : [{ text: '' }],
            proTip: opt.proTip || '',
            ...(opt.categoryTag ? { categoryTag: opt.categoryTag } : {})
          }))
        }));
      }
      const docRef = doc(db, "orgTemplates", templateId);
      await updateDoc(docRef, { ...cleanUpdates, updatedAt: serverTimestamp() });
      return { id: templateId, ...cleanUpdates };
    } catch (error) {
      throw new Error("Failed to update choice board template: " + error.message);
    }
  },

  async deleteOrgTemplate(templateId) {
    try {
      await deleteDoc(doc(db, "orgTemplates", templateId));
      return true;
    } catch (error) {
      throw new Error("Failed to delete choice board template: " + error.message);
    }
  },

  async getAllClassesByOrg(orgId) {
    try {
      // 1. Get classes explicitly tagged with organizationId == orgId
      const orgQuery = query(collection(db, "classes"), where("organizationId", "==", orgId));
      const orgSnapshot = await getDocs(orgQuery);
      const classesMap = new Map();
      orgSnapshot.forEach(d => classesMap.set(d.id, { id: d.id, ...d.data() }));

      // 2. Also query teachers in this org and include their classes
      const teachers = await this.getTeachersByOrganization(orgId);
      const teacherIds = teachers.map(t => t.id);

      for (const tId of teacherIds) {
        const teacherClasses = await this.getClasses(tId);
        for (const cls of teacherClasses) {
          if (!classesMap.has(cls.id)) {
            classesMap.set(cls.id, cls);
          }
        }
      }

      return Array.from(classesMap.values());
    } catch (error) {
      console.error("Error getting classes by organization:", error);
      return [];
    }
  },

  async applyTemplateToClasses(templateId, classIds) {
    try {
      const templateDoc = await getDoc(doc(db, "orgTemplates", templateId));
      if (!templateDoc.exists()) throw new Error("Template not found");
      const templateData = templateDoc.data();

      const updatePromises = classIds.map(classId => {
        const classRef = doc(db, "classes", classId);
        const templatePaths = templateData.activities || [];
        const templateOrder = templateData.categoryOrder || templatePaths.map(p => p.id);
        return updateDoc(classRef, {
          activities: templatePaths,
          categoryNames: templateData.categoryNames || {},
          categorySubtitles: templateData.categorySubtitles || {},
          categoryOrder: templateOrder,
          appliedTemplateId: templateId,
          appliedTemplateTitle: templateData.title,
          updatedAt: serverTimestamp()
        });
      });

      await Promise.all(updatePromises);
      return { success: true, count: classIds.length };
    } catch (error) {
      throw new Error("Failed to apply template to classes: " + error.message);
    }
  },

  async applyTemplateToOrganization(orgId, templateId) {
    try {
      const targetClasses = await this.getAllClassesByOrg(orgId);
      const classIds = targetClasses.map(c => c.id);
      if (classIds.length === 0) {
        return { success: true, count: 0 };
      }
      return await this.applyTemplateToClasses(templateId, classIds);
    } catch (error) {
      throw new Error("Failed to apply template to organization: " + error.message);
    }
  },

  async importTemplateActivitiesToClass(classId, activitiesToImport, categoryNames = {}, categorySubtitles = {}, mode = 'merge') {
    try {
      const classRef = doc(db, "classes", classId);
      const classSnap = await getDoc(classRef);
      if (!classSnap.exists()) throw new Error("Class not found");

      const classData = classSnap.data();

      if (mode === 'overwrite') {
        const order = activitiesToImport.map(p => p.id);
        await updateDoc(classRef, {
          activities: activitiesToImport,
          categoryNames: categoryNames,
          categorySubtitles: categorySubtitles,
          categoryOrder: order,
          updatedAt: serverTimestamp()
        });
        return { success: true, activities: activitiesToImport, categoryNames, categorySubtitles, categoryOrder: order };
      }

      let currentActivities = classData.activities && classData.activities.length > 0
        ? classData.activities
        : DEFAULT_PATHS;

      const mergedCategoryNames = { ...(classData.categoryNames || {}), ...categoryNames };
      const mergedCategorySubtitles = { ...(classData.categorySubtitles || {}), ...categorySubtitles };

      // Map existing path options to append new activities without deleting existing ones
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

      // Add any new path IDs present in activitiesToImport that weren't in currentActivities
      const existingPathIds = new Set(updatedActivities.map(p => p.id));
      activitiesToImport.forEach(importPath => {
        if (!existingPathIds.has(importPath.id)) {
          updatedActivities.push(importPath);
        }
      });

      const existingOrder = Array.isArray(classData.categoryOrder) ? classData.categoryOrder : updatedActivities.map(p => p.id);
      const mergedOrder = [...new Set([...existingOrder, ...updatedActivities.map(p => p.id)])];

      await updateDoc(classRef, {
        activities: updatedActivities,
        categoryNames: mergedCategoryNames,
        categorySubtitles: mergedCategorySubtitles,
        categoryOrder: mergedOrder,
        updatedAt: serverTimestamp()
      });

      return { success: true, activities: updatedActivities, categoryNames: mergedCategoryNames, categorySubtitles: mergedCategorySubtitles, categoryOrder: mergedOrder };
    } catch (error) {
      throw new Error("Failed to import activities to class: " + error.message);
    }
  },

  // ================= GUILD CONFIGURATION & BOT PICTURES =================
  async updateClassGuilds(classId, guilds) {
    try {
      const classRef = doc(db, "classes", classId);
      await updateDoc(classRef, { guilds, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error("Error updating class guilds:", error);
      throw error;
    }
  },

  async updateGuildBotPicture(classId, guildId, botPictureUrl) {
    try {
      const classDoc = await this.getClass(classId);
      const currentGuilds = classDoc?.guilds && classDoc.guilds.length > 0 ? [...classDoc.guilds] : [...GUILDS];
      const updatedGuilds = currentGuilds.map(g => g.id === guildId ? { ...g, botPictureUrl } : g);
      await this.updateClassGuilds(classId, updatedGuilds);
      return { success: true, botPictureUrl };
    } catch (error) {
      console.error("Error updating guild bot picture:", error);
      throw error;
    }
  },

  // ================= STEM SUPPLIES DEPOT & GUILD REWARDS =================
  async getStemShopItems(classId) {
    try {
      if (!classId) return DEFAULT_STEM_SUPPLIES;
      const classDoc = await this.getClass(classId);
      return classDoc?.stemSupplies && classDoc.stemSupplies.length > 0
        ? classDoc.stemSupplies
        : DEFAULT_STEM_SUPPLIES;
    } catch (e) {
      return DEFAULT_STEM_SUPPLIES;
    }
  },

  async updateStemShopItems(classId, stemSupplies) {
    try {
      const classRef = doc(db, "classes", classId);
      await updateDoc(classRef, { stemSupplies, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error("Error updating STEM shop items:", error);
      throw error;
    }
  },

  async buyStemSupply(classId, studentId, itemId) {
    try {
      const classDoc = await this.getClass(classId);
      const student = await this.getStudent(studentId);
      if (!student) throw new Error("Student not found");
      if (!student.guild) throw new Error("You must join a guild before purchasing STEM supplies!");

      const items = classDoc?.stemSupplies && classDoc.stemSupplies.length > 0
        ? classDoc.stemSupplies
        : DEFAULT_STEM_SUPPLIES;
      const item = items.find(i => i.id === itemId);
      if (!item) throw new Error("Item not found in catalog");

      if ((student.coins || 0) < item.costCoins) {
        throw new Error(`Not enough coins! You have ${student.coins || 0} coins, but this item costs ${item.costCoins} coins.`);
      }

      // Check guild level requirement
      const leaderboard = await this.getGuildLeaderboard(classId);
      const guildStats = leaderboard[student.guild];
      const guildLevel = guildStats?.levelInfo?.level || 1;
      if (guildLevel < item.requiredGuildLevel) {
        throw new Error(`Your guild must reach Level ${item.requiredGuildLevel} to unlock this tier! (Current: Level ${guildLevel})`);
      }

      // Deduct student's personal coins
      const newCoins = (student.coins || 0) - item.costCoins;
      await this.updateStudent(studentId, { coins: newCoins });

      // Find guild info
      const activeGuilds = classDoc?.guilds && classDoc.guilds.length > 0 ? classDoc.guilds : GUILDS;
      const guildInfo = activeGuilds.find(g => g.id === student.guild);

      // Create purchase audit log record
      const purchaseData = {
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

      const docRef = await addDoc(collection(db, "stem_purchases"), purchaseData);
      return { success: true, purchaseId: docRef.id, newCoins, item, purchase: { id: docRef.id, ...purchaseData } };
    } catch (error) {
      console.error("Error purchasing STEM supply:", error);
      throw error;
    }
  },

  async getStemPurchases(classId) {
    try {
      const q = query(
        collection(db, "stem_purchases"),
        where("classId", "==", classId)
      );
      const snap = await getDocs(q);
      const purchases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      purchases.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return purchases;
    } catch (error) {
      console.error("Error fetching STEM purchases:", error);
      return [];
    }
  },

  async markStemPurchaseFulfilled(purchaseId, fulfilled = true) {
    try {
      const ref = doc(db, "stem_purchases", purchaseId);
      await updateDoc(ref, {
        fulfilled,
        fulfilledAt: fulfilled ? new Date().toISOString() : null
      });
      return { success: true };
    } catch (error) {
      console.error("Error marking purchase fulfilled:", error);
      throw error;
    }
  },

  async getOrgStemPurchases(organizationId) {
    try {
      const classes = await this.getClassesForOrganization(organizationId);
      const classIds = classes.map(c => c.id);
      if (classIds.length === 0) return [];
      const snap = await getDocs(collection(db, "stem_purchases"));
      const allPurchases = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => classIds.includes(p.classId));
      allPurchases.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return allPurchases;
    } catch (error) {
      console.error("Error fetching org STEM purchases:", error);
      return [];
    }
  },

  // ================= BOSS BATTLES (ADMIN ORG-WIDE & TEACHER CLASS-LEVEL) =================
  async setClassCustomBoss(classId, bossData) {
    try {
      const classRef = doc(db, "classes", classId);
      await updateDoc(classRef, { customBoss: bossData, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error("Error setting class custom boss:", error);
      throw error;
    }
  },

  async clearClassCustomBoss(classId) {
    try {
      const classRef = doc(db, "classes", classId);
      await updateDoc(classRef, { customBoss: null, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error("Error clearing class custom boss:", error);
      throw error;
    }
  },

  async setOrgWeeklyBoss(organizationId, bossData) {
    try {
      const orgRef = doc(db, "organizations", organizationId);
      await updateDoc(orgRef, { activeBoss: bossData, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error("Error setting org weekly boss:", error);
      throw error;
    }
  },

  async clearOrgWeeklyBoss(organizationId) {
    try {
      const orgRef = doc(db, "organizations", organizationId);
      await updateDoc(orgRef, { activeBoss: null, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error("Error clearing org weekly boss:", error);
      throw error;
    }
  },

  async getActiveBoss(classId, organizationId) {
    try {
      // 1. Check Class-specific custom boss
      if (classId) {
        const classDoc = await this.getClass(classId);
        if (classDoc?.customBoss && classDoc.customBoss.name) {
          return { ...classDoc.customBoss, source: 'class' };
        }
        if (!organizationId && classDoc?.organizationId) {
          organizationId = classDoc.organizationId;
        }
      }

      // 2. Check Org-wide weekly boss
      if (organizationId) {
        const orgDoc = await this.getOrganization(organizationId);
        if (orgDoc?.activeBoss && orgDoc.activeBoss.name) {
          return { ...orgDoc.activeBoss, source: 'org' };
        }
      }

      // 3. Fallback to weekly rotation from BOSS_CHALLENGES
      const today = new Date();
      const weekOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 604800000);
      const defaultBoss = BOSS_CHALLENGES[weekOfYear % BOSS_CHALLENGES.length];
      return { ...defaultBoss, source: 'default' };
    } catch (error) {
      console.error("Error resolving active boss:", error);
      return { ...BOSS_CHALLENGES[0], source: 'default' };
    }
  }
};

