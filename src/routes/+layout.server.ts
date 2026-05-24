import { redirect } from '@sveltejs/kit';
import { getSessionUserFromCookie } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, request, url }) => {
  const cookieHeader = request.headers.get('cookie');
  const user = await getSessionUserFromCookie(cookieHeader);

  if (url.pathname === '/login') {
    if (user) {
      throw redirect(302, '/');
    }
    return { user: null };
  }

  if (!user) {
    throw redirect(302, '/login');
  }

  return { user: { id: user.id, email: user.email, name: user.name } };
};