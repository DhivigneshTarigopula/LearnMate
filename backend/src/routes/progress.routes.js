import { Router } from 'express';

const router = Router();

/**
 * Progress & Analytics Routes (Placeholder Structure)
 * Serves study statistics, weekly hours, and completion metrics.
 */

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Progress route ready. Database storage not yet connected.',
    data: {
      studyHours: 0,
      tasksCompleted: 0,
      streakDays: 0,
    },
  });
});

router.get('/analytics', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Analytics metrics ready. Database storage not yet connected.',
    data: {
      weeklyTrend: [],
      subjectBreakdown: [],
    },
  });
});

export default router;
