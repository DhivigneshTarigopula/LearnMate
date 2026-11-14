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
 * @route   GET /api/notes
 * @desc    Get user's text notes
 */
router.get('/', async (req, res) => {
  try {
    const userId = await getUserId(req);

    if (isSupabaseConfigured() && userId) {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

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
      message: 'Notes service ready.',
      data: [],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   POST /api/notes
 * @desc    Create a new note
 */
router.post('/', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { title, subject, content, tags, favorite } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: title is required.',
      });
    }

    if (isSupabaseConfigured() && userId) {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          user_id: userId,
          title,
          subject: subject || 'General',
          content: content || '',
          tags: Array.isArray(tags) ? tags : [],
          favorite: Boolean(favorite)
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
        id: `note_${Date.now()}`,
        title,
        subject: subject || 'General',
        content: content || '',
        tags: tags || [],
        favorite: false
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @route   PUT /api/notes/:id
 * @desc    Update a note
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req);
    const updates = req.body;

    if (isSupabaseConfigured() && userId) {
      const payload = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.subject !== undefined) payload.subject = updates.subject;
      if (updates.content !== undefined) payload.content = updates.content;
      if (updates.tags !== undefined) payload.tags = updates.tags;
      if (updates.favorite !== undefined) payload.favorite = updates.favorite;

      const { data, error } = await supabase
        .from('notes')
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
 * @route   DELETE /api/notes/:id
 * @desc    Delete a note
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = await getUserId(req);

    if (isSupabaseConfigured() && userId) {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, message: `Note ${id} deleted.` });
    }

    return res.status(200).json({ success: true, message: `Note ${id} removed.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
