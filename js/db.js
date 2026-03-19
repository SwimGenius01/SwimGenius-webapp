// ============================================
// DB.JS — Firestore read/write helpers
// ============================================

import {
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "./firebase-config.js";

// ── Profile ───────────────────────────────────

export async function loadProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveProfile(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

// ── Times ─────────────────────────────────────

export async function loadTimes(uid) {
  const q    = query(collection(db, "users", uid, "times"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveTime(uid, timeData) {
  const ref = await addDoc(collection(db, "users", uid, "times"), {
    ...timeData,
    createdAt: serverTimestamp()
  });
  return ref.id;
}
