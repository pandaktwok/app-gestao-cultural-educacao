import { Response } from 'express';
import { prisma } from '../prismaClient.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

const SEVERITIES = ['INFO', 'WARNING', 'URGENT'];

// ADMIN: lista todos os alertas cadastrados
export const listAlerts = async (_req: AuthRequest, res: Response) => {
  try {
    const alerts = await prisma.adminAlert.findMany({
      orderBy: { createdAt: 'desc' },
      include: { teacher: { select: { id: true, name: true } }, acks: { select: { userId: true } } },
    });
    const teachersCount = await prisma.user.count({ where: { role: 'TEACHER', isActive: true } });
    return res.json(
      alerts.map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        severity: a.severity,
        teacherId: a.teacherId,
        teacherName: a.teacher?.name || null,
        dueDate: a.dueDate,
        createdAt: a.createdAt,
        readCount: a.acks.length,
        targetCount: a.teacherId ? 1 : teachersCount,
      }))
    );
  } catch (error) {
    console.error('Error listing alerts:', error);
    return res.status(500).json({ error: 'Erro ao listar alertas' });
  }
};

// ADMIN: cadastra um alerta para um professor (teacherId) ou para todos (sem teacherId)
export const createAlert = async (req: AuthRequest, res: Response) => {
  const { title, message, severity, teacherId, dueDate } = req.body;
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Informe o título do alerta' });
  if (!message || !String(message).trim()) return res.status(400).json({ error: 'Escreva a mensagem do alerta' });

  try {
    if (teacherId) {
      const t = await prisma.user.findUnique({ where: { id: teacherId } });
      if (!t) return res.status(400).json({ error: 'Professor não encontrado' });
    }
    const alert = await prisma.adminAlert.create({
      data: {
        title: String(title).trim(),
        message: String(message).trim(),
        severity: SEVERITIES.includes(severity) ? severity : 'INFO',
        teacherId: teacherId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: req.user!.id,
      },
    });
    return res.status(201).json(alert);
  } catch (error) {
    console.error('Error creating alert:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar alerta' });
  }
};

export const deleteAlert = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.adminAlert.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Alerta excluído' });
  } catch (error) {
    return res.status(404).json({ error: 'Alerta não encontrado' });
  }
};

// PROFESSOR: alertas para ele (ou para todos) que ainda não foram marcados como lidos
export const myAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const alerts = await prisma.adminAlert.findMany({
      where: {
        OR: [{ teacherId: null }, { teacherId: req.user!.id }],
        acks: { none: { userId: req.user!.id } },
        AND: [{ OR: [{ dueDate: null }, { dueDate: { gte: new Date(now.getTime() - 24 * 3600 * 1000) } }] }],
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, message: true, severity: true, dueDate: true, createdAt: true },
    });
    return res.json(alerts);
  } catch (error) {
    console.error('Error fetching my alerts:', error);
    return res.status(500).json({ error: 'Erro ao buscar alertas' });
  }
};

export const ackAlert = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.alertAck.upsert({
      where: { alertId_userId: { alertId: req.params.id, userId: req.user!.id } },
      update: {},
      create: { alertId: req.params.id, userId: req.user!.id },
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(404).json({ error: 'Alerta não encontrado' });
  }
};
