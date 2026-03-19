# SwimGenius

A swimming companion web app. Built with vanilla JS, plain CSS, and Firebase.

## Project Structure

```
swimgenius/
├── public/
│   ├── index.html          ← Login / register page
│   ├── app.html            ← Main app (auth-protected)
│   ├── css/
│   │   ├── base.css        ← CSS variables, resets, animations
│   │   ├── auth.css        ← Login page styles
│   │   └── app.css         ← Main app styles
│   └── js/
│       ├── firebase-config.js  ← Your Firebase credentials go here
│       ├── auth.js             ← Login / register / demo logic
│       ├── db.js               ← Firestore read/write helpers
│       ├── coach.js            ← AI Coach (stubbed, Anthropic coming later)
│       └── app.js              ← All main app logic
├── .gitignore
├── firebase.json
└── README.md
```

## Setup

### 1. Firebase Console
- Create a project at https://console.firebase.google.com
- Enable **Authentication** → Email/Password + Anonymous
- Enable **Firestore** → Start in test mode
- Add a **Web app** and copy the config object

### 2. Add your Firebase config
Open `public/js/firebase-config.js` and replace the placeholder values with your real config.

### 3. Firebase CLI
```bash
npm install -g firebase-tools
firebase login
firebase init   # select Firestore + Hosting, public dir = "public"
```

### 4. Run locally
```bash
firebase serve
```
Then open http://localhost:5000

### 5. Deploy
```bash
firebase deploy
```

## Coming next
- Wire up Anthropic API for real AI Coach responses
- Goals persistence in Firestore
- Dryland progress persistence
