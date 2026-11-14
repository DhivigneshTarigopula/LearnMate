import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { TimetablePage } from './pages/TimetablePage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { NotesPage } from './pages/NotesPage';
import { ExamPlannerPage } from './pages/ExamPlannerPage';
import { StudyPlannerPage } from './pages/StudyPlannerPage';
import { QuizzesPage } from './pages/QuizzesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { DoubtSolverPage } from './pages/DoubtSolverPage';

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Authenticated Workspace App Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/timetable" element={<TimetablePage />} />
              <Route path="/assignments" element={<AssignmentsPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/exams" element={<ExamPlannerPage />} />
              <Route path="/study-planner" element={<StudyPlannerPage />} />
              <Route path="/quizzes" element={<QuizzesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/doubt-solver" element={<DoubtSolverPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
