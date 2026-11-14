import { Router } from 'express';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Registers a new user via Supabase Auth
 */
router.post('/signup', async (req, res, next) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Supabase credentials are not configured in backend/.env. Please set SUPABASE_URL and SUPABASE_ANON_KEY.',
      });
    }

    const { email, password, name, institution, program, redirectTo } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const emailRedirectTo = redirectTo || `${clientUrl}/login?confirmed=true`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: name || 'Student User',
          institution: institution || 'Stanford University',
          program: program || 'Computer Science (B.Sc.)',
        },
      },
    });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({
      success: true,
      user: data.user,
      session: data.session,
      message: 'User registered successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/auth/resend-confirmation
 * @desc    Resends email confirmation link via Supabase Auth (Gmail SMTP)
 */
router.post('/resend-confirmation', async (req, res, next) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Supabase credentials are not configured.',
      });
    }

    const { email, redirectTo } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const emailRedirectTo = redirectTo || `${clientUrl}/login?confirmed=true`;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo },
    });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Confirmation email resent successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates user using Supabase Auth
 */
router.post('/login', async (req, res, next) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Supabase credentials are not configured in backend/.env. Please set SUPABASE_URL and SUPABASE_ANON_KEY.',
      });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      user: data.user,
      session: data.session,
      message: 'Login successful.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Retrieves profile of the authenticated user
 */
router.get('/profile', async (req, res, next) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Supabase credentials are not configured in backend/.env.',
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization Bearer token required.' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return res.status(200).json({
      success: true,
      user,
      profile: profile || null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
