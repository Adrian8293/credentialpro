import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, role } = req.body || {};

    if (!email || !role) {
      return res.status(400).json({ error: 'Missing email or role' });
    }

    const admin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.APP_URL}/reset-password.html`
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const userId = data.user?.id;

    if (userId) {
      const { error: roleError } = await admin.from('user_roles').upsert(
        { user_id: userId, email, role },
        { onConflict: 'user_id' }
      );

      if (roleError) {
        return res.status(400).json({ error: roleError.message });
      }
    }

    const { error: inviteError } = await admin.from('invitations').upsert(
      { email, role, invited_by: null, accepted: false },
      { onConflict: 'email' }
    );

    if (inviteError) {
      return res.status(400).json({ error: inviteError.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
