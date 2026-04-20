import { getDb, users, sessions } from '../db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const SESSION_COOKIE_NAME = 'aw_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  if (!db) throw new Error('Database not available');

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function validateSession(token: string): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const db = getDb();
    if (!db) return null;

    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    const session = result[0];
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
      return null;
    }

    return { userId: session.userId, sessionId: session.id };
  } catch (e) {
    console.error('validateSession error:', e);
    return null;
  }
}

export async function deleteSession(token: string): Promise<void> {
  try {
    const db = getDb();
    if (!db) return;
    await db.delete(sessions).where(eq(sessions.token, token));
  } catch (e) {
    console.error('deleteSession error:', e);
  }
}

export async function getUserByEmail(email: string) {
  try {
    const db = getDb();
    if (!db) return null;

    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return result[0] || null;
  } catch (e) {
    console.error('getUserByEmail error:', e);
    return null;
  }
}

export async function getUserById(id: string) {
  try {
    const db = getDb();
    if (!db) return null;

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] || null;
  } catch (e) {
    console.error('getUserById error:', e);
    return null;
  }
}

export async function createUser(email: string, password: string, name?: string) {
  const db = getDb();
  if (!db) throw new Error('Database not available');

  const passwordHash = await hashPassword(password);

  const result = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name,
    })
    .returning();

  return result[0];
}

export function setSessionCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_MS / 1000}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookie) return null;
  return sessionCookie.split('=')[1];
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export async function getSessionUser(cookieHeader: string | null): Promise<SessionUser | null> {
  try {
    const token = getSessionToken(cookieHeader);
    if (!token) return null;

    const session = await validateSession(token);
    if (!session) return null;

    const user = await getUserById(session.userId);
    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  } catch (e) {
    console.error('getSessionUser error:', e);
    return null;
  }
}