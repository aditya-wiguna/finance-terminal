import { redirect } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, request, url }) => {
  // Get raw cookie header for getSessionUser
  const cookieHeader = request.headers.get('cookie');
  const user = await getSessionUser(cookieHeader);

  // Allow access to login page without auth
  if (url.pathname === '/login') {
    if (user) {
      // If already logged in, redirect to dashboard
      throw redirect(302, '/');
    }
    return { user: null };
  }

  // Protect all other routes
  if (!user) {
    throw redirect(302, '/login');
  }

  return { user: { id: user.id, email: user.email, name: user.name } };
};