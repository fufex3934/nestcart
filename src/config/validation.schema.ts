import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // MongoDB
  MONGODB_URI: Joi.string().required(),
  MONGODB_DB_NAME: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required().min(32),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  REFRESH_TOKEN_SECRET: Joi.string().required().min(32),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('30d'),

  // Rate Limiting
  THROTTLE_TTL: Joi.number().default(60), // Time to live in seconds
  THROTTLE_LIMIT: Joi.number().default(10), // Max number of requests within the TTL
});
