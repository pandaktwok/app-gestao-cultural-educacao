import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'cultural_projects_secret_jwt_key_2026',
  GOOGLE_DRIVE_CREDENTIALS_PATH: process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || path.join(process.cwd(), 'config', 'credentials.json'),
  GOOGLE_DRIVE_PARENT_FOLDER_ID: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '',
};
