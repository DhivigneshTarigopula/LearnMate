import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

const router = Router();

async function getUserId(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && isSupabaseConfigured()) {
    const token = authHeader.replace('Bearer ', '').trim();
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user?.id) return user.id;
    } catch {}
  }
  return req.headers['x-user-id'] || req.query.userId || req.body?.userId || null;
}

/**
 * @route   GET /api/exams
 * @desc    Get user's scheduled exams ordered chronologically
 */
router.get('/', async (req, res) => {
  try {
    const userId = await getUserId(req);

    if (isSupabaseConfigured() && userId) {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', userId)
        .order('exam_date', { ascending: true });

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({
        success: true,
        count: data?.length || 0,
        data: data || [],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Exams service ready.',
      data: [],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/exams
 * @desc    Schedule a new exam
 */
router.post('/', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { subject, code, examName, date, time, venue, weight, topics } = req.body;

    if (!subject || !date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: subject and date are required.',
      });
    }

    if (isSupabaseConfigured() && userId) {
      const { data, error } = await supabase
        .from('exams')
        .insert([{
          user_id: userId,
          subject,
          code: code || '',
          exam_date: new Date(date).toISOString(),
          syllabus: examName || 'Exam Paper',
          room: venue || 'Main Exam Hall',
          weight: weight || '35%',
          topics: topics || [],
        }])
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(201).json({ success: true, data });
    }

    return res.status(201).json({
      success: true,
      data: {
        id: `ex_${Date.now()}`,
        subject,
        code,
        examName,
        date,
        time,
        venue,
        weight,
        topics: topics || [],
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/exams/batch
 * @desc    Batch insert multiple exams from AI exam schedule extraction
 */
router.post('/batch', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { exams } = req.body;

    if (!Array.isArray(exams) || exams.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: "exams" must be a non-empty array of exam papers.',
      });
    }

    if (isSupabaseConfigured() && userId) {
      const rows = exams.map((item) => ({
        user_id: userId,
        subject: item.subject,
        code: item.code || '',
        exam_date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
        syllabus: item.examName || 'Exam Paper',
        room: item.venue || item.room || 'Main Exam Hall',
        weight: item.weight || '35%',
        topics: item.topics || [],
      }));

      const { data, error } = await supabase
        .from('exams')
        .insert(rows)
        .select();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(201).json({
        success: true,
        count: data?.length || 0,
        data: data || [],
      });
    }

    const assigned = exams.map((item, idx) => ({
      ...item,
      id: item.id || `ex_batch_${Date.now()}_${idx}`,
    }));

    return res.status(201).json({
      success: true,
      count: assigned.length,
      data: assigned,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   PUT /api/exams/:id
 * @desc    Update an exam or checklist
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req);
    const updates = req.body;

    if (isSupabaseConfigured()) {
      let query = supabase.from('exams').update(updates).eq('id', id);
      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query.select();
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true, data: data?.[0] || null });
    }

    return res.status(200).json({
      success: true,
      data: { id, ...updates },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   DELETE /api/exams/:id
 * @desc    Delete an exam
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req);

    if (isSupabaseConfigured()) {
      let query = supabase.from('exams').delete().eq('id', id);
      if (userId) query = query.eq('user_id', userId);

      const { error } = await query;
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true, message: 'Exam deleted' });
    }

    return res.status(200).json({ success: true, message: 'Exam deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
