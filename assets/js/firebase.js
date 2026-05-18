import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import { addDoc, collection, getFirestore, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

async function saveRoomSession(payload) {
  const cleanPayload = JSON.parse(JSON.stringify(payload || {}));
  return addDoc(collection(db, "roomSessions"), {
    ...cleanPayload,
    site: "VT Lab",
    source: "github-pages",
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    createdAt: serverTimestamp(),
  });
}

window.VTLabFirebase = {
  app,
  db,
  saveRoomSession,
};
