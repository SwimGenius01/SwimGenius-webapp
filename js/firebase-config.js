import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAkjEm3_HG_ZQHIgCH4M0q9fcnTiXtC6B4",
  authDomain:        "swimgenius-webapp.firebaseapp.com",
  projectId:         "swimgenius-webapp",
  storageBucket:     "swimgenius-webapp.firebasestorage.app",
  messagingSenderId: "5533312115",
  appId:             "1:5533312115:web:754eb8db07cd8fb4a4b606"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);