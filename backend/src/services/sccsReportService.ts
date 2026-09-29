import { spawn } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { ENV } from '../config/env.js';
import { buildSccsSpec, SccsReportPayload } from './sccsSpec.js';

/**
 * Gera o relatório mensal no padrão da skill `sccs-relatorio` (pasta backend/sccs-docs),
 * chamando o gerador Python (Playwright/Chromium) com o JSON montado a partir dos dados do app.
 */

const LOGOS_DIR = path.join(ENV.SCCS_DOCS_DIR, 'sccs-base', 'assets', 'logos');
const BUILDER = path.join(ENV.SCCS_DOCS_DIR, 'sccs-relatorio', 'build_relatorio.py');
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const TIMEOUT_MS = 120_000;
const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class SccsReportError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

export const SCCS_LOGOS_DIR = LOGOS_DIR;

export async function listLogos() {
  const raw = await fs.readFile(path.join(LOGOS_DIR, 'registro.json'), 'utf-8');
  return (JSON.parse(raw) as any[]).map((l) => ({
    id: l.id as string,
    nome: l.nome as string,
    tipo: l.tipo as string,
    nivel: (l.nivel ?? null) as string | null,
    qualidade: l.qualidade as string,
    nota: (l.nota ?? '') as string,
    url: `/sccs-logos/${l.tipo}/${l.arquivo}`,
  }));
}

// No máximo 2 relatórios sendo gerados ao mesmo tempo (o Chromium é pesado).
let running = 0;
const waiting: (() => void)[] = [];
async function acquire() {
  if (running >= 2) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
}
function release() {
  running--;
  waiting.shift()?.();
}

/** Grava a foto em disco. Só aceita data URL (imagem em base64) ou arquivo dentro de ./uploads. */
async function materializePhoto(url: string, dir: string, index: number): Promise<string | null> {
  try {
    const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/is.exec(url);
    if (m) {
      const ext = IMAGE_EXT[m[1].toLowerCase()];
      if (!ext) return null;
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length === 0 || buf.length > MAX_PHOTO_BYTES) return null;
      const name = `fotos/${index}.${ext}`;
      await fs.writeFile(path.join(dir, name), buf);
      return name;
    }
    if (url.startsWith('/uploads/')) {
      const uploads = path.resolve(process.cwd(), 'uploads');
      const file = path.resolve(uploads, '.' + url.slice('/uploads'.length));
      if (!file.startsWith(uploads + path.sep)) return null; // bloqueia ../
      const ext = path.extname(file).toLowerCase().replace('.', '');
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return null;
      const name = `fotos/${index}.${ext}`;
      await fs.copyFile(file, path.join(dir, name));
      return name;
    }
  } catch {
    /* foto ilegível: fica de fora e é reportada em `skippedPhotos` */
  }
  return null;
}

function runBuilder(specPath: string, outPdf: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ENV.PYTHON_BIN, [BUILDER, specPath, outPdf], { cwd: ENV.SCCS_DOCS_DIR });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new SccsReportError('Tempo esgotado ao gerar o PDF.', 504));
    }, TIMEOUT_MS);
    child.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(
        new SccsReportError(
          err.code === 'ENOENT'
            ? `Python não encontrado ("${ENV.PYTHON_BIN}"). Instale o Python 3 e depois rode: pip install playwright pillow  e  python -m playwright install chromium`
            : `Falha ao iniciar o gerador: ${err.message}`,
          503
        )
      );
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else {
        const tail = stderr.trim().split('\n').slice(-6).join(' | ');
        const missing = /No module named|Executable doesn't exist|playwright install/i.test(stderr);
        reject(
          new SccsReportError(
            missing
              ? 'Faltam componentes do gerador de PDF neste computador. Rode: pip install playwright pillow  e  python -m playwright install chromium'
              : `O gerador do PDF falhou (código ${code}): ${tail}`,
            500
          )
        );
      }
    });
  });
}

export async function generateSccsReport(payload: SccsReportPayload): Promise<{ pdf: Buffer; skippedPhotos: number }> {
  // Só aceita logos que existem no cadastro da skill.
  const known = new Set((await listLogos()).map((l) => l.id));
  const wanted = [...payload.logos.projeto, ...payload.logos.apoiadores, ...payload.logos.publicos, ...payload.logos.patrocinadores];
  const unknown = wanted.filter((id) => !known.has(id));
  if (unknown.length) throw new SccsReportError(`Logo(s) fora do cadastro: ${unknown.join(', ')}`, 400);

  await acquire();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sccs-rel-'));
  try {
    await fs.mkdir(path.join(dir, 'fotos'));
    const files = await Promise.all(payload.photos.map((p, i) => materializePhoto(p.url, dir, i)));
    const spec = buildSccsSpec(payload, files);
    const specPath = path.join(dir, 'spec.json');
    const outPdf = path.join(dir, 'relatorio.pdf');
    await fs.writeFile(specPath, JSON.stringify(spec), 'utf-8');
    await runBuilder(specPath, outPdf);
    return { pdf: await fs.readFile(outPdf), skippedPhotos: files.filter((f) => !f).length };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    release();
  }
}

/** Gera um PDF oficial a partir de um spec já montado (relatórios gerais da rede). */
export async function generateSpecPdf(spec: any): Promise<Buffer> {
  await acquire();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sccs-rede-'));
  try {
    const specPath = path.join(dir, 'spec.json');
    const outPdf = path.join(dir, 'relatorio.pdf');
    await fs.writeFile(specPath, JSON.stringify(spec), 'utf-8');
    await runBuilder(specPath, outPdf);
    return await fs.readFile(outPdf);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    release();
  }
}

/** Confere na inicialização se o gerador de PDF oficial tem tudo o que precisa e avisa no console. */
export async function checkSccsEnvironment(): Promise<boolean> {
  return new Promise((resolve) => {
    const code = 'import playwright, PIL, sys; from playwright.sync_api import sync_playwright\nwith sync_playwright() as p:\n    import os; sys.exit(0 if os.path.exists(p.chromium.executable_path) else 3)';
    const child = spawn(ENV.PYTHON_BIN, ['-c', code], { cwd: ENV.SCCS_DOCS_DIR });
    let err = '';
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('error', () => {
      console.warn(`⚠️  Python ("${ENV.PYTHON_BIN}") não encontrado: o PDF oficial do relatório NÃO será gerado. Instale o Python 3.`);
      resolve(false);
    });
    child.on('close', (c) => {
      if (c === 0) {
        console.log('✅ Gerador de PDF oficial (SCCS) pronto.');
        resolve(true);
      } else {
        console.warn('⚠️  Gerador de PDF oficial incompleto. Rode: pip install playwright pillow  e  python -m playwright install chromium');
        resolve(false);
      }
    });
  });
}
