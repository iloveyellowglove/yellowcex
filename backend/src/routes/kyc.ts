import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { supabaseAdmin } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { config } from '../config';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, PDF'));
    }
  },
});

const submissionSchema = z.object({
  document_type: z.enum(['passport', 'drivers_license', 'national_id']),
});

// POST /api/kyc/submit
router.post(
  '/submit',
  authMiddleware,
  upload.single('file'),
  validate(submissionSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { document_type } = req.body;

      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      // Upload to Supabase Storage
      const filePath = `kyc/${userId}/${Date.now()}_${req.file.originalname}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('kyc-documents')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        res.status(500).json({ success: false, error: uploadError.message });
        return;
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);

      // Create KYC record
      const { data: doc, error } = await supabaseAdmin
        .from('kyc_documents')
        .insert({
          user_id: userId,
          document_type,
          image_url: urlData.publicUrl,
        })
        .select('*')
        .single();

      if (error || !doc) {
        res.status(500).json({ success: false, error: error?.message || 'Failed to create KYC record' });
        return;
      }

      // Update user KYC status
      await supabaseAdmin
        .from('users')
        .update({ kyc_status: 'pending' })
        .eq('id', userId);

      res.json({ success: true, data: doc });
    } catch (err: any) {
      console.error('KYC submit error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// GET /api/kyc/status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { data: docs } = await supabaseAdmin
      .from('kyc_documents')
      .select('*')
      .eq('user_id', req.user!.userId)
      .order('submitted_at', { ascending: false });

    res.json({ success: true, data: docs ?? [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
