import { Client, Databases, ID, Permission, Role } from 'appwrite';
import { PUBLIC_APPWRITE_PROJECT_ID, PUBLIC_APPWRITE_ENDPOINT } from '$env/static/public';

const client = new Client();
client.setEndpoint(PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1');
client.setProject(PUBLIC_APPWRITE_PROJECT_ID || '');

const databases = new Databases(client);

const DATABASE_ID = '6a1312b6002c29b2287c';
const SESSIONS_COLLECTION_ID = 'sessions';
const CACHE_COLLECTION_ID = 'cache';
const PORTFOLIO_COLLECTION_ID = 'portfolio_positions';

interface Attribute {
  key: string;
  type: string;
  required?: boolean;
  size?: number;
}

interface Index {
  key: string;
  type: string;
  attributes: string[];
}

async function createDatabaseIfNotExists() {
  try {
    await databases.get(DATABASE_ID);
    console.log('[Migration] Database aw_terminal already exists');
  } catch (e: any) {
    if (e.code === 404) {
      console.log('[Migration] Creating database aw_terminal...');
      await databases.create(DATABASE_ID, 'AW Terminal');
      console.log('[Migration] Database created!');
    } else {
      throw e;
    }
  }
}

async function createCollectionIfNotExists(collectionId: string, name: string, attributes: Attribute[], indexes: Index[]) {
  try {
    await databases.getCollection(DATABASE_ID, collectionId);
    console.log(`[Migration] Collection ${collectionId} already exists`);
  } catch (e: any) {
    if (e.code === 404) {
      console.log(`[Migration] Creating collection ${collectionId}...`);
      
      // Create collection first
      const collection = await databases.createCollection(
        DATABASE_ID,
        collectionId,
        name
      );
      
      console.log(`[Migration] Collection ${collectionId} created, adding attributes...`);
      
      // Add attributes dynamically
      for (const attr of attributes) {
        try {
          if (attr.type === 'string') {
            await databases.createStringAttribute(DATABASE_ID, collectionId, attr.key, attr.size || 255, attr.required || false);
          } else if (attr.type === 'integer') {
            await databases.createIntegerAttribute(DATABASE_ID, collectionId, attr.key, attr.required || false);
          } else if (attr.type === 'float') {
            await databases.createFloatAttribute(DATABASE_ID, collectionId, attr.key, attr.required || false);
          } else if (attr.type === 'boolean') {
            await databases.createBooleanAttribute(DATABASE_ID, collectionId, attr.key, attr.required || false);
          } else if (attr.type === 'datetime') {
            await databases.createDatetimeAttribute(DATABASE_ID, collectionId, attr.key, attr.required || false);
          }
          console.log(`[Migration]   - Added attribute ${attr.key}`);
        } catch (attrErr) {
          console.log(`[Migration]   - Attribute ${attr.key} may already exist: ${attrErr.message}`);
        }
      }
      
      // Add indexes
      for (const idx of indexes) {
        try {
          await databases.createIndex(DATABASE_ID, collectionId, idx.key, idx.type, idx.attributes);
          console.log(`[Migration]   - Added index ${idx.key}`);
        } catch (idxErr) {
          console.log(`[Migration]   - Index ${idx.key} may already exist: ${idxErr.message}`);
        }
      }
      
      console.log(`[Migration] Collection ${collectionId} setup complete!`);
    } else {
      throw e;
    }
  }
}

export async function runMigrations() {
  console.log('[Migration] Starting database migrations...');
  
  try {
    // Create database
    await createDatabaseIfNotExists();
    
    // Sessions collection
    await createCollectionIfNotExists(
      SESSIONS_COLLECTION_ID,
      'Sessions',
      [
        { key: 'userId', type: 'string', required: true, size: 100 },
        { key: 'token', type: 'string', required: true, size: 200 },
        { key: 'expiresAt', type: 'string', required: true, size: 100 },
        { key: 'email', type: 'string', required: false, size: 255 },
        { key: 'name', type: 'string', required: false, size: 255 },
      ],
      [
        { key: 'token_unique', type: 'unique', attributes: ['token'] },
        { key: 'userId_idx', type: 'key', attributes: ['userId'] },
      ]
    );
    
    // Cache collection
    await createCollectionIfNotExists(
      CACHE_COLLECTION_ID,
      'API Cache',
      [
        { key: 'cacheKey', type: 'string', required: true, size: 255 },
        { key: 'content', type: 'string', required: true, size: 1000000 },
        { key: 'expiresAt', type: 'string', required: true, size: 100 },
      ],
      [
        { key: 'cacheKey_unique', type: 'unique', attributes: ['cacheKey'] },
      ]
    );
    
    // Portfolio positions collection
    await createCollectionIfNotExists(
      PORTFOLIO_COLLECTION_ID,
      'Portfolio Positions',
      [
        { key: 'userId', type: 'string', required: true, size: 100 },
        { key: 'symbol', type: 'string', required: true, size: 50 },
        { key: 'name', type: 'string', required: false, size: 255 },
        { key: 'shares', type: 'string', required: true, size: 100 },
        { key: 'avgPrice', type: 'string', required: true, size: 100 },
      ],
      [
        { key: 'userId_idx', type: 'key', attributes: ['userId'] },
        { key: 'userId_symbol_unique', type: 'unique', attributes: ['userId', 'symbol'] },
      ]
    );
    
    console.log('[Migration] All migrations complete!');
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
}

// Auto-run migrations when this module is imported
runMigrations().catch(console.error);