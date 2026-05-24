import { json } from '@sveltejs/kit';
import { createUser, loginUser } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { email, password, name, action } = await request.json();

    if (action === 'register') {
      console.log('[Auth API] Register action - creating user');
      const user = await createUser(email, password, name);
      console.log('[Auth API] User created:', user.id);

      console.log('[Auth API] Logging in user');
      const loginResult = await loginUser(email, password);
      console.log('[Auth API] Login success, token:', loginResult.sessionSecret.slice(0, 20) + '...');

      cookies.set('aw_session', loginResult.sessionSecret, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        secure: false,
      });
      console.log('[Auth API] Cookie set');

      return json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    }

    if (action === 'login') {
      try {
        console.log('[Auth API] Login action - calling loginUser');
        const loginResult = await loginUser(email, password);
        console.log('[Auth API] Login success, token:', loginResult.sessionSecret.slice(0, 20) + '...');

        cookies.set('aw_session', loginResult.sessionSecret, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          secure: false,
        });
        console.log('[Auth API] Cookie set');

        return json({ success: true, user: { id: loginResult.userId, email } });
      } catch (e: any) {
        console.error('[Auth API] Login failed:', e?.message || e);
        return json({ error: 'Invalid email or password' }, { status: 401 });
      }
    }

    return json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Auth error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};