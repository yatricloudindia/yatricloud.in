import { createClient } from '@supabase/supabase-js';

/**
 * Shared admin role & credential logic, used by BOTH the Vercel function
 * (api/admin-users.ts) and the local dev server (server.js /api/admin-users).
 * Works on a duck-typed { method, body, status, json } request/response so both
 * express and Vercel call it identically.
 *
 * Body: { access_token, action, ... }
 *   access_token — caller's Supabase access token (proves who is asking)
 *   action       — 'create' | 'update' | 'resetPassword' | 'delete'
 *
 * Authorization: caller must be an ACTIVE admin whose admin_users.role is
 * 'super_admin' or 'admin'. Only a super_admin can create/change a super_admin.
 * Nobody can delete/demote/disable the last super_admin.
 */

const ROLES = ['super_admin', 'admin', 'manager', 'support', 'auditor'];

function randomPassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const a = new Uint32Array(len);
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(a);
  } else {
    for (let i = 0; i < len; i++) a[i] = Math.floor(Math.random() * 0xffffffff);
  }
  let out = '';
  for (let i = 0; i < len; i++) out += chars[a[i] % chars.length];
  return out;
}

export async function handleAdminUsers(req, res) {
  if (req.method !== 'POST') {
    if (res.setHeader) res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(500).json({ ok: false, message: 'Server is not configured for admin management.' });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { access_token, action } = req.body || {};
  if (!access_token || !action) {
    return res.status(400).json({ ok: false, message: 'This request is missing details.' });
  }

  try {
    // Who is asking?
    const { data: { user }, error: userErr } = await admin.auth.getUser(access_token);
    if (userErr || !user) return res.status(401).json({ ok: false, message: 'Please sign in again.' });

    const { data: profile, error: profErr } = await admin
      .from('profiles').select('id, email, role').eq('id', user.id).single();
    if (profErr || !profile) return res.status(403).json({ ok: false, message: 'No profile for this account.' });

    const { data: callerAdmin } = await admin
      .from('admin_users').select('role, is_active').eq('id', user.id).single();

    // Bootstrap: if no admin_users rows exist yet (fresh system), the existing
    // 'admin' profile is treated as super_admin so the owner can set up the tree.
    const { count: adminCount } = await admin
      .from('admin_users').select('id', { count: 'exact', head: true });
    const isBootstrap = (adminCount ?? 0) === 0;

    const callerRole = (callerAdmin && (callerAdmin.role === 'super_admin' || callerAdmin.role === 'admin'))
      ? callerAdmin.role
      : (isBootstrap && profile.role === 'admin' ? 'super_admin' : null);

    if (!callerRole) {
      return res.status(403).json({ ok: false, message: 'This account does not have permission to manage admins.' });
    }
    if (callerAdmin && !callerAdmin.is_active) {
      return res.status(403).json({ ok: false, message: 'This account is disabled.' });
    }
    const canManageSuper = callerRole === 'super_admin';

    if (action === 'create') {
      const { email, fullName, role = 'admin', permissions = [] } = req.body;
      const cleanRole = ROLES.includes(role) ? role : 'admin';
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ ok: false, message: 'Email is required.' });
      }
      if (cleanRole === 'super_admin' && !canManageSuper) {
        return res.status(403).json({ ok: false, message: 'Only a Super Admin can create a Super Admin.' });
      }
      const password = randomPassword();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || email },
      });
      if (createErr) return res.status(400).json({ ok: false, message: createErr.message });

      const newId = created?.user?.id;
      if (!newId) return res.status(500).json({ ok: false, message: 'User created but no id returned.' });

      // profile auto-created by handle_new_user trigger (role 'yatri'); promote + add row.
      await admin.from('profiles').update({ role: 'admin', full_name: fullName || email }).eq('id', newId);
      const { error: rowErr } = await admin.from('admin_users').insert({
        id: newId,
        role: cleanRole,
        permissions: Array.isArray(permissions) ? permissions : [],
        is_active: true,
        created_by: user.id,
      });
      if (rowErr) return res.status(500).json({ ok: false, message: rowErr.message });

      return res.json({ ok: true, email: email.trim().toLowerCase(), tempPassword: password, userId: newId });
    }

    if (action === 'update') {
      const { userId, role, permissions, isActive } = req.body;
      if (!userId) return res.status(400).json({ ok: false, message: 'userId is required.' });

      const { data: target } = await admin.from('admin_users').select('role, is_active').eq('id', userId).single();
      if (!target) return res.status(404).json({ ok: false, message: 'Admin not found.' });
      const newRole = role ? (ROLES.includes(role) ? role : target.role) : target.role;
      if (newRole === 'super_admin' && !canManageSuper) {
        return res.status(403).json({ ok: false, message: 'Only a Super Admin can manage a Super Admin.' });
      }
      if (target.role === 'super_admin' && !canManageSuper) {
        return res.status(403).json({ ok: false, message: 'Only a Super Admin can edit a Super Admin.' });
      }
      if (userId === user.id && (isActive === false || newRole !== 'super_admin')) {
        const { count } = await admin.from('admin_users').select('id', { count: 'exact', head: true }).eq('role', 'super_admin').eq('is_active', true);
        if ((count ?? 0) <= 1) {
          return res.status(400).json({ ok: false, message: 'You are the last Super Admin and cannot be demoted or disabled.' });
        }
      }
      const patch = {};
      if (role !== undefined) patch.role = newRole;
      if (permissions !== undefined) patch.permissions = Array.isArray(permissions) ? permissions : [];
      if (isActive !== undefined) patch.is_active = !!isActive;
      const { error: upErr } = await admin.from('admin_users').update(patch).eq('id', userId);
      if (upErr) return res.status(500).json({ ok: false, message: upErr.message });
      return res.json({ ok: true });
    }

    if (action === 'resetPassword') {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ ok: false, message: 'userId is required.' });
      const { data: target } = await admin.from('admin_users').select('role, is_active').eq('id', userId).single();
      if (!target) return res.status(404).json({ ok: false, message: 'Admin not found.' });
      if (target.role === 'super_admin' && !canManageSuper) {
        return res.status(403).json({ ok: false, message: 'Only a Super Admin can reset a Super Admin password.' });
      }
      const password = randomPassword();
      const { error: upErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (upErr) return res.status(400).json({ ok: false, message: upErr.message });
      return res.json({ ok: true, tempPassword: password });
    }

    if (action === 'delete') {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ ok: false, message: 'userId is required.' });
      if (userId === user.id) return res.status(400).json({ ok: false, message: 'You cannot delete your own account.' });
      const { data: target } = await admin.from('admin_users').select('role, is_active').eq('id', userId).single();
      if (!target) return res.status(404).json({ ok: false, message: 'Admin not found.' });
      if (target.role === 'super_admin' && !canManageSuper) {
        return res.status(403).json({ ok: false, message: 'Only a Super Admin can delete a Super Admin.' });
      }
      const { count } = await admin.from('admin_users').select('id', { count: 'exact', head: true }).eq('role', 'super_admin').eq('is_active', true);
      if (target.role === 'super_admin' && (count ?? 0) <= 1) {
        return res.status(400).json({ ok: false, message: 'You cannot delete the last Super Admin.' });
      }
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) return res.status(400).json({ ok: false, message: delErr.message });
      return res.json({ ok: true });
    }

    return res.status(400).json({ ok: false, message: `Unknown action: ${action}` });
  } catch (e) {
    console.error('❌ admin-users:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
}
