import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { prisma } from '../prismaClient.js';

/**
 * Configurações gravadas no banco. Valores "secretos" (chaves do Google) são
 * criptografados com AES-256-GCM usando SETTINGS_SECRET (ou JWT_SECRET).
 */
const key = () => crypto.createHash('sha256').update(process.env.SETTINGS_SECRET || ENV.JWT_SECRET).digest();

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `enc:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${enc.toString('base64')}`;
}

function decrypt(value: string): string | null {
  if (!value.startsWith('enc:')) return value;
  try {
    const [, iv, tag, data] = value.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null; // chave mudou: precisa reconfigurar
  }
}

export async function getSetting(k: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: k } });
  return row ? decrypt(row.value) : null;
}

export async function setSetting(k: string, v: string, secret = false): Promise<void> {
  const value = secret ? encrypt(v) : v;
  await prisma.appSetting.upsert({ where: { key: k }, create: { key: k, value }, update: { value } });
}

export async function deleteSettings(keys: string[]): Promise<void> {
  await prisma.appSetting.deleteMany({ where: { key: { in: keys } } });
}
