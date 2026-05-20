import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { supabaseAdmin } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { walletService } from '../services/walletService';
import { SUPPORTED_CURRENCIES } from '@yellowcex/shared';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  ref: z.string().optional(),
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
    const { email, password, name, ref } = req.body;

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
      try {
        await walletService.createWallet(user.id, currency);
      } catch (err) {
        console.error(`Wallet creation failed for ${user.email} ${currency}:`, err instanceof Error ? err.message : err);
        // Continue — don't fail registration over wallet creation errors
      }
    }

    // Generate a unique referral code for the new user
    const referralCode = Array.from({ length: 8 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
    ).join('');

    // Use direct REST call for writes (Supabase JS client may not bypass RLS reliably)
    const headers = {
      apikey: config.supabase.serviceRoleKey,
      Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
      'Content-Type': 'application/json',
    };

    await fetch(
      `${config.supabase.url}/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`,
      { method: 'PATCH', headers, body: JSON.stringify({ referral_code: referralCode }) }
    );

    // Process referral if `ref` was provided
    if (ref) {
      try {
        const refRes = await fetch(
          `${config.supabase.url}/rest/v1/users?select=id&referral_code=eq.${encodeURIComponent(ref)}`,
          { headers }
        );
        const referrers = await refRes.json() as Array<{ id: string }>;

        if (referrers.length > 0) {
          await fetch(
            `${config.supabase.url}/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`,
            { method: 'PATCH', headers, body: JSON.stringify({ referred_by: referrers[0].id }) }
          );
        }
      } catch (err) {
        console.error('Referral lookup failed:', err instanceof Error ? err.message : err);
      }
    }

    const token = jwt.sign({ userId: user.id, email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);

    res.json({
      success: true,
      data: { user, token },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Verify via Supabase auth first (constant-time for invalid emails)
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Fetch user profile from public.users
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  avatar_url: z.string().url().optional(),
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, validate(profileSchema), async (req: Request, res: Response) => {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
