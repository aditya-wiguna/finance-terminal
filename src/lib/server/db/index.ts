import { Client, Account, ID } from 'appwrite';
import { PUBLIC_APPWRITE_PROJECT_ID, PUBLIC_APPWRITE_ENDPOINT } from '$env/static/public';
import './migrate';

const client = new Client();
client.setEndpoint(PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1');
client.setProject(PUBLIC_APPWRITE_PROJECT_ID || '');

const account = new Account(client);

export function getClient() {
  return client;
}

export function getAccount() {
  return account;
}

export function getClientWithSession(sessionSecret: string) {
  const sessionClient = new Client();
  sessionClient.setEndpoint(PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1');
  sessionClient.setProject(PUBLIC_APPWRITE_PROJECT_ID || '');
  sessionClient.setSession(sessionSecret);
  return sessionClient;
}

export function getAccountWithSession(sessionSecret: string) {
  return new Account(getClientWithSession(sessionSecret));
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export function isAppwriteConfigured(): boolean {
  return !!(PUBLIC_APPWRITE_PROJECT_ID && PUBLIC_APPWRITE_ENDPOINT);
}

// Database/Collection helpers
const DATABASE_ID = '6a1312b6002c29b2287c';
const CACHE_COLLECTION_ID = 'cache';
const PORTFOLIO_COLLECTION_ID = 'portfolio_positions';
const SESSION_COLLECTION_ID = 'sessions';

export { DATABASE_ID, CACHE_COLLECTION_ID, PORTFOLIO_COLLECTION_ID, SESSION_COLLECTION_ID };

export interface AppDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: unknown;
}

export async function createDocument(
  collectionId: string,
  data: Record<string, unknown>
): Promise<AppDocument> {
  const { Databases } = await import('appwrite');
  const databases = new Databases(client);
  return await databases.createDocument(DATABASE_ID, collectionId, ID.unique(), data);
}

export async function getDocument(
  collectionId: string,
  documentId: string
): Promise<AppDocument> {
  const { Databases } = await import('appwrite');
  const databases = new Databases(client);
  return await databases.getDocument(DATABASE_ID, collectionId, documentId);
}

export async function updateDocument(
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>
): Promise<AppDocument> {
  const { Databases } = await import('appwrite');
  const databases = new Databases(client);
  return await databases.updateDocument(DATABASE_ID, collectionId, documentId, data);
}

export async function deleteDocument(
  collectionId: string,
  documentId: string
): Promise<void> {
  const { Databases } = await import('appwrite');
  const databases = new Databases(client);
  await databases.deleteDocument(DATABASE_ID, collectionId, documentId);
}

export async function listDocuments(
  collectionId: string,
  queries: string[] = []
): Promise<{ documents: AppDocument[] }> {
  const { Databases, Query } = await import('appwrite');
  const databases = new Databases(client);
  const response = await databases.listDocuments(DATABASE_ID, collectionId, queries);
  return { documents: response.documents as AppDocument[] };
}

export async function findDocument(
  collectionId: string,
  queries: string[]
): Promise<AppDocument | null> {
  try {
    const { Databases, Query } = await import('appwrite');
    const databases = new Databases(client);
    const response = await databases.listDocuments(DATABASE_ID, collectionId, queries);
    return response.documents.length > 0 ? response.documents[0] as AppDocument : null;
  } catch {
    return null;
  }
}