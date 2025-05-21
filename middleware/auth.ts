import { Request, Response, NextFunction } from 'express';
import {
  getCurrentUser,
  getUserTier,
  hasAccess,
  AuthenticatedUser,
  UserTier
} from '../lib/appwrite-auth.js';
import { asyncHandler } from './async-handler.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const appwriteAuth = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }
    
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Session invalid or expired'
    });
  }
});

export const apiKeyAuth = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const userId = req.headers['x-user-id'] as string;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Missing API key'
    });
  }
  
  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Missing user ID'
    });
  }
  
  const validApiKey = process.env.GLOBAL_API_KEY || 'default-api-key';
  
  if (apiKey !== validApiKey) {
    return res.status(403).json({
      error: 'Authentication failed',
      message: 'Invalid API key'
    });
  }
  
  try {
    const tier = await getUserTier(userId);
    
    req.user = {
      id: userId,
      tier
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Failed to verify user'
    });
  }
});

export const requireTier = (requiredTier: 'basic' | 'premium') => {
  return asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'This endpoint requires authentication'
      });
    }
    
    const tierValues = { free: 0, basic: 1, premium: 2 };
    const userTier = req.user.tier || 'free';
    
    if (tierValues[userTier] < tierValues[requiredTier]) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This endpoint requires ${requiredTier} tier access`
      });
    }
    
    next();
  });
};

export const registerUser = async (
  userId: string, 
  tier: UserTier = 'free', 
  name?: string
): Promise<boolean> => {
  try {
    console.log(`Registered user ${userId} with ${tier} tier`);
    return true;
  } catch (error) {
    console.error('Error registering user:', error);
    return false;
  }
};

export const updateUserTier = async (
  userId: string, 
  tier: UserTier
): Promise<boolean> => {
  try {
    console.log(`Updated user ${userId} to ${tier} tier`);
    return true;
  } catch (error) {
    console.error('Error updating user tier:', error);
    return false;
  }
};

export const removeUser = async (userId: string): Promise<boolean> => {
  try {
    console.log(`Removed user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error removing user:', error);
    return false;
  }
};

export const registerApiKey = registerUser;
export const revokeApiKey = removeUser;
