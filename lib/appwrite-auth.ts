import { Client, Account, ID, Models, Teams, Databases, Query } from 'appwrite';
import { initAppwrite } from './appwrite.js';
import { DATABASE_ID } from './appwrite.js';

const USER_TIERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USER_TIERS_COLLECTION_ID || 'user_tiers';

export type UserTier = 'free' | 'basic' | 'premium';

export interface UserTierModel extends Models.Document {
  userId: string;
  tier: UserTier;
  updatedAt: number;
}

export interface AuthenticatedUser {
  id: string;
  name?: string;
  email?: string;
  tier: UserTier;
}

let account: Account;
let teams: Teams;
let databases: Databases;

export const initAppwriteAuth = () => {
  const { client, databases: db } = initAppwrite();
  
  if (!client) {
    console.warn('Appwrite client initialization failed');
    return { account: null, teams: null, databases: null };
  }
  
  if (!account) {
    account = new Account(client);
  }
  
  if (!teams) {
    teams = new Teams(client);
  }
  
  databases = db;
  
  return { account, teams, databases };
};

export const createUser = async (
  email: string, 
  password: string, 
  name?: string, 
  tier: UserTier = 'free'
): Promise<AuthenticatedUser | null> => {
  try {
    const { account, databases } = initAppwriteAuth();
    
    if (!account || !databases) {
      throw new Error('Appwrite auth not initialized');
    }
    
    const user = await account.create(
      ID.unique(),
      email,
      password,
      name
    );
    
    await setUserTier(user.$id, tier);
    
    return {
      id: user.$id,
      name: user.name,
      email: user.email,
      tier
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

export const setUserTier = async (userId: string, tier: UserTier): Promise<boolean> => {
  try {
    const { databases } = initAppwriteAuth();
    
    if (!databases || !DATABASE_ID || !USER_TIERS_COLLECTION_ID) {
      throw new Error('Appwrite databases or collection ID not configured');
    }
    
    const existingTiers = await databases.listDocuments(
      DATABASE_ID,
      USER_TIERS_COLLECTION_ID,
      [Query.equal('userId', userId)]
    );
    
    if (existingTiers.documents.length > 0) {
      const tierDoc = existingTiers.documents[0];
      await databases.updateDocument(
        DATABASE_ID,
        USER_TIERS_COLLECTION_ID,
        tierDoc.$id,
        {
          tier,
          updatedAt: Date.now()
        }
      );
    } else {
      await databases.createDocument(
        DATABASE_ID,
        USER_TIERS_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          tier,
          updatedAt: Date.now()
        }
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error setting user tier:', error);
    return false;
  }
};

export const getUserTier = async (userId: string): Promise<UserTier> => {
  try {
    const { databases } = initAppwriteAuth();
    
    if (!databases || !DATABASE_ID || !USER_TIERS_COLLECTION_ID) {
      throw new Error('Appwrite databases or collection ID not configured');
    }
    
    const tierDocs = await databases.listDocuments(
      DATABASE_ID,
      USER_TIERS_COLLECTION_ID,
      [Query.equal('userId', userId)]
    );
    
    if (tierDocs.documents.length > 0) {
      return (tierDocs.documents[0] as UserTierModel).tier;
    }
    
    return 'free';
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 'free';
  }
};

export const getCurrentUser = async (): Promise<AuthenticatedUser | null> => {
  try {
    const { account } = initAppwriteAuth();
    
    if (!account) {
      throw new Error('Appwrite account not initialized');
    }
    
    const user = await account.get();
    const tier = await getUserTier(user.$id);
    
    return {
      id: user.$id,
      name: user.name,
      email: user.email,
      tier
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const login = async (email: string, password: string): Promise<AuthenticatedUser | null> => {
  try {
    const { account } = initAppwriteAuth();
    
    if (!account) {
      throw new Error('Appwrite account not initialized');
    }
    
    await account.createSession(email, password);
    return getCurrentUser();
  } catch (error) {
    console.error('Error logging in:', error);
    return null;
  }
};

export const logout = async (): Promise<boolean> => {
  try {
    const { account } = initAppwriteAuth();
    
    if (!account) {
      throw new Error('Appwrite account not initialized');
    }
    
    await account.deleteSession('current');
    return true;
  } catch (error) {
    console.error('Error logging out:', error);
    return false;
  }
};

export const hasAccess = async (userId: string, requiredTier: 'basic' | 'premium'): Promise<boolean> => {
  const userTier = await getUserTier(userId);
  const tierValues = { free: 0, basic: 1, premium: 2 };
  
  return tierValues[userTier] >= tierValues[requiredTier];
};

export const ensureUserTiersCollection = async (): Promise<void> => {
  try {
    const { databases } = initAppwriteAuth();
    
    if (!databases || !DATABASE_ID) {
      throw new Error('Appwrite databases not initialized');
    }
    
    if (!USER_TIERS_COLLECTION_ID) {
      console.warn('User tiers collection ID not configured');
      return;
    }
    
    try {
      await databases.listDocuments(
        DATABASE_ID,
        USER_TIERS_COLLECTION_ID,
        [Query.limit(1)]
      );
      console.log('User tiers collection exists');
    } catch (error) {
      console.warn('User tiers collection does not exist or is not accessible');
      console.log('Please create a collection with the following attributes:');
      console.log('- userId (string, required)');
      console.log('- tier (enum["free", "basic", "premium"], required)');
      console.log('- updatedAt (integer, required)');
      console.log('And create an index on userId for faster queries');
    }
  } catch (error) {
    console.error('Error checking user tiers collection:', error);
  }
};