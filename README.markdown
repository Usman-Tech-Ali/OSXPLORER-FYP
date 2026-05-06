# OSXplorer 🧠⚙️

*A Gamified Learning Platform for Operating Systems Concepts*\
**🚧 Work in Progress – Currently in Iteration 1 (Frontend Development)**

---

## 📌 Overview

**OSXplorer** is an interactive, gamified Learning Management System (LMS) built to make Operating Systems (OS) concepts fun, intuitive, and engaging for students. Through progressive 2D games and a dynamic learning dashboard, OSXplorer breaks down complex topics like CPU Scheduling, Memory Management, and Process Synchronization into multi-level interactive challenges.

The platform is designed with:

- Real-time visual simulations
- Gamified progression (XP, badges, quests, leaderboards)
- A planned AI-powered assistant to guide users and troubleshoot OS topics
- Accessibility and engagement as core principles

> Developed as the Final Year Project (FYP) for BS Software Engineering, FAST NUCES, 2022.

---

## 🎮 Modules

1. **Scheduler Dash** – Learn CPU Scheduling (FCFS, SJF, SRTF, Priority, RR) via lane-based simulations
2. **Memory Stackers** – Practice memory allocation (First Fit, Best Fit, Paging, etc.) via puzzle-style interaction
3. **Critical Chase** – Explore Process Synchronization (Mutex, Semaphores, Deadlocks) with path-based logic games

---

## 🧰 Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | Next.js, Tailwind CSS |
| **Game Engine** | Kaboom.js + Konva.js |
| **Backend** | Node.js + Express.js |
| **Database** | MongoDB |
| **Auth** | Firebase/Auth0 (planned) |
| **Deployment** | Docker + Ubuntu Server |
| **CI/CD** | GitHub Actions |

---

## 🚀 Getting Started

### First-time Setup

If you haven't already installed the dependencies:

```bash
npx create-next-app@latest
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open http://localhost:3000 in your browser to view the app.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses `next/font` to automatically optimize and load Geist, a new font family by Vercel.

### 📚 Learn More

To learn more about Next.js:

- Next.js Documentation
- Learn Next.js
- Explore the Next.js GitHub repository for contributions and feedback.

### 🚀 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the Vercel Platform.

Read more in the Next.js deployment documentation.

---

## 🧪 Current Progress

- ✅ Figma designs completed and approved
- ✅ Frontend UI implemented (Iteration 1)
- 🔜 Game logic integration (Kaboom.js + Konva.js)
- 🔜 Backend API setup and database integration
- 🔮 Future AI assistant chatbot for OS theory support

---

## 🎯 Key Features (Planned)

- Multi-level gameplay with increasing difficulty per concept
- Real-time Gantt charts, memory grids, and thread animations
- XP, badges, mini-quests, and leaderboard system
- Gamified reinforcement via challenges and quests
- Future AI assistant to explain OS concepts and debug common issues

---

## 📆 FYP Iteration Status

| Iteration | Timeline | Status |
| --- | --- | --- |
| UI/Wireframes | June–July 2025 | ✅ Completed |
| Frontend Dev | July 2025 | ✅ In Progress |
| Game Logic | August 2025 | 🔜 Upcoming |
| Backend/API | Sept–Oct 2025 | 🔜 Planned |
| AI Features | FYP-2 (2026) | 🔮 Future |

---

## 📁 Folder Structure (WIP)

```bash
/osxplorer
├── app/                   # Next.js app directory
│   ├── page.tsx           # Homepage
│   └── ...                # Route-based pages
├── components/            # Reusable UI components
├── games/                 # Kaboom.js / Konva.js logic
├── public/                # Assets, icons
├── styles/                # Tailwind & global styles
├── PATCH_NOTES.md         # Patch notes for all releases and commits
└── README.md              # Project documentation

```

---

## 📚 License

MIT License — feel free to fork and modify (with credit).\
*Note*: This is a university project under academic guidelines.

---

## ✨ Credits

**Team**: Abdullah Daoud (22I-2626), Usman Ali (22I-2725), Faizan Rasheed (22I-2734)\
**Supervisor**: \[Supervisor Name\]\
**Institution**: FAST NUCES, SE Batch 2022

Stay tuned! This is just the beginning. The project is actively being built and will evolve with more modules, visual polish, and AI enhancements.


# 📋Patch Notes

## v1.0 — Figma Prototyping and Wireframes

### Highlights
- **Figma Design Link:** [OSXplorer Figma Prototype](https://www.figma.com/design/OwLRJ0w3erU7oMqbhKnOZF/OSXplorer?m=auto&t=fNs12lJW3G5cwGlw-6)
- UI wireframes and interactive prototypes for all major pages and flows
- Visual design system and component library established

---

## v1.1 — Initial Public Code Release

### Highlights
- **Initial Frontend Pages Implemented:**
  - Login & Signup
  - Dashboard
  - Learning Modules (CPU Scheduling, Memory Management, Process Synchronization)
  - Achievements & Badges
  - Leaderboard
  - Gamification & Progression (XP, badges, streaks)
  - Level Results
  - Mini-Quest Overview, Quiz, and Results
  - User Profile Management (settings, password, 2FA, etc.)
  - Core UI/UX & Theming (retro-futuristic, responsive)

---

## v1.2 — Frontend Updates & Feature Expansion

### Core Features Implemented

- **Dynamic Routing & Navigation**
  - Seamless navigation between all pages and modules

- **User Authentication & Profile**
  - Login and signup flows
  - User profile management (settings, password, 2FA, etc.)

- **Dashboard**
  - Personalized welcome and progress overview
  - XP/level tracking and progress bar
  - Quick stats (XP, levels, badges)
  - Recent activity feed
  - Leaderboard preview

- **Learning Modules**
  - Core OS modules: CPU Scheduling, Memory Management, Process Synchronization
  - Each module has its own page, levels, and mini-quests
  - Interactive levels with results and performance metrics
  - Mini-quests and quizzes for focused learning

- **Achievements & Badges**
  - Achievements gallery with filtering, sorting, and search
  - Badges collection with progress tracking
  - Visual feedback for achievement status and rarity

- **Leaderboard**
  - Full leaderboard page with user ranking, stats, and podium display
  - Current user’s rank and stats highlighted

- **Gamification & Progression**
  - Level results with scores, stars, and performance metrics
  - Quiz system with progress, answer selection, and results

- **Support & Community**
  - Footer links to documentation, API, tutorials, community, blog, help, contact, bug reports, and feature requests
  - Social and contact links (GitHub, Twitter, email)

- **UI/UX & Theming**
  - Retro-futuristic, neon-inspired design
  - Responsive layouts for all device sizes
  - Animated transitions and interactive UI elements
  - Reusable UI components (cards, badges, progress bars, avatars, navigation, etc.)

- **Team Presentation**
  - “Meet the Development Team” section with member profiles and social links

---

## [Planned for Future Versions]
- Interactive game mechanics (drag-and-drop, live Gantt chart, memory grid, etc.)
- Replay system for level analysis
- Advanced visualizations and animations for OS concepts
- Unlockables and hidden levels
- Additional modules and features based on user feedback 
