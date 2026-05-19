import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, setDoc, where } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHK61WDf29BnAmtj6g3sp40YWsxcwEX-8",
  authDomain: "vtlab-8740d.firebaseapp.com",
  projectId: "vtlab-8740d",
  storageBucket: "vtlab-8740d.firebasestorage.app",
  messagingSenderId: "379584125253",
  appId: "1:379584125253:web:649f4e974029c07bcc062c",
  measurementId: "G-WYFC9BQJ1T",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

async function saveRoomSession(payload) {
  const session = getLocalSession();
  if (session.testMode) {
    saveLocalTestSession(payload);
    return { id: "test-mode-local-only" };
  }

  const cleanPayload = JSON.parse(JSON.stringify(payload || {}));
  return addDoc(collection(db, "roomSessions"), {
    ...cleanPayload,
    cohortCode: session.cohortCode || null,
    cohortName: session.cohortName || null,
    studentUid: auth.currentUser?.uid || session.user?.uid || null,
    studentName: auth.currentUser?.displayName || session.user?.displayName || null,
    studentEmail: auth.currentUser?.email || session.user?.email || null,
    testMode: false,
    site: "VT Lab",
    source: "github-pages",
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    createdAt: serverTimestamp(),
  });
}

async function saveToolProgress(payload) {
  const session = getLocalSession();
  if (session.testMode) {
    saveLocalTestSession({ ...payload, event: payload.event || "tool-progress-saved" });
    return { id: "test-mode-local-only" };
  }

  const user = auth.currentUser || await authReady();
  if (!user) throw new Error("Please sign in with Google first.");
  const roomId = payload.roomId || "tool";
  const cohortCode = session.cohortCode || "no-cohort";
  const progressId = `${cohortCode}_${user.uid}_${roomId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const cleanPayload = JSON.parse(JSON.stringify(payload || {}));
  await setDoc(doc(db, "toolProgress", progressId), {
    ...cleanPayload,
    cohortCode: session.cohortCode || null,
    cohortName: session.cohortName || null,
    studentUid: user.uid,
    studentName: user.displayName || "",
    studentEmail: user.email || "",
    testMode: false,
    site: "VT Lab",
    source: "github-pages",
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { id: progressId };
}

function getLocalSession() {
  try {
    return JSON.parse(localStorage.getItem("vtlab.session")) || {};
  } catch {
    return {};
  }
}

function setLocalSession(nextSession) {
  const merged = { ...getLocalSession(), ...nextSession };
  localStorage.setItem("vtlab.session", JSON.stringify(merged));
  return merged;
}

function clearLocalSession() {
  localStorage.removeItem("vtlab.session");
}

function saveLocalTestSession(payload) {
  const records = JSON.parse(localStorage.getItem("vtlab.testSessions") || "[]");
  records.push({
    ...payload,
    testMode: true,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem("vtlab.testSessions", JSON.stringify(records));
}

function authReady() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function loginWithGoogle(role = "student") {
  const result = await signInWithPopup(auth, provider);
  const user = serialiseUser(result.user);
  return setLocalSession({ role, user, testMode: false });
}

async function logout() {
  clearLocalSession();
  await signOut(auth);
}

function startTestMode(role = "student") {
  return setLocalSession({
    role,
    testMode: true,
    cohortCode: null,
    cohortName: "Test mode",
    user: {
      uid: `test-${role}`,
      displayName: role === "teacher" ? "Teacher test mode" : "Student test mode",
      email: "",
    },
  });
}

async function createCohort(name) {
  const user = auth.currentUser || await authReady();
  if (!user) throw new Error("Please sign in with Google first.");
  const code = await generateUniqueCode();
  await setDoc(doc(db, "cohorts", code), {
    code,
    name,
    teacherUid: user.uid,
    teacherName: user.displayName || "",
    teacherEmail: user.email || "",
    createdAt: serverTimestamp(),
  });
  return { code, name };
}

async function generateUniqueCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateCode();
    const existing = await getDoc(doc(db, "cohorts", code));
    if (!existing.exists()) return code;
  }
  throw new Error("Could not generate a unique cohort code. Please try again.");
}

async function listTeacherCohorts() {
  const user = auth.currentUser || await authReady();
  if (!user) return [];
  const snapshot = await getDocs(query(collection(db, "cohorts"), where("teacherUid", "==", user.uid)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function joinCohort(code) {
  const normalised = String(code || "").trim().toUpperCase();
  const user = auth.currentUser || await authReady();
  if (!user) throw new Error("Please sign in with Google first.");
  const cohortRef = doc(db, "cohorts", normalised);
  const cohort = await getDoc(cohortRef);
  if (!cohort.exists()) throw new Error("That cohort code does not exist.");
  const data = cohort.data();
  await setDoc(doc(db, "cohorts", normalised, "students", user.uid), {
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    joinedAt: serverTimestamp(),
  }, { merge: true });
  return setLocalSession({
    role: "student",
    testMode: false,
    cohortCode: normalised,
    cohortName: data.name || normalised,
    user: serialiseUser(user),
  });
}

async function getCohortSessions(code) {
  const snapshot = await getDocs(query(collection(db, "roomSessions"), where("cohortCode", "==", code)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function getCohortToolProgress(code) {
  const snapshot = await getDocs(query(collection(db, "toolProgress"), where("cohortCode", "==", code)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function deleteCohort(code) {
  const sessions = await getCohortSessions(code);
  await Promise.all(sessions.map((session) => deleteDoc(doc(db, "roomSessions", session.id))));
  const progress = await getCohortToolProgress(code);
  await Promise.all(progress.map((item) => deleteDoc(doc(db, "toolProgress", item.id))));
  const students = await getDocs(collection(db, "cohorts", code, "students"));
  await Promise.all(students.docs.map((student) => deleteDoc(doc(db, "cohorts", code, "students", student.id))));
  await deleteDoc(doc(db, "cohorts", code));
}

async function deleteCohortStudent(code, studentUid) {
  const sessions = await getCohortSessions(code);
  const studentSessions = sessions.filter((session) => session.studentUid === studentUid || session.studentEmail === studentUid);
  await Promise.all(studentSessions.map((session) => deleteDoc(doc(db, "roomSessions", session.id))));
  const progress = await getCohortToolProgress(code);
  const studentProgress = progress.filter((item) => item.studentUid === studentUid || item.studentEmail === studentUid);
  await Promise.all(studentProgress.map((item) => deleteDoc(doc(db, "toolProgress", item.id))));
  await deleteDoc(doc(db, "cohorts", code, "students", studentUid));
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function serialiseUser(user) {
  return {
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
  };
}

window.VTLabFirebase = {
  app,
  auth,
  db,
  authReady,
  loginWithGoogle,
  logout,
  startTestMode,
  getLocalSession,
  setLocalSession,
  clearLocalSession,
  createCohort,
  listTeacherCohorts,
  joinCohort,
  getCohortSessions,
  getCohortToolProgress,
  deleteCohort,
  deleteCohortStudent,
  saveRoomSession,
  saveToolProgress,
};
