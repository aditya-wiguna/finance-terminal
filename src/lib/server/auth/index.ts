import { Client, Account, ID, Query } from 'appwrite';
import { getClient, getAccount, createDocument, findDocument, deleteDocument, DATABASE_ID } from '../db';
import { randomBytes } from 'crypto';

const SESSION_COLLECTION_ID = 'sessions';
const SESSION_COOKIE_NAME = 'aw_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export async function createUser(email: string, password: string, name?: string) {
  const account = getAccount();
  const user = await account.create(ID.unique(), email.toLowerCase(), password, name);
  return {
    id: user.$id,
    email: user.email,
    name: user.name || null,
  };
}

export async function loginUser(email: string, password: string) {
  console.log('[Auth] loginUser called with email:', email);
  const account = getAccount();
  console.log('[Auth] Calling createEmailPasswordSession');
  
  const session = await account.createEmailPasswordSession(email.toLowerCase(), password);
  console.log('[Auth] Session created, userId:', session.userId);
  
  // After createEmailPasswordSession, the client has session set internally
  // Try to call account.get() to get user info while session is active
  let userEmail = '';
  let userName = '';
  try {
    const user = await account.get();
    userEmail = user.email;
    userName = user.name || '';
    console.log('[Auth] Got user info via account.get():', userEmail);
  } catch (e) {
    console.log('[Auth] Could not get account info:', e);
    // Continue anyway - we have userId from session
  }
  
  // Generate our own session token
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  
  try {
    await createDocument(SESSION_COLLECTION_ID, {
      userId: session.userId,
      token: token,
      expiresAt: expiresAt,
      email: userEmail,
      name: userName,
    });
    console.log('[Auth] Custom session stored in DB');
  } catch (e) {
    console.error('[Auth] Failed to store session:', e);
  }
  
  return {
    sessionSecret: token,
    sessionId: session.$id,
    expire: session.expire,
    userId: session.userId,
  };
}

export async function getSessionUser(sessionSecret: string): Promise<SessionUser | null> {
  console.log('[Auth] getSessionUser called');
  console.log('[Auth] token:', sessionSecret ? `${sessionSecret.slice(0, 20)}...` : 'null');
  
  if (!sessionSecret) {
    return null;
  }
  
  try {
    const sessionDoc = await findDocument(SESSION_COLLECTION_ID, [
      Query.equal('token', sessionSecret),
      Query.limit(1),
    ]);
    
    if (!sessionDoc) {
      console.log('[Auth] Session not found in DB');
      return null;
    }
    
    // Check if expired
    if (new Date(sessionDoc.expiresAt as string) < new Date()) {
      await deleteDocument(SESSION_COLLECTION_ID, sessionDoc.$id);
      return null;
    }
    
    // Return user info from session document
    return {
      id: sessionDoc.userId as string,
      email: sessionDoc.email as string || '',
      name: (sessionDoc.name as string) || null,
    };
  } catch (e: any) {
    console.error('[Auth] getSessionUser error:', e?.message || e);
    return null;
  }
}

export async function logoutUser(sessionSecret: string): Promise<void> {
  try {
    const sessionDoc = await findDocument(SESSION_COLLECTION_ID, [
      Query.equal('token', sessionSecret),
      Query.limit(1),
    ]);
    if (sessionDoc) {
      await deleteDocument(SESSION_COLLECTION_ID, sessionDoc.$id);
    }
  } catch (e) {
    console.error('Logout error:', e);
  }
}

export function getSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookie) return null;
  return sessionCookie.split('=')[1];
}

export async function getSessionUserFromCookie(cookieHeader: string | null): Promise<SessionUser | null> {
  const token = getSessionToken(cookieHeader);
  if (!token) return null;
  return getSessionUser(token);
}