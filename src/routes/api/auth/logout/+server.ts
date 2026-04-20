import { json } from '@sveltejs/kit';
import { deleteSession, getSessionToken } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ cookies }) => {
  const token = getSessionToken(cookies.get('aw_session') || null);

  if (token) {
    await deleteSession(token);
  }

  cookies.delete('aw_session', { path: '/' });

  return json({ success: true });
};