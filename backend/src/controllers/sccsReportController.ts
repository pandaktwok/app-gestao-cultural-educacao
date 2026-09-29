import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { generateSccsReport, listLogos, SccsReportError } from '../services/sccsReportService.js';
import { FIXED_LOGOS } from '../services/sccsSpec.js';

const str = (max = 5000) => z.string().max(max);
const idList = z.array(z.string().regex(/^[a-z0-9-]+$/)).max(8);
const rate = z.number().nullable();

const payloadSchema = z.object({
  monthLabel: str(60),
  schoolName: str(200),
  directorName: str(200),
  instructorName: str(200),
  locationCityDate: str(200),
  nominataColumns: z.union([z.literal(2), z.literal(3)]),
  texts: z.object({
    activitiesFocus: str(),
    impactIndicators: str(),
    monitoringEvaluation: str(),
    hasDifficulties: z.boolean(),
    difficultiesDetails: str(),
    achievedResults: str(),
  }),
  stats: z.object({
    totalStudents: z.number(),
    boys: z.number(),
    girls: z.number(),
    totalPresences: z.number(),
    totalAbsences: z.number(),
    averageRate: rate,
    audience: z.object({ children: z.number(), teens: z.number(), others: z.number() }),
  }),
  encounters: z
    .array(z.object({ dateShort: str(20), dateFull: str(20), category: str(60), present: z.number(), absent: z.number(), rate }))
    .max(60),
  students: z
    .array(
      z.object({
        name: str(200),
        age: z.number(),
        sex: str(2),
        marks: z.array(z.enum(['P', 'F', '-'])).max(60),
        present: z.number(),
        absent: z.number(),
        rate,
      })
    )
    .max(600),
  events: z.array(z.object({ name: str(200), dateFull: str(20), publicCount: z.number() })).max(40),
  photos: z.array(z.object({ url: z.string().max(25_000_000), group: str(200), title: str(300), when: str(80) })).max(60),
});

export const getSccsLogos = async (_req: AuthRequest, res: Response) => {
  try {
    return res.json(await listLogos());
  } catch (err) {
    console.error('Erro ao listar logos SCCS:', err);
    return res.status(500).json({ error: 'Não foi possível ler o cadastro de logos.' });
  }
};

export const generateSccsReportPdf = async (req: AuthRequest, res: Response) => {
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados do relatório inválidos.', details: parsed.error.issues.slice(0, 5) });
  }
  try {
    // As logomarcas são sempre as do padrão; qualquer valor enviado pelo aplicativo é ignorado.
    const { pdf, skippedPhotos } = await generateSccsReport({ ...parsed.data, logos: FIXED_LOGOS });
    const safe = parsed.data.schoolName.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60) || 'Escola';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Relatorio_${safe}.pdf"`);
    res.setHeader('X-Skipped-Photos', String(skippedPhotos));
    res.setHeader('Access-Control-Expose-Headers', 'X-Skipped-Photos, Content-Disposition');
    return res.send(pdf);
  } catch (err) {
    if (err instanceof SccsReportError) return res.status(err.status).json({ error: err.message });
    console.error('Erro ao gerar relatório SCCS:', err);
    return res.status(500).json({ error: 'Erro inesperado ao gerar o PDF.' });
  }
};
