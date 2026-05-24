import { json } from '@sveltejs/kit';
import { getSessionToken, logoutUser } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ cookies }) => {
  const sessionSecret = getSessionToken(cookies.get('aw_session') || null);

  if (sessionSecret) {
    await logoutUser(sessionSecret);
  }

  cookies.delete('aw_session', { path: '/' });

  return json({ success: true });
};