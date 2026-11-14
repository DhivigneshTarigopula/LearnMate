import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import Route Handlers
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import timetableRoutes from './routes/timetable.routes.js';
import assignmentsRoutes from './routes/assignments.routes.js';
import notesRoutes from './routes/notes.routes.js';
import examsRoutes from './routes/exams.routes.js';
import studySessionsRoutes from './routes/studySessions.routes.js';
import quizzesRoutes from './routes/quizzes.routes.js';
import progressRoutes from './routes/progress.routes.js';
import aiDoubtSolverRoutes from './routes/aiDoubtSolver.routes.js';

// Import Middleware
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// ==========================================
// Standard Middleware
// ==========================================

// Enable Cross-Origin Resource Sharing (CORS)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// ==========================================
// Base & API Routes
// ==========================================

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'LearnMate API',
    version: '1.0.0',
    description: 'Smart Student Study Management Backend',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      timetable: '/api/timetable',
      assignments: '/api/assignments',
      notes: '/api/notes',
      exams: '/api/exams',
      studySessions: '/api/study-sessions',
      quizzes: '/api/quizzes',
      progress: '/api/progress',
      doubtSolver: '/api/doubt-solver',
    },
  });
});

// Mount modular API routers
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/study-sessions', studySessionsRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/doubt-solver', aiDoubtSolverRoutes);

// ==========================================
// Error Handling Middleware
// ==========================================

// Catch 404 for unknown endpoints
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
