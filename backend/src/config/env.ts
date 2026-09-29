import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (isProduction) {
    throw new Error(
      'JWT_SECRET não definido (mínimo 32 caracteres). Defina a variável de ambiente antes de iniciar em produção.'
    );
  }

  // Desenvolvimento: segredo efêmero (sessões são invalidadas a cada reinício).
  console.warn('⚠️  JWT_SECRET ausente ou curto — usando segredo temporário de desenvolvimento.');
  return crypto.randomBytes(48).toString('hex');
}

export const ENV = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: isProduction,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: resolveJwtSecret(),
  INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD || '',
  // Gerador de relatórios no padrão SCCS (skill em backend/sccs-docs, executada com Python + Playwright)
  SCCS_DOCS_DIR: process.env.SCCS_DOCS_DIR || path.join(process.cwd(), 'sccs-docs'),
  PYTHON_BIN: process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3'),
  GOOGLE_DRIVE_CREDENTIALS_PATH: process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || path.join(process.cwd(), 'config', 'credentials.json'),
  GOOGLE_DRIVE_PARENT_FOLDER_ID: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '',
};
