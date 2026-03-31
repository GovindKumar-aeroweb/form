import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import crypto from 'crypto';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Supabase admin client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  let supabaseAdmin: ReturnType<typeof createClient> | null = null;
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Submit form securely
  app.post('/api/submissions/:formId', async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase admin client not configured' });
      }

      const { formId } = req.params;
      const { answers, submitterEmail } = req.body;
      
      // Get auth token from header to identify user if logged in
      const authHeader = req.headers.authorization;
      let userId = null;
      
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
        }
      }

      // Generate IP hash for abuse prevention and one-response-per-user
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const ipHash = crypto.createHash('sha256').update(String(ip)).digest('hex');

      // Call the secure RPC function to insert submission
      const { data, error } = await (supabaseAdmin as any).rpc('submit_form_safe', {
        p_form_id: formId,
        p_user_id: userId,
        p_submitter_email: submitterEmail || null,
        p_ip_hash: ipHash,
        p_answers: answers
      });

      if (error) {
        console.error('Submission error:', error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ success: true, submissionId: data });
    } catch (err: any) {
      console.error('Server error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
