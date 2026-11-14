# LearnMate — Smart Student Study Management

LearnMate is an all-in-one productivity and study management application designed for students. It combines timetable scheduling, assignment and exam tracking, notes management, Pomodoro study sessions, interactive quizzes, and visual progress analytics.

---

## 📁 Project Structure

```text
LearnMate/
├── backend/                   # Node.js + Express Backend Service
│   ├── src/
│   │   ├── config/            # Supabase Backend Configuration
│   │   │   └── supabase.js
│   │   ├── middleware/        # Centralized Error & 404 Handlers
│   │   │   ├── errorHandler.js
│   │   │   └── notFoundHandler.js
│   │   ├── routes/            # Modular API Route Controllers
│   │   │   ├── assignments.routes.js
│   │   │   ├── auth.routes.js
│   │   │   ├── exams.routes.js
│   │   │   ├── health.routes.js
│   │   │   ├── notes.routes.js
│   │   │   ├── progress.routes.js
│   │   │   ├── quizzes.routes.js
│   │   │   ├── studySessions.routes.js
│   │   │   └── timetable.routes.js
│   │   ├── app.js             # Express App Configuration & Middleware
│   │   └── server.js          # Server Entrypoint (Port 5000)
│   ├── .env.example           # Backend environment template
│   ├── .env                   # Backend local environment variables
│   ├── .gitignore             # Backend gitignore (node_modules, .env)
│   └── package.json           # Backend dependencies and scripts
│
├── database/                  # PostgreSQL Database Migrations & Schemas
│   └── schema.sql             # Supabase Tables, Triggers, & RLS Policies
│
├── src/                       # React Frontend Application (Vite)
│   ├── components/            # Reusable UI, Guards, & Layout Components
│   │   ├── common/
│   │   │   ├── Modal.jsx
│   │   │   ├── ProtectedRoute.jsx  # Auth Route Guard
│   │   │   └── Toast.jsx
│   │   └── layout/
│   ├── context/
│   │   └── AppContext.jsx     # Supabase Auth, Session Persistence, & CRUD Sync
│   ├── lib/
│   │   └── supabaseClient.js  # Reusable Supabase Frontend Client & Fallback Helper
│   ├── pages/                 # Frontend Pages & Views
│   ├── App.jsx                # App Shell, Routing, & Protected Routes
│   └── main.jsx               # React DOM Entrypoint
├── .env.example               # Frontend environment template
├── .env                       # Frontend local environment variables
├── package.json               # Frontend dependencies (Vite + React)
└── vite.config.js             # Vite Configuration (Port 5173)
```

---

## ⚡ Supabase Setup Guide

Follow these simple steps to connect your real Supabase project:

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in or create a free account.
2. Click **New Project** and choose a project name (e.g., `learnmate-app`) and database password.
3. Select your closest region and click **Create new project**.

### Step 2: Retrieve your Project URL & Anon Key
1. In your Supabase Dashboard, click on **Project Settings** (gear icon in the sidebar) -> **API**.
2. Find the **Project URL** (e.g., `https://xyzcompany.supabase.co`).
3. Find the **Project API keys** and copy the **`anon` / `public`** key.
   *(⚠️ Never use or copy the `service_role` secret key into your frontend code).*

### Step 3: Configure Environment Variables
1. In the root `LearnMate` folder, open `.env` (or copy from `.env.example`):
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-publishable-key-here
   ```
2. In the `backend` folder, open `backend/.env` (or copy from `backend/.env.example`):
   ```env
   PORT=5000
   CLIENT_URL=http://localhost:5173
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-publishable-key-here
   ```

### Step 4: Run the SQL Schema Migration
1. In your Supabase Dashboard, open the **SQL Editor** from the left navigation.
2. Click **New query**.
3. Copy the entire contents of [`database/schema.sql`](./database/schema.sql) and paste them into the editor.
4. Click **Run**.
5. All 7 tables (`profiles`, `timetable`, `assignments`, `notes`, `exams`, `study_sessions`, `quizzes`) will be created with:
   - Foreign keys to `auth.users(id)`.
   - Automatic user profile trigger on signup.
   - Row Level Security (RLS) enabled on all tables with user isolation policies (`auth.uid() = user_id`).

---

## 🔒 Security & Row Level Security (RLS)

All user-data tables in `database/schema.sql` have Row Level Security enabled.
- **Data Isolation:** Authenticated users can only read, insert, update, and delete rows where `auth.uid() = user_id` (or `auth.uid() = id` for `profiles`).
- **Owner Verification:** Queries attempting to access or modify records belonging to another student ID are blocked at the PostgreSQL engine level.
- **Zero Secrets in Frontend:** Only the safe publishable `anon` key is exposed to the browser. The `service_role` secret key is never used on the client.

---

## 🚀 Running the Project

### 1. Starting the Frontend

Open a terminal in the root `LearnMate` folder:

```powershell
# Install frontend dependencies
npm.cmd install

# Start the Vite development server
npm.cmd run dev
```

- **Frontend URL:** [http://localhost:5173/](http://localhost:5173/)

---

### 2. Starting the Backend

Open a separate terminal window and navigate into the `backend` folder:

```powershell
cd backend

# Install backend dependencies
npm.cmd install

# Start the backend with Nodemon (auto-reloads on file changes)
npm.cmd run dev
```

- **Backend Base URL:** [http://localhost:5000/](http://localhost:5000/)
- **Health Check Endpoint:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Testing Authentication & Database Sync

1. Open [http://localhost:5173/](http://localhost:5173/) in your browser.
2. Click **Register free** to navigate to `/signup` or **Sign In** to navigate to `/login`.
3. Fill in your email and password to create an account or sign in with your Supabase credentials.
4. If your credentials are not yet configured in `.env`, LearnMate gracefully activates **Quick Evaluation Mode**, allowing you to test all timetable and assignment features without crashing.
5. In the **Timetable** page: Add, edit, view, and delete class slots.
6. In the **Assignments** page: Create coursework, update completion status, edit due dates/priorities, and delete assignments.
