import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

const router = Router();

/**
 * Helper to get user ID from Authorization Bearer token or fallback header
 */
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
 * @route   GET /api/assignments
 * @desc    Get user's assignments
 */
router.get('/', async (req, res) => {
  try {
    const userId = await getUserId(req);

    if (isSupabaseConfigured() && userId) {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

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
      message: 'Assignments service ready.',
      data: [],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/assignments
 * @desc    Create a new assignment
 */
router.post('/', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { title, subject, courseCode, dueDate, priority, description, status } = req.body;

    if (!title || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title and subject are required.',
      });
    }

    if (isSupabaseConfigured() && userId) {
      const { data, error } = await supabase
        .from('assignments')
        .insert([{
          user_id: userId,
          title,
          subject,
          course_code: courseCode || '',
          due_date: dueDate || new Date().toISOString().split('T')[0],
          priority: priority || 'medium',
          description: description || '',
          status: status || 'pending'
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
        id: `asg_${Date.now()}`,
        title,
        subject,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        priority: priority || 'medium',
        status: 'pending'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/assignments/batch
 * @desc    Batch insert multiple assignments (e.g. from AI extraction)
 */
router.post('/batch', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { assignments: batchItems } = req.body;

    if (!Array.isArray(batchItems) || batchItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Expected an array of assignments in req.body.assignments',
      });
    }

    if (isSupabaseConfigured() && userId) {
      const rows = batchItems.map((item) => ({
        user_id: userId,
        title: item.title,
        subject: item.subject,
        course_code: item.courseCode || '',
        due_date: item.dueDate || new Date().toISOString().split('T')[0],
        priority: item.priority || 'medium',
        description: item.description || '',
        status: item.status || 'pending'
      }));

      const { data, error } = await supabase
        .from('assignments')
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

    return res.status(201).json({
      success: true,
      count: batchItems.length,
      data: batchItems,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   PUT /api/assignments/:id
 * @desc    Update assignment details or completion status
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req);
    const updates = req.body;

    if (isSupabaseConfigured() && userId) {
      const payload = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.subject !== undefined) payload.subject = updates.subject;
      if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.status !== undefined) payload.status = updates.status;

      const { data, error } = await supabase
        .from('assignments')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, data });
    }

    return res.status(200).json({ success: true, data: { id, ...updates } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   DELETE /api/assignments/:id
 * @desc    Delete an assignment
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req);

    if (isSupabaseConfigured() && userId) {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, message: `Assignment ${id} deleted.` });
    }

    return res.status(200).json({ success: true, message: `Assignment ${id} removed.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
