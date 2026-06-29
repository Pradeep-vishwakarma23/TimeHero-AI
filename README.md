# TimeHero AI | From Deadlines to Done

**TimeHero AI** is an AI-powered productivity companion designed to proactively help students, professionals, and entrepreneurs plan, prioritize, and complete work before deadlines are missed.

This is a high-fidelity, production-quality, full-stack implementation featuring an Express backend with a persistent SQLite database layer and real-time AI capabilities powered by the Google Gemini API (`gemini-3.5-flash`), paired with an elegant, responsive React + Tailwind CSS client dashboard.

---

## Folder Structure

```
timehero-ai/
├── dist/                  # Compiled production build directory
├── server/
│   ├── database.ts        # Core SQLite database layer (table creation, CRUD, statistics)
│   ├── gemini_service.ts  # Gemini API prompt generation, schema, and lazy initialization
│   └── config.ts          # Shared server-side layout and styling variables
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx    # Left-hand branding and navigational controls
│   │   ├── Dashboard.tsx  # Dynamic metrics widgets, SVG Spline graphs, and Heatmaps
│   │   ├── FutureSimulator.tsx  # Delay sliders, risk indicators, and adaptive recovery plans
│   │   ├── AIPlanner.tsx  # Real AI decomposition tree views and milestone progress tracking
│   │   ├── AICoach.tsx    # Conversational chat and live burnout dashboard meters
│   │   ├── AddTask.tsx    # Live risk simulation previews and forms
│   │   └── TaskPipeline.tsx  # Interactive board/table list with SQLite CRUD bindings
│   ├── App.tsx            # Main App entry, page routers, and state syncing
│   ├── main.tsx           # React DOM initialization
│   ├── index.css          # Tailwind CSS global entry
│   └── types.ts           # Shared TypeScript interfaces
├── server.ts              # Custom full-stack Express server and API gateways
├── package.json           # Scripts and dependencies manager
├── tsconfig.json          # TypeScript compilation options
└── .env.example           # Shared environment definitions example
```

---

## Features

### 1. Persistent SQLite Layer
- Automatic table initialization and data seeding.
- Exposes full CRUD APIs (`createTask`, `getTasks`, `updateTask`, `deleteTask`, `completeTask`).
- Performs direct math-based risk weight computations for dashboard metrics instantly.

### 2. Live Gemini AI Service
- **AI Task Planner**: Decomposes selected tasks into structured execution roadmaps across 5 sequential phases with 3 custom actionable milestones.
- **Future You Simulator**: Models the exact probability, delay impact, and stress cost of scheduling shifting dynamically.
- **AI Coach**: A friendly, empathetic chatbot that gives you concrete focus recommendations and monitors burnout risk.
- **Productivity Insights**: Scans actual active tasks to build customized focus schedules.

### 3. Beautiful Dashboard
- 5 custom metric badges showing conic gradient progress rings.
- **Weekly Productivity Spline Chart**: Glowing line path combined with completed task bars.
- **Deadline Risk Heatmap Matrix**: Hoverable bento grid mapping deliverable stress levels.

---

## Installation & Running Guide

### Prerequisites
- Node.js (v18 or higher)
- npm (Node Package Manager)

### 1. Setup Dependencies
```bash
npm install
```

### 2. Configure Environment Secrets
Create a `.env` file in the root directory and specify your Gemini API Key:
```env
GEMINI_API_KEY="your-actual-api-key-here"
```

### 3. Running in Development Mode
To boot up the custom full-stack dev server:
```bash
npm run dev
```
The application will launch on port `3000` (default ingress) or locally at `http://localhost:3000`.

### 4. Compiling & Running in Production
```bash
npm run build
npm start
```
This will compile the client assets to `/dist` and compile `/server.ts` into a fast, standalone CommonJS bundle at `/dist/server.cjs` via `esbuild`.

---

*Designed and engineered with absolute scope discipline and premium aesthetics.*
