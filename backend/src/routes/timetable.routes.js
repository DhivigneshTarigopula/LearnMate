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
 * @route   GET /api/timetable
 * @desc    Get user's weekly timetable
 */
router.get('/', async (req, res) => {
  try {
    const userId = await getUserId(req);

    if (isSupabaseConfigured() && userId) {
      const { data, error } = await supabase
        .from('timetable')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

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
      message: 'Timetable service ready.',
      data: [],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/timetable
 * @desc    Create a single timetable slot
 */
router.post('/', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { subject, code, day, time, startTime, endTime, room, instructor, type, color } = req.body;

    if (!subject || !day || !time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: subject, day, and time are required.',
      });
    }

    if (isSupabaseConfigured() && userId) {
      const { data, error } = await supabase
        .from('timetable')
        .insert([{
          user_id: userId,
          subject,
          code: code || 'COURSE',
          day,
          start_time: startTime || (time ? time.split('-')[0]?.trim() : null),
          end_time: endTime || (time ? time.split('-')[1]?.trim() : null),
          time,
          room: room || 'TBA',
          instructor: instructor || 'Faculty',
          type: type || 'Lecture',
          color: color || 'blue',
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
        id: `tt_${Date.now()}`,
        subject,
        code,
        day,
        time,
        room,
        instructor,
        type,
        color,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/timetable/batch
 * @desc    Batch insert multiple classes from AI timetable extraction
 */
router.post('/batch', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { classes } = req.body;

    if (!Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: "classes" must be a non-empty array of timetable slots.',
      });
    }

    if (isSupabaseConfigured() && userId) {
      const rows = classes.map((item) => ({
        user_id: userId,
        subject: item.subject,
        code: item.code || 'COURSE',
        day: item.day,
        start_time: item.startTime || (item.time ? item.time.split('-')[0]?.trim() : null),
        end_time: item.endTime || (item.time ? item.time.split('-')[1]?.trim() : null),
        time: item.time,
        room: item.room || 'TBA',
        instructor: item.instructor || 'Faculty',
        type: item.type || 'Lecture',
        color: item.color || 'blue',
      }));

      const { data, error } = await supabase
        .from('timetable')
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

    const assigned = classes.map((item, idx) => ({
      ...item,
      id: item.id || `tt_batch_${Date.now()}_${idx}`,
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
 * @route   PUT /api/timetable/:id
 * @desc    Update a timetable slot
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req);
    const { id: _ignoredId, created_at: _ignoredCreatedAt, user_id: _ignoredUserId, ...updates } = req.body;

    if (isSupabaseConfigured()) {
      let query = supabase.from('timetable').update(updates).eq('id', id);
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
 * @route   DELETE /api/timetable/:id
 * @desc    Delete a timetable slot
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req);

    if (isSupabaseConfigured()) {
      let query = supabase.from('timetable').delete().eq('id', id);
      if (userId) query = query.eq('user_id', userId);

      const { error } = await query;
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: true, message: 'Class slot deleted' });
    }

    return res.status(200).json({ success: true, message: 'Class slot deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
