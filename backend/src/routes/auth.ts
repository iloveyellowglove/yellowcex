import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { supabaseAdmin } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { walletService } from '../services/walletService';
import type { Currency } from '@yellowcex/shared';
import { SUPPORTED_CURRENCIES } from '@yellowcex/shared';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const googleAuthSchema = z.object({
  googleId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  avatar_url: z.string().optional(),
});

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Check existing user
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({ email, name, avatar_url: null })
      .select('id, email, name, avatar_url, kyc_status, created_at')
      .single();

    if (error || !user) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create user' });
      return;
    }

    // Store password hash in auth.users via Supabase admin
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    // Create wallets and balances for all supported currencies
    for (const currency of SUPPORTED_CURRENCIES) {
      await walletService.createWallet(user.id, currency);
    }

    const token = jwt.sign({ userId: user.id, email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);

    res.json({
      success: true,
      data: { user, token },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Verify via Supabase auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ userId: user.id, email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);

    res.json({
      success: true,
      data: { user, token },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/google
router.post('/google', validate(googleAuthSchema), async (req: Request, res: Response) => {
  try {
    const { googleId, email, name, avatar_url } = req.body;

    let { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .single();

    if (!user) {
      // Check if email exists
      const { data: existingByEmail } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingByEmail) {
        // Link Google to existing account
        const { data: updated } = await supabaseAdmin
          .from('users')
          .update({ google_id: googleId, avatar_url })
          .eq('id', existingByEmail.id)
          .select('*')
          .single();
        user = updated;
      } else {
        // Create new user
        const { data: newUser } = await supabaseAdmin
          .from('users')
          .insert({ email, name: name ?? email.split('@')[0], google_id: googleId, avatar_url })
          .select('*')
          .single();

        if (newUser) {
          user = newUser;
          for (const currency of SUPPORTED_CURRENCIES) {
            await walletService.createWallet(user!.id, currency);
          }
        }
      }
    }

    if (!user) {
      res.status(500).json({ success: false, error: 'Failed to authenticate' });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);

    res.json({
      success: true,
      data: { user, token },
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.user!.userId)
      .single();

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const updates: Record<string, unknown> = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.avatar_url) updates.avatar_url = req.body.avatar_url;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', req.user!.userId)
      .select('*')
      .single();

    if (error || !user) {
      res.status(500).json({ success: false, error: error?.message || 'Update failed' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
