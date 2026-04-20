import { json, redirect } from '@sveltejs/kit';
import { createUser, getUserByEmail, verifyPassword, createSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { email, password, name, action } = await request.json();

    if (action === 'register') {
      // Check if user exists
      const existing = await getUserByEmail(email);
      if (existing) {
        return json({ error: 'Email already registered' }, { status: 400 });
      }

      // Create user
      const user = await createUser(email, password, name);
      const token = await createSession(user.id);

      cookies.set('aw_session', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        secure: false,
      });

      return json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    }

    if (action === 'login') {
      const user = await getUserByEmail(email);
      if (!user) {
        return json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const token = await createSession(user.id);

      cookies.set('aw_session', token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        secure: false,
      });

      return json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    }

    return json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Auth error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};