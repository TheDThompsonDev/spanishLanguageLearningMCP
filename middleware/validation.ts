import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    
    if (!error) {
      return next();
    }
    
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    return res.status(400).json({
      error: 'Validation Error',
      validationErrors
    });
  };
};

export const schemas = {
  mcpQuery: Joi.object({
    query: Joi.string().required().min(1).max(1000),
    contextType: Joi.string().valid('vocabulary', 'grammar', 'mixed').default('vocabulary'),
    categories: Joi.array().items(Joi.string()),
    difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced'),
    maxItems: Joi.number().integer().min(1).max(50),
    includeExamples: Joi.boolean()
  }),
  
  contextRequest: Joi.object({
    type: Joi.string().valid('vocabulary', 'grammar', 'mixed').default('vocabulary'),
    categories: Joi.alternatives().try(
      Joi.array().items(Joi.string()),
      Joi.string()
    ),
    difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced'),
    maxItems: Joi.number().integer().min(1).max(50),
    includeExamples: Joi.boolean(),
    searchTerm: Joi.string().min(1).max(100)
  }),
  
  apiKeyRegistration: Joi.object({
    userId: Joi.string().required(),
    name: Joi.string(),
    tier: Joi.string().valid('free', 'basic', 'premium').default('free')
  })
};

