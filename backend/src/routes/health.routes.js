import { Router } from 'express';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint to verify backend service status
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'LearnMate'
  });
});

export default router;
